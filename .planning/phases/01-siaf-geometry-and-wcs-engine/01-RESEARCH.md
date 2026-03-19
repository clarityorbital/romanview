# Phase 1: SIAF Geometry and WCS Engine - Research

**Researched:** 2026-03-19
**Domain:** WFI detector geometry from SIAF, gnomonic (TAN) coordinate projection, V3PA/aperture PA conventions
**Confidence:** HIGH

## Summary

Phase 1 replaces the approximate 3x6 grid detector layout with scientifically accurate positions from the Roman Space Telescope SIAF (Science Instrument Aperture File), centralizes all coordinate projection math into a single WCS engine module, and corrects the position angle convention chain from V3PA through FPA rotation to aperture orientation on the sky.

The current codebase has three critical geometry errors: (1) detector positions use a uniform grid with estimated gaps instead of SIAF-derived V2/V3 positions, (2) the 60-degree FPA rotation is missing entirely, (3) detector labels use "SCA01-SCA18" in row-major order instead of "WFI01-WFI18" in the correct SIAF-derived layout. The gnomonic projection in `FocalPlaneView.tsx` is mathematically correct but duplicated -- it exists only in the focal plane view and is not shared with `WFIFootprint.tsx`, which uses a simpler (and less accurate) arcminute-offset approach with cos(dec) correction.

The fix requires: a static JSON file with SIAF data for all 18 SCAs (~5KB), a centralized WCS module (~80 LOC) with gnomonic forward/inverse projection and PA rotation, replacement of the row/col grid logic in `roman.ts` with SIAF-sourced V2/V3 positions, and correction of the PA chain to include the V3IdlYAngle offset. No new npm dependencies are needed.

**Primary recommendation:** Extract SIAF data into `src/data/wfi_siaf.json`, build `src/lib/wcs.ts` as the single source of truth for all projection math, then rewire `WFIFootprint.tsx` and `FocalPlaneView.tsx` to use SIAF positions through the WCS engine.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOOT-01 | WFI footprint uses SIAF-derived 18-SCA positions with correct inter-detector gaps, 60-degree FPA rotation, and 0.496-degree boresight offset | SIAF JSON data provides V2Ref/V3Ref and corner coordinates for all 18 SCAs; the V3IdlYAngle=-60 encodes the FPA rotation; WFI_CEN aperture provides boresight offset |
| FOOT-02 | Each SCA is labeled (WFI01-WFI18) on the sky view so observers can identify which detector covers their target | SIAF aperture names are WFI01_FULL through WFI18_FULL; labels must use WFI01-WFI18 (not SCA01-SCA18); layout is column-major not row-major |
| FOOT-03 | Position angle follows correct convention: V3PA measured East of North, with 60-degree FPA rotation applied to detector orientation | V3PA = bearing from target to Sun; APA = V3PA - V3IdlYAngle = V3PA + 60; the existing positionAngle() function correctly computes V3PA |
| FOOT-04 | WCS coordinate transforms use gnomonic (TAN) projection for accurate sky-to-focal-plane mapping | Custom TAN projection (~40 LOC) handles forward (sky to tangent plane) and inverse (tangent plane to sky) transforms; formulas verified against Calabretta & Greisen 2002 |
</phase_requirements>

## Standard Stack

### Core (Already Installed -- No Changes)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | UI framework | Already in place |
| Three.js | 0.183.2 | 3D rendering for sky view | Already renders detector outlines as Line segments |
| @react-three/fiber | 9.5.0 | React + Three.js binding | Already in place |
| @react-three/drei | 10.7.7 | R3F utilities (Line, Text) | Used by WFIFootprint for labels |
| astronomy-engine | 2.1.19 | Sun position ephemeris | Used by positionAngle() for V3PA computation |

