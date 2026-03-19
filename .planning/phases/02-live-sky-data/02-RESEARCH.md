# Phase 2: Live Sky Data - Research

**Researched:** 2026-03-19
**Domain:** VizieR TAP Gaia DR3 cone search, SIMBAD/Sesame name resolution, HMS/DMS coordinate parsing, adaptive star density management
**Confidence:** HIGH

## Summary

Phase 2 connects the geometry-accurate footprint viewer (Phase 1) to real astronomical data, turning RomanView from a geometry visualizer into a sky-aware observation planner. The phase has two major functional areas: (1) target input -- resolving names via Sesame and accepting manual coordinates in both decimal degrees and HMS/DMS format, and (2) live star catalog queries -- fetching Gaia DR3 sources from VizieR TAP at the target pointing with adaptive magnitude limiting for dense fields.

The existing codebase already has partial implementations of both capabilities. `simbad.ts` has a working Sesame resolver that parses XML responses, and `vizier.ts` has a VizieR TAP query function. However, the VizieR query uses **wrong column names** (`ra`, `dec`, `phot_g_mean_mag`) -- the actual TAPVizieR I/355/gaiadr3 table uses `RA_ICRS`, `DE_ICRS`, and `Gmag`. The coordinate input currently only accepts decimal degrees; HMS/DMS parsing must be added. The star rendering currently uses a static HYG bright star catalog (41,488 stars, ~1.3MB bundled); the live Gaia layer must be separate from this background starfield.

The architecture pattern is: user enters target (name or coords) -> name resolves via Sesame -> view centers on coordinates -> VizieR TAP cone search fetches Gaia stars within ~0.6 degrees -> adaptive magnitude filter caps results at ~2000 -> stars render in both 3D sky view and 2D focal plane SVG. The WCS engine from Phase 1 (`wcs.ts`) provides all needed projection math. No new npm dependencies are required.

**Primary recommendation:** Fix the VizieR column names, add HMS/DMS parsing to the coordinate input, implement a two-phase adaptive query strategy (try bright limit first, expand if sparse), and render live Gaia stars as a separate layer from the background HYG starfield.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TARG-01 | User can resolve target names to RA/Dec via SIMBAD/Sesame | Existing `simbad.ts` has working `sesameResolve()` function using CDS Sesame XML API; already wired into `TargetSearch.tsx`; just needs UX polish (auto-center view on resolve) |
| TARG-02 | User can enter coordinates manually in both HMS/DMS and decimal degrees | Current `TargetSearch.tsx` manual mode only accepts decimal degrees; needs HMS/DMS parser (~40 LOC regex-based parser, no library needed) |
| TARG-03 | Current pointing coordinates displayed in both RA/Dec formats | Existing `CoordinateDisplay.tsx` shows HMS/DMS via `formatRA()`/`formatDec()`; needs to add decimal degrees display alongside |
| STAR-01 | Real Gaia DR3 stars via VizieR TAP cone search (~0.6deg radius) | Existing `vizier.ts` has wrong column names; must use `RA_ICRS`, `DE_ICRS`, `Gmag` from I/355/gaiadr3; cone search radius ~0.6 deg covers full WFI FOV |
| STAR-02 | Adaptive density -- tighter magnitude cut in dense fields | Two-phase query: initial query with `Gmag < 18` and `TOP 2500`; if count > 2000, binary-search the magnitude limit downward; if count < 100, relax to `Gmag < 21` |
| STAR-03 | Star density indicator shows source count and effective magnitude limit | Simple status bar in `FocalPlaneView.tsx` footer showing "N sources (G < M.m)" |
</phase_requirements>

## Standard Stack

### Core (Already Installed -- No Changes)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | UI framework | Already in place |
| Three.js | 0.183.2 | 3D star rendering in sky view | Background starfield already renders with custom shaders |
| @react-three/fiber | 9.5.0 | React + Three.js binding | Already in place |
| Vitest | 4.1.0 | Test framework | Already configured from Phase 1 |

