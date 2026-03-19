# Phase 3: Planning Workflow - Research

**Researched:** 2026-03-19
**Domain:** Interactive observation planning (PA control, URL state, DS9 export)
**Confidence:** HIGH

## Summary

Phase 3 adds three features that transform RomanView from a static visualization into a collaborative planning tool: (1) an interactive PA slider constrained by the Sun-roll geometry, (2) shareable URLs that encode the complete observation state, and (3) DS9 region file export for detector footprints. All three build cleanly on the existing codebase -- the WCS engine, SIAF data, and `positionAngle()` function already handle the hard coordinate math. The main new work is computing the Sun-constrained roll range, wiring URL state, and generating DS9 `.reg` file text.

The existing `positionAngle()` function in `coordinates.ts` already computes the nominal V3PA (bearing from target toward Sun), which is the spacecraft's preferred orientation. Roman allows +/-15 degrees of roll around this nominal PA. The PA slider's range is therefore `[nominalV3PA - 15, nominalV3PA + 15]` degrees. Both WFIFootprint and FocalPlaneView already accept an arbitrary V3PA and render correctly -- the slider simply overrides the auto-computed value.

**Primary recommendation:** Keep URL state minimal (target RA/Dec, PA override, date) using the native `URLSearchParams` API with `hashchange` events -- no router library needed for this SPA. Use the existing `v2v3ToSky()` + `gnomonicInverse()` pipeline to generate DS9 polygon vertices.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLAN-01 | Interactive PA slider shows Sun-constrained +/-15 deg roll range for selected target and date, with footprint rotating in real-time | Nominal V3PA already computed by `positionAngle()`. Roll range is +/-15 deg per Roman observatory docs. WFIFootprint/FocalPlaneView already accept arbitrary V3PA and re-render. Slider just needs to override the auto-computed value. |
| PLAN-02 | Observation state (target, PA, date, filter) encoded in shareable URL -- collaborators see identical view | URLSearchParams API is sufficient. No router library needed. State keys: `ra`, `dec`, `name`, `pa`, `date`. On load, parse URL and hydrate `useTargets`/`useEphemeris`/PA state. |
| PLAN-03 | Export WFI footprint as DS9 region file (.reg) with FK5 polygon regions for each SCA | `v2v3ToSky()` already projects SIAF corners to sky RA/Dec. DS9 format is simple text: `fk5; polygon(ra1,dec1,ra2,dec2,...) # text={WFI01}`. Generate string, create Blob, trigger download. |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.4 | UI framework | Already in project |
| astronomy-engine | ^2.1.19 | Sun position computation | Already used for `getSunPosition()`, provides `EclipticLongitude`, `Equator` |
| lucide-react | ^0.577.0 | Icons | Already in project (Download, Link, Copy icons needed) |

### Supporting (no new dependencies needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| URLSearchParams | Web API | URL state encoding/decoding | Built into all browsers, no library needed |
| Blob + URL.createObjectURL | Web API | File download generation | For DS9 .reg file export |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native URLSearchParams | nuqs (type-safe URL state) | nuqs adds 8KB+ and requires adapter setup; this app has ~5 URL params, hand-rolled is simpler |
| Native URLSearchParams | react-router | Massive dependency for a single-page app with no real routing; URL hash is sufficient |
| Hand-built .reg string | astropy-regions (Python) | This is a JS app; the DS9 format is trivial text -- 10 lines of code |

**Installation:**
```bash
# No new packages needed -- all functionality uses existing deps + Web APIs
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    rollRange.ts         # NEW: Compute nominal V3PA and +/-15 deg roll range
    ds9Export.ts          # NEW: Generate DS9 region file text from SIAF + WCS
    urlState.ts           # NEW: Encode/decode observation state to/from URL hash
  hooks/
    useObservationState.ts  # NEW: Central state hook that wires PA, URL sync, etc.
  components/
    ui/
      PASlider.tsx        # NEW: Interactive PA slider with roll range visualization
      ShareButton.tsx     # NEW: Copy URL to clipboard button
      ExportButton.tsx    # NEW: DS9 region file export button
```