### New: Custom Modules (No npm Install)
| Module | Location | Purpose | Why |
|--------|----------|---------|-----|
| wfi_siaf.json | `src/data/wfi_siaf.json` | Static SIAF data for 18 SCAs | Extracted from pysiaf once; replaces approximate `wfi_geometry.json` |
| wcs.ts | `src/lib/wcs.ts` | Centralized TAN projection + PA rotation | Replaces scattered projection code in FocalPlaneView.tsx and WFIFootprint.tsx |
| siaf.ts | `src/lib/siaf.ts` | TypeScript types and accessors for SIAF data | Clean interface over raw JSON |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom TAN projection | wcsjs (astrojs/wcsjs) | Not on npm, unmaintained since ~2016, Emscripten binary |
| Custom TAN projection | aladin-lite 3.8.2 | 2.5 MB WASM bundle, full sky viewer widget, conflicts with Three.js |
| Custom TAN projection | proj4js 2.20.3 | Geographic projections (EPSG), not FITS WCS TAN |
| Static SIAF JSON | Runtime pysiaf via Pyodide | ~50 MB to run Python in browser for static data |

**Installation:**
```bash
# No new npm packages needed.
# One-time SIAF extraction (development only):
pip install pysiaf  # then run scripts/extract-siaf.py
```

## Architecture Patterns

### Recommended Module Structure
```
src/
  data/
    wfi_siaf.json         # NEW: Static SIAF data (replaces wfi_geometry.json)
  lib/
    wcs.ts                # NEW: Centralized WCS engine (gnomonic + PA rotation)
    siaf.ts               # NEW: SIAF data types and accessors
    roman.ts              # MODIFIED: WFI_DETECTORS now derived from SIAF
    coordinates.ts         # UNCHANGED (existing RA/Dec math remains)
    constraints.ts         # UNCHANGED (Sun position computation)
  components/
    scene/
      WFIFootprint.tsx    # MODIFIED: Use SIAF positions via wcs.ts
    ui/
      FocalPlaneView.tsx  # MODIFIED: Use centralized wcs.ts projection
```

### Pattern 1: Static SIAF Data as Pre-Extracted JSON
**What:** Extract detector geometry from pysiaf XML once, store as ~5KB JSON. No runtime parsing.
**When to use:** Any component needs detector positions, corner coordinates, or instrument parameters.

The JSON structure should contain:
```json
{
  "meta": { "source": "pysiaf", "prd_version": "..." },
  "boresight": { "v2": ..., "v3": ... },
  "fpa_rotation_deg": 60,
  "boresight_offset_deg": 0.496,
  "detectors": {
    "WFI01": {
      "v2Ref": 1312.95,
      "v3Ref": -1040.79,
      "v3IdlYAngle": -60.0,
      "vIdlParity": -1,
      "xSciScale": 0.1093,
      "ySciScale": 0.1064,
      "corners_v2v3": [[v2_1,v3_1], [v2_2,v3_2], [v2_3,v3_3], [v2_4,v3_4]]
    }
  }
}
```

### Pattern 2: Centralized WCS Engine
**What:** Single module (`wcs.ts`) that owns ALL coordinate projection math. Components call it; they never implement their own projection.
**When to use:** Any sky-to-focal-plane or focal-plane-to-sky transform.

The module provides:
1. `gnomonicForward(ra, dec, ra0, dec0)` -- sky to tangent plane (returns xi, eta in radians)
2. `gnomonicInverse(xi, eta, ra0, dec0)` -- tangent plane to sky (returns ra, dec in degrees)
3. `rotateByPA(xi, eta, paDeg)` -- rotate tangent plane coords by position angle
4. `v2v3ToSky(v2, v3, attitudeRa, attitudeDec, v3pa)` -- SIAF V2V3 arcsec to sky RA/Dec
5. `skyToFocalPlane(ra, dec, boresightRa, boresightDec, v3pa)` -- project star onto focal plane

### Pattern 3: V2V3-to-Sky via Tangent Plane Approximation
**What:** For the WFI's ~0.8-degree FOV, the V2V3 spherical coordinate system can be approximated as a tangent plane centered on the boresight. V2/V3 positions in arcseconds are treated as tangent plane offsets.
**When to use:** Converting SIAF V2/V3 reference positions to sky RA/Dec.

The transform chain is:
```
SIAF V2V3 (arcsec) --> offset from boresight (radians) --> rotate by V3PA --> gnomonic deproject --> sky RA/Dec
```