### New: Custom Modules (No npm Install)
| Module | Location | Purpose | Why |
|--------|----------|---------|-----|
| parseCoords.ts | `src/lib/parseCoords.ts` | HMS/DMS to decimal degrees parser | ~40 LOC regex parser; no library needed for astronomical formats |
| gaiaStars hook | `src/hooks/useGaiaStars.ts` | React hook wrapping VizieR query with caching and adaptive limiting | Manages async state, cancellation, and density adaptation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom HMS/DMS parser | astro-coordinates npm | Unmaintained (last update 2019); only 40 LOC to write custom |
| VizieR TAP (CDS) | ESA Gaia Archive TAP | ESA archive is slower, has stricter rate limits; VizieR is designed for lightweight queries |
| Client-side VizieR fetch | CORS proxy | Not needed -- CDS VizieR and Sesame both support CORS (confirmed by existing working code) |
| Separate Gaia star layer | Replace HYG background stars | HYG provides aesthetically important all-sky background; Gaia stars are the science layer |

**Installation:**
```bash
# No new npm packages needed. All functionality built from existing dependencies.
```

## Architecture Patterns

### Recommended Module Structure
```
src/
  lib/
    vizier.ts          # MODIFIED: Fix column names, add adaptive limiting
    simbad.ts          # UNCHANGED (already works correctly)
    parseCoords.ts     # NEW: HMS/DMS coordinate parsing
    wcs.ts             # UNCHANGED (Phase 1, provides projection math)
    coordinates.ts     # MINOR: Add decimal degree formatting
  hooks/
    useGaiaStars.ts    # NEW: React hook for live Gaia star queries
    useTargets.ts      # UNCHANGED (existing target management)
  components/
    ui/
      TargetSearch.tsx      # MODIFIED: Add HMS/DMS input, auto-center
      CoordinateDisplay.tsx # MODIFIED: Show both HMS/DMS and decimal
      FocalPlaneView.tsx    # MODIFIED: Render Gaia stars + density indicator
    scene/
      GaiaStarLayer.tsx     # NEW: Three.js points for live Gaia stars (separate from StarField)
      CelestialScene.tsx    # MODIFIED: Add GaiaStarLayer
```

### Pattern 1: Two-Layer Star Rendering
**What:** Background HYG stars (static, bundled) remain as the all-sky aesthetic layer. Live Gaia DR3 stars (dynamic, fetched) render as a separate overlay layer at the target pointing.
**When to use:** Whenever a target is selected and Gaia data has been fetched.
**Why:** The HYG catalog provides the visual context of the full sky (bright stars visible across the celestial sphere). Gaia stars are faint (G > 8) and only meaningful near the target. Mixing them would either lose the full-sky context or require fetching Gaia data for the entire sky (impossible).

```
Sky View:
  StarField.tsx       -> HYG bright stars (static, all-sky, always visible)
  GaiaStarLayer.tsx   -> Gaia DR3 stars (dynamic, target-vicinity, visible when target selected)

Focal Plane View:
  FocalPlaneView.tsx  -> Gaia DR3 stars projected via wcs.ts (replaces current HYG-only projection)
```

### Pattern 2: Adaptive Magnitude Limiting
**What:** Query VizieR with a generous magnitude limit and row cap, then adjust based on results.
**When to use:** Every Gaia star query.

Strategy:
```
1. Initial query: SELECT TOP 2500 RA_ICRS, DE_ICRS, Gmag
   FROM "I/355/gaiadr3"
   WHERE 1=CONTAINS(POINT('ICRS', RA_ICRS, DE_ICRS), CIRCLE('ICRS', ra, dec, 0.6))
   AND Gmag < 18
   ORDER BY Gmag ASC

2. If count >= 2000:
   - Dense field detected (galactic plane, cluster)
   - Tighten magnitude: use the Gmag of the 2000th brightest star as the limit
   - Report: "2000 sources (G < 14.2)" with a density warning

3. If count < 100:
   - Sparse field (high galactic latitude, near pole)
   - Re-query with Gmag < 21 (Gaia limit)
   - Report: "87 sources (G < 21.0)"

4. Normal case (100-2000 sources):
   - Use as-is
   - Report: "847 sources (G < 18.0)"
```

**Key insight:** Ordering by `Gmag ASC` and using `TOP 2500` means we always get the brightest stars first, which is what we want for rendering (bright stars matter more). The 2500 ceiling provides a buffer to determine the actual 2000-star magnitude cutoff.