### Pattern 1: PA State Lifting
**What:** Currently V3PA is computed inside WFIFootprint and FocalPlaneView independently via `positionAngle()`. For Phase 3, PA must be lifted to App level so the slider can override it and both views stay in sync.
**When to use:** When a value computed deep in a component tree needs to become user-controllable.
**Example:**
```typescript
// In App.tsx or a new useObservationState hook:
// 1. Compute nominal V3PA from target + Sun position
const nominalV3PA = positionAngle(target.ra, target.dec, sun.ra, sun.dec);
// 2. User can override with slider
const [paOverride, setPAOverride] = useState<number | null>(null);
// 3. Effective PA used everywhere
const effectiveV3PA = paOverride ?? nominalV3PA;
// 4. Pass effectiveV3PA to WFIFootprint, FocalPlaneView, DS9 export
```

### Pattern 2: URL State Sync (hash-based)
**What:** Encode observation state in URL hash so links are shareable without a backend. Use `hashchange` event listener to hydrate state on load and respond to browser back/forward.
**When to use:** When app state must survive page reload and be shareable via copy-paste URL.
**Example:**
```typescript
// urlState.ts
export interface ObservationParams {
  ra?: number;
  dec?: number;
  name?: string;
  pa?: number;      // PA override (null = auto from Sun)
  date?: string;     // ISO date string
}

export function encodeToHash(params: ObservationParams): string {
  const sp = new URLSearchParams();
  if (params.ra !== undefined) sp.set('ra', params.ra.toFixed(5));
  if (params.dec !== undefined) sp.set('dec', params.dec.toFixed(5));
  if (params.name) sp.set('name', params.name);
  if (params.pa !== undefined) sp.set('pa', params.pa.toFixed(1));
  if (params.date) sp.set('date', params.date);
  return '#' + sp.toString();
}

export function decodeFromHash(hash: string): ObservationParams {
  const sp = new URLSearchParams(hash.replace(/^#/, ''));
  return {
    ra: sp.has('ra') ? parseFloat(sp.get('ra')!) : undefined,
    dec: sp.has('dec') ? parseFloat(sp.get('dec')!) : undefined,
    name: sp.get('name') ?? undefined,
    pa: sp.has('pa') ? parseFloat(sp.get('pa')!) : undefined,
    date: sp.get('date') ?? undefined,
  };
}
```