Specifically:
```typescript
// V2/V3 in arcsec relative to boresight V2/V3
function v2v3ToSky(
  v2: number, v3: number,           // arcseconds
  boresightV2: number, boresightV3: number, // arcseconds (WFI_CEN)
  targetRa: number, targetDec: number,       // degrees (where boresight points)
  v3paDeg: number                            // V3PA in degrees
): { ra: number; dec: number } {
  // 1. Compute offset from boresight in arcsec
  const dv2 = v2 - boresightV2;  // arcsec
  const dv3 = v3 - boresightV3;  // arcsec

  // 2. Convert to tangent plane coordinates (radians)
  //    V2 increases to the left (East when V3PA=0), V3 increases up (North when V3PA=0)
  //    In tangent plane: xi = East, eta = North
  //    xi = -dv2 (V2 and xi have opposite sign), eta = dv3
  const arcsecToRad = Math.PI / (180 * 3600);
  const xi_unrotated = -dv2 * arcsecToRad;
  const eta_unrotated = dv3 * arcsecToRad;

  // 3. Rotate by V3PA (V3PA = angle of V3 axis East of North)
  const { xi, eta } = rotateByPA(xi_unrotated, eta_unrotated, v3paDeg);

  // 4. Inverse gnomonic projection to get sky coords
  return gnomonicInverse(xi, eta, targetRa, targetDec);
}
```

**Critical sign convention:**
- V2 increases to the "left" when looking at the sky (positive V2 = more negative RA offset at V3PA=0)
- V3 increases "up" (positive V3 = more positive Dec offset at V3PA=0)
- The V3PA rotates the V2/V3 frame on the sky: V3PA is measured East of North for the +V3 axis

### Pattern 4: PA Convention Chain
**What:** The full position angle chain from Sun position to detector orientation.
**When to use:** Computing how detectors are oriented on the sky.

```
Sun position (RA, Dec) at epoch
    |
    v
V3PA = positionAngle(target, sun)    [bearing from target to Sun, East of North]
    |                                  [This is the existing function -- it is correct]
    v
Aperture PA = V3PA - V3IdlYAngle      [For Roman WFI: V3IdlYAngle = -60]
            = V3PA + 60                [So detector Y-axis is rotated 60 deg from V3]
```

**Important:** The existing `positionAngle()` function in `coordinates.ts` already correctly computes V3PA as the bearing from target to Sun. What is MISSING is the +60 degree offset to get the aperture/detector orientation. The current `WFIFootprint.tsx` and `FocalPlaneView.tsx` apply the raw V3PA without this correction, producing a ~60-degree rotation error.

### Anti-Patterns to Avoid

- **Separate projection implementations:** The current codebase has projection math in both `FocalPlaneView.tsx` (gnomonic) and `WFIFootprint.tsx` (cos(dec) approximation). All projection must go through `wcs.ts`.
- **Row/col grid computation:** The current `roman.ts` computes detector positions from a uniform pitch grid. This must be replaced with SIAF V2/V3 positions -- detectors are NOT uniformly spaced.
- **SCA naming:** Using "SCA01" instead of "WFI01". The Roman convention is WFI01-WFI18.
- **Missing FPA rotation:** Applying V3PA directly without adding V3IdlYAngle (+60 degrees).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detector positions | Computed grid from row/col/pitch | SIAF V2/V3 reference data | Real gaps are non-uniform; 60-degree rotation not captured by grid |
| SCA numbering/layout | Sequential numbering assumption | SIAF aperture names | Layout is column-major, not row-major; labels must match official names |
| Full attitude matrix (3x3 rotation) | Matrix multiplication library | Tangent plane approximation | WFI FOV is <1 degree; gnomonic projection is accurate to <0.01" at this scale |
| SIAF XML parsing at runtime | XML parser in browser | Pre-extracted JSON | XML is ~200KB, parsing is slow; JSON is ~5KB and Vite imports natively |

**Key insight:** The WFI FOV is small enough (~0.8 degrees) that the tangent plane approximation (gnomonic projection) replaces the need for a full 3D attitude matrix rotation. The error is sub-arcsecond over the entire FOV. This eliminates the need for matrix math libraries and simplifies the code enormously.

## Common Pitfalls