### Pattern 3: Coordinate Parsing with Regex
**What:** Parse astronomical coordinate strings in multiple formats to decimal degrees.
**When to use:** Manual coordinate input from the user.

Supported formats:
```
Decimal degrees:      "10.6847 +41.2687"  or  "10.6847, 41.2687"
HMS/DMS (colons):     "00:42:44.3 +41:16:09"
HMS/DMS (letters):    "00h42m44.3s +41d16m09s"
HMS/DMS (symbols):    "00h 42' 44.3\" +41d 16' 09\""
```

The parser should:
1. Split input into RA and Dec parts (by whitespace or comma)
2. Detect format (presence of h/m/s or :/d indicates HMS/DMS)
3. Convert HMS to degrees: `deg = h*15 + m*15/60 + s*15/3600`
4. Convert DMS to degrees: `deg = d + m/60 + s/3600` (with sign)
5. Validate ranges: RA in [0, 360), Dec in [-90, 90]

### Pattern 4: Debounced Async Query with AbortController
**What:** The `useGaiaStars` hook debounces queries (500ms after last coordinate change) and uses AbortController to cancel in-flight requests when the target changes.
**When to use:** Any time the target RA/Dec changes.

```typescript
// Pseudocode for useGaiaStars hook
function useGaiaStars(ra: number | undefined, dec: number | undefined) {
  const [stars, setStars] = useState<GaiaSource[]>([]);
  const [status, setStatus] = useState<QueryStatus>({ state: 'idle' });
  const abortRef = useRef<AbortController>();

  useEffect(() => {
    if (ra === undefined || dec === undefined) return;

    // Cancel previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus({ state: 'loading' });

    const timer = setTimeout(async () => {
      try {
        const result = await adaptiveGaiaQuery(ra, dec, controller.signal);
        if (!controller.signal.aborted) {
          setStars(result.stars);
          setStatus({
            state: 'loaded',
            count: result.stars.length,
            magLimit: result.magLimit,
            isDense: result.isDense,
          });
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setStatus({ state: 'error', message: String(err) });
        }
      }
    }, 300); // debounce

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [ra, dec]);

  return { stars, status };
}
```

### Anti-Patterns to Avoid

- **Replacing the HYG background with Gaia:** The HYG catalog provides the all-sky visual context. Gaia is the science layer. They serve different purposes and must remain separate.
- **Fetching Gaia stars on every camera pan:** Only fetch when the TARGET changes (RA/Dec). Camera rotations/zooms should not trigger new queries.
- **Unbounded VizieR queries:** Always use `TOP N` and a magnitude limit. The galactic center has millions of stars per square degree at G<21. A query without limits will time out or return enormous data.
- **Synchronous coordinate parsing:** Coordinate parsing is CPU-cheap but the user types incrementally. Debounce and only parse on blur/enter, not on every keystroke.
- **Using ESA Gaia Archive instead of VizieR:** The ESA archive (gea.esac.esa.int) has stricter rate limits and is designed for batch research, not lightweight browser queries. VizieR TAP is the standard for small cone searches.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Name resolution | Custom catalog lookup | CDS Sesame XML API (`sesameResolve()`) | Queries SIMBAD, NED, and VizieR simultaneously; handles aliases and alternate names |
| Star catalog query | Download and bundle Gaia data | VizieR TAP ADQL cone search | Gaia DR3 is 1.8 billion sources; can't bundle |
| Coordinate formatting | Manual string construction | Existing `formatRA()`/`formatDec()` | Already correct and tested |
| Sky-to-focal-plane projection | New projection math | Existing `skyToFocalPlane()` from `wcs.ts` | Phase 1 centralized engine, tested |

**Key insight:** The existing codebase already has 80% of the plumbing. Phase 2 is primarily about fixing the VizieR column names, adding HMS/DMS parsing, implementing adaptive limiting, and wiring the data to both rendering layers.

## Common Pitfalls