### Pattern 3: DS9 Region File Generation
**What:** Generate DS9 .reg text by iterating SIAF corners, projecting each to sky RA/Dec via the existing `v2v3ToSky()`, and formatting as FK5 polygon strings.
**When to use:** For the Export DS9 Regions button.
**Example:**
```typescript
// ds9Export.ts
import { WFI_DETECTORS, WFI_BORESIGHT } from './roman';
import { v2v3ToSky } from './wcs';

export function generateDS9Regions(
  targetRa: number, targetDec: number, v3pa: number
): string {
  const lines: string[] = [
    '# Region file format: DS9 version 4.1',
    'global color=cyan dashlist=8 3 width=1 font="helvetica 10 normal roman" select=1 highlite=1 dash=0 fixed=0 edit=1 move=1 delete=1 include=1 source=1',
    'fk5',
  ];

  for (const det of WFI_DETECTORS) {
    const skyCorners = det.corners_v2v3.map(([v2, v3]) =>
      v2v3ToSky(v2, v3, WFI_BORESIGHT.v2, WFI_BORESIGHT.v3, targetRa, targetDec, v3pa)
    );
    const coordPairs = skyCorners
      .map(({ ra, dec }) => `${ra.toFixed(7)},${dec.toFixed(7)}`)
      .join(',');
    lines.push(`polygon(${coordPairs}) # text={${det.id}} color=cyan`);
  }

  return lines.join('\n') + '\n';
}
```

### Anti-Patterns to Avoid
- **Computing V3PA in every component independently:** Phase 1-2 had WFIFootprint and FocalPlaneView each calling `positionAngle()`. Phase 3 must lift this to a single source of truth so the slider works.
- **Using query parameters (?key=value) instead of hash (#key=value):** Query params cause page reloads in static hosting without server-side routing. Hash changes are client-side only.
- **Generating DS9 coordinates in image/pixel space:** DS9 polygon regions must use FK5 sky coordinates (degrees), not pixel coordinates. The existing `v2v3ToSky()` handles this correctly.
- **Adding react-router for URL state:** This is a single-page app with no real pages. Adding a router framework is unnecessary complexity.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sun position at date | Custom orbital mechanics | `astronomy-engine` `getSunPosition()` (already used) | Orbital mechanics is hard; library is accurate to 1 arcmin |
| V2V3 to sky projection | Custom coordinate math | `v2v3ToSky()` from `wcs.ts` (already built) | Phase 1 already built and tested this |
| Clipboard copy | Custom clipboard API | `navigator.clipboard.writeText()` | Standard Web API, handles permissions automatically |
| File download | Server-side download endpoint | `Blob` + `URL.createObjectURL()` + `<a download>` | Client-side only, no server needed |
| Date formatting/parsing | Custom date parser | `Date.toISOString().split('T')[0]` | Already used in codebase (EpochSlider) |

**Key insight:** The hard coordinate math (WCS, SIAF, projections) was already built in Phases 1-2. Phase 3 primarily wires existing computation to new UI controls and output formats.

## Common Pitfalls

### Pitfall 1: PA Wrap-Around at 0/360 Degrees
**What goes wrong:** The PA slider range might span across the 0/360 boundary (e.g., nominal PA = 355 deg, range = 340-370 deg). Naive min/max slider breaks.
**Why it happens:** Position angles are circular (0 = 360).
**How to avoid:** Normalize the slider to work in offset-from-nominal space: slider value is `[-15, +15]`, displayed PA is `(nominal + offset) % 360`. This avoids all wrap-around issues.
**Warning signs:** Slider "jumps" or can't reach certain values; footprint snaps to wrong orientation.

### Pitfall 2: URL Hash Encoding Special Characters
**What goes wrong:** Target names with spaces or special characters (e.g., "NGC 1234", "alpha Cen") break URL parsing.
**Why it happens:** Spaces and special chars must be percent-encoded in URLs.
**How to avoid:** `URLSearchParams` handles encoding/decoding automatically. Always use `sp.set()` and `sp.get()`, never manual string concatenation.
**Warning signs:** Decoded target name has `%20` instead of spaces, or URL breaks on paste.

### Pitfall 3: Infinite State Sync Loop (URL <-> React state)
**What goes wrong:** URL change triggers state update, which triggers URL update, which triggers state update...
**Why it happens:** Bidirectional sync between URL and React state without a guard.
**How to avoid:** Use a `skipNextHashUpdate` ref flag: when React state changes, set flag before updating hash. When hashchange fires, check flag and skip if set. Or use `replaceState` instead of direct hash assignment to avoid triggering `hashchange`.
**Warning signs:** Browser hangs, rapid hash flickering in URL bar.

### Pitfall 4: DS9 Polygon Winding Order
**What goes wrong:** DS9 renders polygons but they look "inside out" or crossed.
**Why it happens:** SIAF corners may not be in consistent clockwise/counter-clockwise order.
**How to avoid:** The existing `corners_v2v3` in the SIAF data are already in consistent order (verified in Phase 1 tests). Project them in the same order and DS9 will render correctly. Verify with a known target.
**Warning signs:** Polygon edges cross each other in DS9; fill covers wrong area.

### Pitfall 5: Stale URL on First Load
**What goes wrong:** User opens a shared URL but the state doesn't hydrate because React renders before reading the hash.
**Why it happens:** `useState` initializers run before effects. If hash parsing is in a `useEffect`, the first render shows default state.
**How to avoid:** Parse the URL hash in the `useState` initializer (lazy init), not in a useEffect. This ensures the very first render has the correct state.
**Warning signs:** Brief flash of default view before snapping to shared state; shared URL shows M31 briefly before switching to the shared target.

## Code Examples

Verified patterns from the existing codebase and official sources:

### Computing Nominal V3PA (already exists)
```typescript
// Source: src/lib/coordinates.ts - positionAngle()
// This computes the bearing from target toward Sun, which IS the V3PA.
// Roman's +V3 axis points toward the Sun.
const v3pa = positionAngle(targetRa, targetDec, sunRa, sunDec);
// Roll range: v3pa +/- 15 degrees
const minPA = v3pa - 15;
const maxPA = v3pa + 15;
```

### Computing Roll Range
```typescript
// Source: Roman observatory docs (roman.gsfc.nasa.gov/science/observatory_technical.html)
// Roman allows +/-15 degrees roll around the nominal (max-power) orientation.
// The nominal V3PA is the bearing from target to Sun.