### Pitfall 1: Missing 60-Degree FPA Rotation
**What goes wrong:** Applying V3PA directly to detector positions without adding the V3IdlYAngle offset (+60 degrees). The focal plane appears rotated ~60 degrees from reality.
**Why it happens:** The existing code computes V3PA correctly as bearing from target to Sun, but does not include the WFI's physical rotation relative to V3.
**How to avoid:** The aperture PA on the sky = V3PA - V3IdlYAngle. For Roman WFI, V3IdlYAngle = -60.0, so APA = V3PA + 60. Use this total PA when rotating detector corners from V2V3 frame to sky.
**Warning signs:** N/E compass rose in focal plane view points in wrong directions. Detectors are visibly rotated compared to APT output.

### Pitfall 2: Wrong SCA Numbering and Layout
**What goes wrong:** The current `wfi_geometry.json` uses SCA01-SCA18 in row-major order. The real layout is column-major with the official naming WFI01-WFI18.
**Why it happens:** A simple grid assumption. The actual layout:
```
Row 2 (top):    WFI09  WFI06  WFI03  WFI12  WFI15  WFI18
Row 1 (mid):    WFI08  WFI05  WFI02  WFI11  WFI14  WFI17
Row 0 (bot):    WFI07  WFI04  WFI01  WFI10  WFI13  WFI16
```
**How to avoid:** Source all detector identities from the SIAF JSON, not from grid indexing.
**Warning signs:** Detector labels don't match official NASA WFI focal plane diagrams.