### Pitfall 1: Wrong VizieR TAP Column Names
**What goes wrong:** The existing `vizier.ts` queries `ra`, `dec`, `phot_g_mean_mag` -- these are ESA Gaia Archive column names, NOT VizieR column names.
**Why it happens:** The Gaia DR3 table has different column names depending on whether you access it through the ESA Gaia Archive or through VizieR's TAPVizieR service.
**How to avoid:** Use the verified VizieR column names: `RA_ICRS`, `DE_ICRS`, `Gmag`. The table name in TAPVizieR is `"I/355/gaiadr3"`.
**Warning signs:** VizieR returns empty results or errors about unknown columns.
**Confidence:** HIGH -- verified by direct TAPVizieR metadata query during research.

Correct ADQL query:
```sql
SELECT TOP 2500 RA_ICRS, DE_ICRS, Gmag
FROM "I/355/gaiadr3"
WHERE 1=CONTAINS(POINT('ICRS', RA_ICRS, DE_ICRS), CIRCLE('ICRS', {ra}, {dec}, 0.6))
AND Gmag < 18
ORDER BY Gmag ASC
```

### Pitfall 2: VizieR Query Timeout in Dense Fields
**What goes wrong:** Querying the galactic center without a magnitude limit causes the VizieR query to take 30+ seconds or time out entirely.
**Why it happens:** The galactic center region has >500,000 Gaia sources per square degree at G<21. A 0.6-degree cone search returns millions of rows.
**How to avoid:** Always include `AND Gmag < {limit}` in the WHERE clause. Start with `Gmag < 18` (covers most fields without overwhelming results). The `TOP 2500 ... ORDER BY Gmag ASC` ensures we get the brightest stars even in dense fields.
**Warning signs:** Queries taking >5 seconds, browser becoming unresponsive, empty results from timeout.

### Pitfall 3: Rendering Performance with >2000 SVG Stars
**What goes wrong:** The focal plane view uses SVG `<circle>` elements. More than ~2000 circles causes noticeable lag during redraws, especially on lower-end devices.
**Why it happens:** SVG DOM elements are expensive. Each circle is a DOM node that participates in layout.
**How to avoid:** Hard-cap Gaia star count at 2000 (magnitude-limited). For the 3D sky view, use Three.js Points (instanced) which handles thousands of stars easily. For the SVG focal plane, 2000 circles is acceptable.
**Warning signs:** UI becomes sluggish when pointing at the galactic plane.

### Pitfall 4: Stale Stars After Target Change
**What goes wrong:** User changes target rapidly (typing a new name, clicking targets in list). Previous fetch completes and overwrites the stars for the new target.
**Why it happens:** Async race condition -- the older fetch resolves after the newer one starts.
**How to avoid:** Use AbortController to cancel in-flight requests when the target changes. Check `signal.aborted` before updating state.
**Warning signs:** Stars briefly flash for the wrong target before being replaced.