export function computeRollRange(
  targetRa: number, targetDec: number, sunRa: number, sunDec: number
): { nominal: number; min: number; max: number } | null {
  // Check observability first (Sun separation must be 54-126 degrees)
  const sunSep = angularSeparation(targetRa, targetDec, sunRa, sunDec);
  if (sunSep < 54 || sunSep > 126) return null; // Not observable

  const nominal = positionAngle(targetRa, targetDec, sunRa, sunDec);
  return {
    nominal,
    min: nominal - 15,
    max: nominal + 15,
  };
}
```

### DS9 Region File Format
```
# Region file format: DS9 version 4.1
global color=cyan dashlist=8 3 width=1 font="helvetica 10 normal roman" select=1 highlite=1 dash=0 fixed=0 edit=1 move=1 delete=1 include=1 source=1
fk5
polygon(10.6847000,41.2687000,10.7200000,41.3100000,10.6500000,41.3100000,10.6200000,41.2687000) # text={WFI01} color=cyan
polygon(...) # text={WFI02} color=cyan
...
```
Source: [DS9 Region Documentation](https://ds9.si.edu/doc/ref/region.html)

### File Download via Blob
```typescript
// Standard Web API pattern for client-side file download
function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### URL Hash State Initialization
```typescript
// Pattern: lazy useState initializer reads hash on first render
const [target, setTarget] = useState<Target | null>(() => {
  const params = decodeFromHash(window.location.hash);
  if (params.ra !== undefined && params.dec !== undefined) {
    return {
      id: 'url-target',
      name: params.name ?? `(${params.ra.toFixed(2)}, ${params.dec.toFixed(2)})`,
      ra: params.ra,
      dec: params.dec,
      addedAt: Date.now(),
    };
  }
  return null;
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side URL routing for SPA state | Client-side hash/query params | Standard since ~2015 | No server needed; static hosting works |
| Custom coordinate projection for DS9 | Reuse existing WCS engine | Phase 1 built this | Zero new math needed |
| Fixed PA from Sun position | User-controllable PA within roll constraints | Phase 3 adds this | Enables observation planning workflow |

**Deprecated/outdated:**
- `window.location.hash = '...'` direct assignment can trigger double renders. Use `history.replaceState(null, '', '#...')` for silent URL updates.

## Open Questions

1. **Anti-Sun constraint interaction with roll range**
   - What we know: Roman has a 36-degree anti-Sun exclusion zone. The roll range is +/-15 degrees.
   - What's unclear: Whether the roll range narrows near the anti-Sun boundary (unlikely for RomanView's level of accuracy).
   - Recommendation: Use the simple +/-15 degree model. The `checkObservability()` function already handles the anti-Sun constraint separately. Flag as approximate in UI ("Roll range is approximate; check APT for precise scheduling").

2. **Focal Plane PA vs V3PA display convention**
   - What we know: The codebase uses `APA = V3PA - FPA_ROTATION_DEG = V3PA + 60` for display. The PA slider should control V3PA (the physical spacecraft roll).
   - What's unclear: Whether astronomers expect the slider to show V3PA or APA.
   - Recommendation: Slider controls V3PA internally but display both values. Label slider as "V3PA" with APA shown as derived value. This matches APT convention.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest --run` |