### Pitfall 3: V2 Sign Convention in Tangent Plane
**What goes wrong:** V2 increases to the left when looking at the sky (it is a "left-handed" angular coordinate in some contexts). Treating V2 as directly proportional to the tangent-plane xi (East) coordinate without flipping the sign puts detectors on the wrong side.
**Why it happens:** The V2/V3 frame has V2 increasing in a direction that, when projected on the sky with V3PA=0, corresponds to decreasing RA (i.e., West, not East). The tangent plane convention has xi increasing East.
**How to avoid:** Apply xi = -dV2 (negate V2 offset) when converting to tangent plane coordinates. Verify by checking that WFI01 (V2Ref ~1313") appears to the correct side of the boresight.
**Warning signs:** Detector footprint appears mirror-flipped on the sky.

### Pitfall 4: Boresight Offset Confusion
**What goes wrong:** Using the V1 axis (telescope boresight) as the WFI center. The WFI center (WFI_CEN) is offset 0.496 degrees (~30 arcmin) from V1.
**Why it happens:** For most single-instrument telescopes, boresight = instrument center. Roman's WFI is physically offset.
**How to avoid:** When a user points at a target (RA, Dec), that target should land on WFI_CEN's V2/V3 position, not on (0, 0). All V2V3 offsets should be relative to WFI_CEN.
**Warning signs:** Target appears shifted ~30 arcmin from the expected detector when compared to APT.

### Pitfall 5: RA Pre-Filter at High Declination
**What goes wrong:** The current FocalPlaneView uses `dRa > 1` as a pre-filter. At Dec = 85 degrees, 1 degree of RA corresponds to only ~5 arcmin of sky, so this filter is far too aggressive and discards visible stars.
**Why it happens:** RA degrees are not equal to sky degrees except at the equator. The correct filter is `dRa > threshold / cos(dec)`.
**How to avoid:** Use angular separation (Vincenty/Haversine) for pre-filtering, or apply the cos(dec) correction: `dRa > searchRadius / Math.cos(dec * Math.PI / 180)`.
**Warning signs:** Stars disappear from the focal plane view when pointing near the celestial poles.

## Code Examples

### Gnomonic Forward Projection (Sky to Tangent Plane)
```typescript
// Source: Calabretta & Greisen 2002, verified against Wolfram MathWorld
// Also matches existing FocalPlaneView.tsx implementation

export function gnomonicForward(
  ra: number, dec: number,         // source position, degrees
  ra0: number, dec0: number        // tangent point (boresight), degrees
): { xi: number; eta: number } | null {
  const toRad = Math.PI / 180;
  const cosDec = Math.cos(dec * toRad);
  const sinDec = Math.sin(dec * toRad);
  const cosDec0 = Math.cos(dec0 * toRad);
  const sinDec0 = Math.sin(dec0 * toRad);
  const dRa = (ra - ra0) * toRad;

  const cosC = sinDec0 * sinDec + cosDec0 * cosDec * Math.cos(dRa);
  if (cosC <= 0) return null; // behind tangent point

  const xi  = (cosDec * Math.sin(dRa)) / cosC;           // radians, East
  const eta = (cosDec0 * sinDec - sinDec0 * cosDec * Math.cos(dRa)) / cosC; // radians, North

  return { xi, eta };
}
```

### Gnomonic Inverse Projection (Tangent Plane to Sky)
```typescript
// Source: Calabretta & Greisen 2002

export function gnomonicInverse(
  xi: number, eta: number,         // tangent plane, radians
  ra0: number, dec0: number        // tangent point, degrees
): { ra: number; dec: number } {
  const toRad = Math.PI / 180;
  const cosDec0 = Math.cos(dec0 * toRad);
  const sinDec0 = Math.sin(dec0 * toRad);
  const rho = Math.sqrt(xi * xi + eta * eta);

  if (rho === 0) return { ra: ra0, dec: dec0 };

  const c = Math.atan(rho);
  const cosC = Math.cos(c);
  const sinC = Math.sin(c);

  const dec = Math.asin(cosC * sinDec0 + (eta * sinC * cosDec0) / rho);
  const raRad = ra0 * toRad + Math.atan2(
    xi * sinC,
    rho * cosDec0 * cosC - eta * sinDec0 * sinC
  );

  return {
    ra: ((raRad / toRad) % 360 + 360) % 360,
    dec: dec / toRad,
  };
}
```

### PA Rotation in Tangent Plane
```typescript
// PA measured East of North (standard astronomical convention)
export function rotateByPA(
  xi: number, eta: number,
  paDeg: number
): { xi: number; eta: number } {
  const pa = paDeg * Math.PI / 180;
  const cosPA = Math.cos(pa);
  const sinPA = Math.sin(pa);
  return {
    xi:   xi * cosPA + eta * sinPA,
    eta: -xi * sinPA + eta * cosPA,
  };
}
```

### V2V3 to Sky (SIAF Detector Corners to RA/Dec)
```typescript
// Convert a V2/V3 position to sky coordinates given a pointing attitude
// Uses tangent plane approximation (accurate to <0.01" for WFI FOV)
export function v2v3ToSky(
  v2: number, v3: number,                     // arcseconds (from SIAF)
  boresightV2: number, boresightV3: number,   // arcseconds (WFI_CEN)
  targetRa: number, targetDec: number,         // degrees (boresight pointing)
  v3paDeg: number                              // degrees (V3 position angle)
): { ra: number; dec: number } {
  const arcsecToRad = Math.PI / (180 * 3600);

  // Offset from boresight in V2/V3 frame
  const dv2 = (v2 - boresightV2) * arcsecToRad;
  const dv3 = (v3 - boresightV3) * arcsecToRad;

  // V2V3 to tangent plane: xi = -dv2 (V2 sign flip), eta = dv3
  const xi_unrot = -dv2;
  const eta_unrot = dv3;

  // Rotate by V3PA to align with sky N/E
  const { xi, eta } = rotateByPA(xi_unrot, eta_unrot, v3paDeg);

  // Inverse gnomonic to get sky position
  return gnomonicInverse(xi, eta, targetRa, targetDec);
}
```

### Pysiaf Extraction Script
```python
# scripts/extract-siaf.py -- run once, output committed as src/data/wfi_siaf.json
import pysiaf
import json

siaf = pysiaf.Siaf('Roman')
data = {
    "meta": {"source": "pysiaf", "instrument": "Roman WFI"},
    "boresight": {},
    "detectors": {}
}

# WFI center (boresight reference for pointing)
wfi_cen = siaf['WFI_CEN']
data["boresight"] = {
    "v2Ref": float(wfi_cen.V2Ref),
    "v3Ref": float(wfi_cen.V3Ref)
}

for i in range(1, 19):
    name = f'WFI{i:02d}_FULL'
    ap = siaf[name]

    # Get corner coordinates in V2V3 (telescope frame)
    v2_corners, v3_corners = ap.closed_polygon_points('tel')

    data["detectors"][f"WFI{i:02d}"] = {
        "v2Ref": float(ap.V2Ref),
        "v3Ref": float(ap.V3Ref),
        "v3IdlYAngle": float(ap.V3IdlYAngle),
        "vIdlParity": int(ap.VIdlParity),
        "xSciScale": float(ap.XSciScale),
        "ySciScale": float(ap.YSciScale),
        "xDetSize": int(ap.XDetSize),
        "yDetSize": int(ap.YDetSize),
        "corners_v2v3": [
            [float(v2_corners[j]), float(v3_corners[j])]
            for j in range(4)
        ]
    }

with open('src/data/wfi_siaf.json', 'w') as f:
    json.dump(data, f, indent=2)

print(f"Extracted {len(data['detectors'])} detectors")
print(f"Boresight: V2={data['boresight']['v2Ref']}, V3={data['boresight']['v3Ref']}")
```

## State of the Art

| Old Approach (Current Code) | Current Approach (This Phase) | Impact |
|----------------------------|-------------------------------|--------|
| Uniform 3x6 grid with estimated gaps | SIAF V2/V3 positions for each SCA | Correct inter-detector gaps, proper 60-deg rotation |
| SCA01-SCA18 row-major naming | WFI01-WFI18 SIAF-standard naming | Matches official NASA documentation |
| cos(dec) arcminute offsets for footprint | Gnomonic (TAN) projection via WCS engine | Mathematically accurate, centralized |
| V3PA applied directly (no FPA offset) | V3PA + 60 deg aperture PA chain | Correct detector orientation on sky |
| Projection duplicated in 2 files | Single wcs.ts module | No divergence bugs |
| Boresight at grid center | Boresight at WFI_CEN V2/V3 position | Correct 0.496-deg offset from V1 |

**Deprecated in this phase:**
- `wfi_geometry.json` -- replaced by `wfi_siaf.json`
- `WFI_DETECTORS` computed from row/col grid -- replaced by SIAF-derived positions
- `projectToFocalPlane()` in `FocalPlaneView.tsx` -- moved to `wcs.ts`
- `rotateByPA()` in `WFIFootprint.tsx` -- moved to `wcs.ts`

## Open Questions

1. **Exact V2 sign convention in tangent plane mapping**
   - What we know: V2 increases in the direction that corresponds to decreasing RA at V3PA=0. The standard tangent plane has xi increasing East (increasing RA). So xi = -dV2.
   - What's unclear: The exact parity with VIdlParity=-1 and its interaction with the V3IdlYAngle rotation. Need to verify empirically.
   - Recommendation: After implementing the transform, validate one known pointing against pysiaf output. Use a well-known target (e.g., M31 at RA=10.68, Dec=+41.27) at a known epoch.

2. **WFI13-WFI18 SIAF data completeness**
   - What we know: Research extracted V2/V3 for WFI01-WFI12 from pysiaf XML. WFI13-WFI18 were truncated.
   - What's unclear: Whether the extraction script will get all 18 without issues.
   - Recommendation: Run the extraction script to produce the complete JSON. If pysiaf is not available in the dev environment, the data can be manually constructed from the known pattern (the right half of the FPA mirrors the left half's structure).

3. **Tangent plane approximation accuracy at FOV edges**
   - What we know: For the WFI's 0.8-degree FOV, gnomonic projection error is <0.01 arcsec -- far below the 0.11"/pixel plate scale.
   - What's unclear: Whether the approximation of treating V2V3 as a flat tangent plane (rather than spherical coords) introduces additional error.
   - Recommendation: Acceptable for a planning tool. Document the approximation level. If sub-arcsecond accuracy is ever needed, implement the full attitude matrix rotation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (recommended -- integrates with Vite) |
| Config file | none -- see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOOT-01 | 18 SCA positions match SIAF V2/V3 values; corners are non-overlapping; FPA rotation visible in layout | unit | `npx vitest run src/lib/__tests__/siaf.test.ts -t "detector positions"` | Wave 0 |
| FOOT-02 | Detector labels are WFI01-WFI18 (not SCA); each has correct V2/V3 center | unit | `npx vitest run src/lib/__tests__/siaf.test.ts -t "detector labels"` | Wave 0 |
| FOOT-03 | PA chain: V3PA + 60 = aperture PA; rotation direction is East of North | unit | `npx vitest run src/lib/__tests__/wcs.test.ts -t "position angle"` | Wave 0 |
| FOOT-04 | Forward+inverse gnomonic projection round-trips within 0.001 arcsec; focal plane projection matches expected pixel coords | unit | `npx vitest run src/lib/__tests__/wcs.test.ts -t "gnomonic"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest` dev dependency: `npm install -D vitest`
- [ ] `vitest.config.ts` -- Vitest config file (can reuse vite.config.ts)
- [ ] `src/lib/__tests__/wcs.test.ts` -- gnomonic projection round-trip, PA rotation, V2V3-to-sky
- [ ] `src/lib/__tests__/siaf.test.ts` -- SIAF data integrity (18 detectors, correct names, non-overlapping)

## Sources

### Primary (HIGH confidence)
- [Roman Coordinate Systems](https://roman-docs.stsci.edu/data-handbook-home/wfi-data-format/coordinate-systems) -- V2/V3 frame, FPA rotation, boresight offset
- [PySIAF for Roman](https://roman-docs.stsci.edu/simulation-tools-handbook-home/simulation-development-utilities/pysiaf-for-roman) -- SIAF aperture structure, V2/V3 reference data, transform methods
- [pysiaf rotations module](https://pysiaf.readthedocs.io/en/latest/pysiaf/rotations.html) -- attitude() function, pointing() function, tel_to_sky() transform
- [pysiaf aperture source](https://pysiaf.readthedocs.io/en/latest/_modules/pysiaf/aperture.html) -- idl_to_tel transform, V3IdlYAngle usage, VIdlParity parity matrix
- [JWST set_telescope_pointing](https://jwst-pipeline.readthedocs.io/en/latest/_modules/jwst/lib/set_telescope_pointing.html) -- `PA_APER = V3PA - V3IdlYAngle` formula confirmed (same SIAF framework as Roman)
- [Gnomonic Projection (Wolfram MathWorld)](https://mathworld.wolfram.com/GnomonicProjection.html) -- TAN projection formulas
- [pysiaf GitHub (spacetelescope)](https://github.com/spacetelescope/pysiaf) -- SIAF XML data source

### Secondary (MEDIUM confidence)
- [JWST Position Angles, Ranges, and Offsets](https://jwst-docs.stsci.edu/jwst-observatory-characteristics-and-performance/jwst-position-angles-ranges-and-offsets) -- V3PA definition, aperture PA conventions (same framework applies to Roman)
- [JWST Aperture Position Angle Special Requirements](https://jwst-docs.stsci.edu/jppom/special-requirements/aperture-position-angle-special-requirements) -- APA vs V3PA relationship
- [Roman Observatory Technical](https://roman.gsfc.nasa.gov/science/observatory_technical.html) -- roll angle constraints (plus/minus 15 degrees), pitch range 54-126 degrees
- [Roman Field, Slew, and Roll](https://roman.gsfc.nasa.gov/science/field_slew_and_roll.html) -- nominal roll angle computation

### Tertiary (LOW confidence)
- V2 sign convention in tangent plane -- inferred from pysiaf source code and V frame definition, needs empirical validation against known pointing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all math verified against published formulas
- Architecture: HIGH -- patterns derived from existing codebase analysis and SIAF documentation
- Pitfalls: HIGH -- critical pitfalls (FPA rotation, naming, boresight offset) confirmed from multiple official sources
- V2 sign convention: MEDIUM -- inferred from V frame definition, needs empirical validation
- PA chain formula: HIGH -- confirmed via JWST pipeline source code (same SIAF framework)

**Research date:** 2026-03-19
**Valid until:** Stable -- SIAF data and projection math do not change. Valid indefinitely unless Roman SIAF PRD version changes.