### Pitfall 5: HMS/DMS Parsing Edge Cases
**What goes wrong:** Parser chokes on various legitimate coordinate formats that astronomers use.
**Why it happens:** Astronomers use many notations: `00h42m44.3s`, `00:42:44.3`, `0 42 44.3`, and even mixed formats.
**How to avoid:** Use flexible regex that handles all common separators (h/m/s, d/'/", colons, spaces). Test against a set of well-known target coordinates.
**Warning signs:** Manual coordinate entry fails for formats the user expects to work.

### Pitfall 6: Cone Search Radius vs FOV
**What goes wrong:** Using a cone search radius smaller than the WFI FOV diagonal means stars in the corners of the field are missing.
**Why it happens:** The WFI FOV is ~0.74 x 0.89 degrees (SIAF-derived), with a diagonal of ~1.16 degrees. A radius of 0.5 degrees only covers a circle inscribed in the FOV.
**How to avoid:** Use a cone search radius of 0.6 degrees (the half-diagonal of the WFI FOV is ~0.58 degrees). This covers all detectors with slight margin.
**Warning signs:** Stars disappear near the corners of the outermost detectors.

## Code Examples

### Fixed VizieR TAP ADQL Query
```typescript
// Source: Verified against TAPVizieR metadata (column names confirmed via direct query)
export async function gaiaConSearch(
  raDeg: number,
  decDeg: number,
  radiusDeg: number,
  magLimit: number = 18,
  maxResults: number = 2500
): Promise<GaiaSource[]> {
  const query = `SELECT TOP ${maxResults} RA_ICRS, DE_ICRS, Gmag FROM "I/355/gaiadr3" WHERE 1=CONTAINS(POINT('ICRS', RA_ICRS, DE_ICRS), CIRCLE('ICRS', ${raDeg.toFixed(6)}, ${decDeg.toFixed(6)}, ${radiusDeg.toFixed(4)})) AND Gmag < ${magLimit.toFixed(1)} ORDER BY Gmag ASC`;

  const params = new URLSearchParams({
    REQUEST: 'doQuery',
    LANG: 'ADQL',
    FORMAT: 'json',
    QUERY: query,
  });

  const response = await fetch(
    `https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync?${params.toString()}`,
    { signal } // pass AbortController signal
  );

  if (!response.ok) {
    throw new Error(`VizieR query failed: ${response.statusText}`);
  }

  const data = await response.json();
  const rows = data?.data || [];

  return rows
    .filter((row: unknown[]) => row[0] != null && row[1] != null)
    .map((row: unknown[]) => ({
      ra: Number(row[0]),
      dec: Number(row[1]),
      mag: Number(row[2]) || 20,
    }));
}
```

### HMS/DMS Coordinate Parser
```typescript
// No external library needed -- ~40 LOC handles all common formats

interface ParsedCoords {
  ra: number;   // degrees [0, 360)
  dec: number;  // degrees [-90, 90]
}

/**
 * Parse a coordinate string into decimal degrees.
 * Supports:
 *   "10.6847 +41.2687"           (decimal degrees)
 *   "00h42m44.3s +41d16m09s"     (HMS/DMS with letters)
 *   "00:42:44.3 +41:16:09"       (HMS/DMS with colons)
 */
export function parseCoords(input: string): ParsedCoords | null {
  const cleaned = input.trim();

  // Try to split into RA and Dec parts
  // Common separators: comma, multiple spaces, or single space after a sign
  const parts = splitRaDec(cleaned);
  if (!parts) return null;

  const ra = parseRA(parts.ra);
  const dec = parseDec(parts.dec);

  if (ra === null || dec === null) return null;
  if (ra < 0 || ra >= 360 || dec < -90 || dec > 90) return null;

  return { ra, dec };
}

function parseRA(s: string): number | null {
  // Try decimal first
  const decimal = parseFloat(s);
  if (!isNaN(decimal) && !s.match(/[hmd:]/i)) return decimal;

  // HMS format: 00h42m44.3s or 00:42:44.3
  const hms = s.match(/(\d+)[h:]\s*(\d+)[m:]\s*([\d.]+)s?/i);
  if (hms) {
    const h = parseInt(hms[1]);
    const m = parseInt(hms[2]);
    const sec = parseFloat(hms[3]);
    return h * 15 + m * 15 / 60 + sec * 15 / 3600;
  }

  return null;
}

function parseDec(s: string): number | null {
  // Try decimal first
  const decimal = parseFloat(s);
  if (!isNaN(decimal) && !s.match(/[dmd:']/i)) return decimal;

  // DMS format: +41d16m09s or +41:16:09
  const dms = s.match(/([+-]?\d+)[d:]\s*(\d+)[m':]\s*([\d.]+)[s"]?/i);
  if (dms) {
    const sign = dms[1].startsWith('-') ? -1 : 1;
    const d = Math.abs(parseInt(dms[1]));
    const m = parseInt(dms[2]);
    const sec = parseFloat(dms[3]);
    return sign * (d + m / 60 + sec / 3600);
  }

  return null;
}
```

### Adaptive Query Logic
```typescript
interface AdaptiveResult {
  stars: GaiaSource[];
  magLimit: number;
  isDense: boolean;
}

async function adaptiveGaiaQuery(
  ra: number,
  dec: number,
  signal: AbortSignal,
  radius: number = 0.6
): Promise<AdaptiveResult> {
  // Phase 1: Query with moderate magnitude limit
  const initial = await gaiaConSearch(ra, dec, radius, 18, 2500, signal);

  if (initial.length >= 2000) {
    // Dense field: use the 2000th star's magnitude as the effective limit
    const trimmed = initial.slice(0, 2000);
    const magLimit = trimmed[trimmed.length - 1].mag;
    return { stars: trimmed, magLimit, isDense: true };
  }

  if (initial.length < 100) {
    // Sparse field: go deeper
    const deeper = await gaiaConSearch(ra, dec, radius, 21, 2500, signal);
    const magLimit = deeper.length > 0 ? Math.max(...deeper.map(s => s.mag)) : 21;
    return {
      stars: deeper.slice(0, 2000),
      magLimit: Math.min(magLimit, 21),
      isDense: false,
    };
  }

  // Normal field
  const magLimit = initial.length > 0 ? Math.max(...initial.map(s => s.mag)) : 18;
  return { stars: initial, magLimit, isDense: false };
}
```

### Gaia Star Layer (Three.js Points)
```typescript
// Render Gaia stars as Three.js Points in the 3D sky view
// Separate from the HYG StarField component

function GaiaStarLayer({ stars, visible }: { stars: GaiaSource[], visible: boolean }) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(stars.length * 3);
    const sizes = new Float32Array(stars.length);

    for (let i = 0; i < stars.length; i++) {
      const pos = raDecToCartesian(stars[i].ra, stars[i].dec, 99);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      // Size: brighter = larger. Gaia mags range ~8 to ~21
      sizes[i] = Math.max(0.1, 2.0 - (stars[i].mag - 8) * 0.15);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    return geo;
  }, [stars]);

  if (!visible || stars.length === 0) return null;

  return (
    <points geometry={geometry}>
      <pointsMaterial
        color="#a0c0ff"
        size={0.3}
        sizeAttenuation
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
```

## State of the Art

| Old Approach (Current Code) | Current Approach (This Phase) | Impact |
|----------------------------|-------------------------------|--------|
| VizieR query with wrong column names (`ra`, `dec`, `phot_g_mean_mag`) | Correct VizieR columns (`RA_ICRS`, `DE_ICRS`, `Gmag`) | Queries actually return data |
| Static HYG catalog only (41K bundled stars, mag < ~8) | HYG background + live Gaia DR3 overlay (mag < ~18-21) | Real science-grade star field at target |
| Manual coordinates in decimal degrees only | HMS/DMS and decimal degrees input | Astronomers can use their preferred format |
| No density management | Adaptive magnitude limiting with 2000-star cap | Dense fields (galactic plane) remain performant |
| Coordinate display: HMS/DMS only | Both HMS/DMS and decimal degrees | Complete TARG-03 requirement |
| No loading/status feedback for star queries | Loading indicator, star count, effective magnitude limit | User understands current state |
| Stars only in focal plane view (HYG projection) | Stars in BOTH 3D sky view (Three.js) and focal plane SVG | Complete visualization at both scales |

**Deprecated in this phase:**
- Direct use of `getRawStars()` for focal plane stars -- replaced by Gaia DR3 data for science targets (HYG remains for background only)

## Open Questions

1. **VizieR rate limiting for rapid target switching**
   - What we know: VizieR TAP has a 5-hour query timeout and no documented per-request rate limit. The existing code already uses VizieR successfully.
   - What's unclear: Whether rapid successive queries (e.g., user clicking through 10 targets quickly) could trigger any IP-based throttling.
   - Recommendation: Implement 300ms debounce + AbortController cancellation. This naturally limits request rate to ~3/sec max, which is well within any reasonable rate limit.

2. **Sesame resolver reliability for obscure targets**
   - What we know: Sesame queries SIMBAD, NED, and VizieR simultaneously. Works well for standard names (M31, NGC 6397, etc.)
   - What's unclear: How it handles very specific designations (e.g., "Gaia DR3 4295806720") or ambiguous inputs.
   - Recommendation: The existing `sesameResolve()` is already working. If it returns null, show "Not found" and suggest manual coordinate entry. This is the correct fallback pattern.

3. **Gaia star colors from G-band only**
   - What we know: The VizieR table has `BP-RP` color index column. The current query only fetches `Gmag`.
   - What's unclear: Whether adding color information is worth the additional column in the query.
   - Recommendation: For Phase 2, use a uniform cool-blue color for all Gaia stars (they are faint background sources). Color can be added in a future enhancement by requesting `BP-RP` and mapping it via the existing `colorIndexToColor()` function.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TARG-01 | Sesame resolves "M31" to RA~10.68, Dec~+41.27 | unit (mock fetch) | `npx vitest run src/lib/__tests__/simbad.test.ts` | Wave 0 |
| TARG-02 | HMS/DMS parser converts "00h42m44.3s +41d16m09s" to (10.6846, +41.2692) | unit | `npx vitest run src/lib/__tests__/parseCoords.test.ts` | Wave 0 |
| TARG-03 | formatRA/formatDec produce correct strings; decimal format added | unit | `npx vitest run src/lib/__tests__/coordinates.test.ts` | Wave 0 |
| STAR-01 | VizieR query uses correct column names and returns valid GaiaSource[] | unit (mock fetch) | `npx vitest run src/lib/__tests__/vizier.test.ts` | Wave 0 |
| STAR-02 | Adaptive query trims to 2000 for dense fields, expands for sparse | unit (mock fetch) | `npx vitest run src/lib/__tests__/vizier.test.ts -t "adaptive"` | Wave 0 |
| STAR-03 | Status object includes count and magLimit | unit | `npx vitest run src/lib/__tests__/vizier.test.ts -t "status"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/parseCoords.test.ts` -- HMS/DMS parsing, edge cases, decimal passthrough
- [ ] `src/lib/__tests__/vizier.test.ts` -- VizieR query construction, adaptive logic (mocked fetch)
- [ ] `src/lib/__tests__/simbad.test.ts` -- Sesame response parsing (mocked fetch)
- [ ] `src/lib/__tests__/coordinates.test.ts` -- formatRA/formatDec, decimal formatting

## Sources

### Primary (HIGH confidence)
- [TAPVizieR I/355/gaiadr3 metadata](https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync?REQUEST=doQuery&LANG=ADQL&FORMAT=json&QUERY=SELECT%20TOP%201%20*%20FROM%20%22I/355/gaiadr3%22) -- Verified column names: `RA_ICRS`, `DE_ICRS`, `Gmag` (direct query)
- [CDS Sesame documentation](https://cds.unistra.fr/doc/sesame.htx) -- Sesame XML API format, resolver databases
- [VizieR ADQL help](http://tapvizier.u-strasbg.fr/adql/help.html) -- ADQL query syntax for cone searches
- [TAPVizieR about page](https://tapvizier.cds.unistra.fr/adql/about.html) -- 5-hour query timeout, sync/async modes
- Existing codebase analysis (src/lib/vizier.ts, src/lib/simbad.ts) -- Confirms CORS works, identifies column name bug

### Secondary (MEDIUM confidence)
- [Gaia DR3 documentation](https://gea.esac.esa.int/archive/documentation/GDR3/) -- Magnitude ranges, source density information
- [Gaia DR3 star density](https://gea.esac.esa.int/archive/documentation/GDR3/Catalogue_consolidation/chap_cu9val/sec_cu9val_943/ssec_cu9val_943_star_density.html) -- Density varies enormously across the sky
- Phase 1 research (01-RESEARCH.md) -- Already flagged VizieR column name issue

### Tertiary (LOW confidence)
- Gaia star density numbers by magnitude and galactic latitude -- estimated from general knowledge, not exact per-square-degree counts. The adaptive strategy handles this gracefully by querying and adjusting.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, existing code already demonstrates the patterns
- VizieR column names: HIGH -- verified by direct metadata query against TAPVizieR
- Architecture (two-layer stars): HIGH -- follows existing codebase patterns (HYG static + dynamic overlay)
- HMS/DMS parsing: HIGH -- well-understood problem, straightforward regex approach
- Adaptive density management: MEDIUM -- the strategy is sound but exact magnitude thresholds may need tuning during implementation based on real query results
- Pitfalls: HIGH -- column name bug is confirmed; density/performance issues are standard web-app concerns

**Research date:** 2026-03-19
**Valid until:** 2026-06-19 (stable -- VizieR API and Gaia DR3 are long-lived; column names verified)