| Full suite command | `npx vitest --run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAN-01 | Roll range computation returns nominal +/-15 deg | unit | `npx vitest --run src/lib/__tests__/rollRange.test.ts -t "roll range"` | No -- Wave 0 |
| PLAN-01 | Roll range returns null for unobservable targets | unit | `npx vitest --run src/lib/__tests__/rollRange.test.ts -t "unobservable"` | No -- Wave 0 |
| PLAN-02 | URL encode/decode round-trips observation params | unit | `npx vitest --run src/lib/__tests__/urlState.test.ts -t "round-trip"` | No -- Wave 0 |
| PLAN-02 | Handles special characters in target name | unit | `npx vitest --run src/lib/__tests__/urlState.test.ts -t "special"` | No -- Wave 0 |
| PLAN-03 | DS9 export generates valid FK5 polygon regions for all 18 SCAs | unit | `npx vitest --run src/lib/__tests__/ds9Export.test.ts -t "18 SCAs"` | No -- Wave 0 |
| PLAN-03 | DS9 header matches DS9 version 4.1 format | unit | `npx vitest --run src/lib/__tests__/ds9Export.test.ts -t "header"` | No -- Wave 0 |
| PLAN-03 | Each polygon has exactly 4 coordinate pairs (8 numbers) | unit | `npx vitest --run src/lib/__tests__/ds9Export.test.ts -t "4 corners"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest --run`
- **Per wave merge:** `npx vitest --run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/rollRange.test.ts` -- covers PLAN-01 (roll range computation)
- [ ] `src/lib/__tests__/urlState.test.ts` -- covers PLAN-02 (URL encode/decode)
- [ ] `src/lib/__tests__/ds9Export.test.ts` -- covers PLAN-03 (DS9 region file generation)

## Sources

### Primary (HIGH confidence)
- **Roman Observatory Technical** - [roman.gsfc.nasa.gov/science/observatory_technical.html](https://roman.gsfc.nasa.gov/science/observatory_technical.html) - Roll angle +/-15 degrees, pitch 54-126 degrees
- **Roman WFI Quick Reference** - [roman-docs.stsci.edu](https://roman-docs.stsci.edu/roman-instruments/the-wide-field-instrument/observing-with-the-wfi/wfi-quick-reference) - Observing constraints, field of regard
- **DS9 Region Format** - [ds9.si.edu/doc/ref/region.html](https://ds9.si.edu/doc/ref/region.html) - FK5 polygon syntax, properties, file format
- **GalSim roman_wcs.py bestPA** - [github.com/GalSim-developers/GalSim](https://github.com/GalSim-developers/GalSim/blob/master/galsim/roman/roman_wcs.py) - Algorithm for computing nominal PA from Sun position (bearing + 90 deg rotation)
- **Existing codebase** - `src/lib/coordinates.ts`, `src/lib/wcs.ts`, `src/lib/constraints.ts` - All coordinate math already implemented and tested

### Secondary (MEDIUM confidence)
- **astronomy-engine** - [github.com/cosinekitty/astronomy](https://github.com/cosinekitty/astronomy) - Sun position API, ecliptic conversions
- **JWST Position Angles** - [jwst-docs.stsci.edu](https://jwst-docs.stsci.edu/jwst-observatory-characteristics-and-performance/jwst-position-angles-ranges-and-offsets) - V3PA definition and convention (same as Roman)

### Tertiary (LOW confidence)
- **nuqs** - [nuqs.dev](https://nuqs.dev) - Evaluated but not recommended for this project (too heavyweight for 5 params)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies needed; all computation uses existing code + Web APIs
- Architecture: HIGH - Pattern is straightforward state lifting + text generation; no novel engineering
- Pitfalls: HIGH - PA wrap-around and URL sync are well-known problems with documented solutions
- DS9 format: HIGH - Official DS9 documentation is authoritative and the format is simple text
- Roll range: HIGH - Roman observatory docs clearly state +/-15 degrees; GalSim confirms algorithm

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable domain; Roman constraints unlikely to change)
