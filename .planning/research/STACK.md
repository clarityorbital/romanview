# Technology Stack

**Project:** RomanView -- WFI Scientifically Accurate Footprint Visualization
**Researched:** 2026-03-19

## Recommended Stack

### Existing (Keep As-Is)

| Technology | Version | Purpose | Notes |
|------------|---------|---------|-------|
| React | 19.2.4 | UI framework | Already in place |
| Three.js | 0.183.2 | 3D rendering | Already in place |
| @react-three/fiber | 9.5.0 | React + Three.js | Already in place |
| @react-three/drei | 10.7.7 | R3F utilities | Already in place |
| Vite | 8.0.1 | Build tool | Already in place |
| Tailwind CSS | 4.2.2 | Styling | Already in place |
| astronomy-engine | 2.1.19 | Ephemeris (Sun position, constraints) | Already in place |
| lucide-react | 0.577.0 | Icons | Already in place |

### New: WCS / Coordinate Math

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Custom TAN projection module | N/A | Gnomonic (TAN) projection for sky-to-plane and plane-to-sky transforms | See rationale below |

**Rationale -- write custom TAN projection, do NOT use wcsjs or Aladin Lite:**

1. **wcsjs is NOT on npm.** The `astrojs/wcsjs` GitHub repo is an Emscripten port of WCSLIB, but it was never published to npm (verified 2026-03-19: `npm view wcsjs` returns 404). Last meaningful activity was ~2016. It would require vendoring an unmaintained Emscripten binary. **Confidence: HIGH** (verified directly).

2. **Aladin Lite is too heavy.** `aladin-lite@3.8.2` (published 2026-03-06, actively maintained) is 2.5 MB unpacked and contains a Rust-to-WASM core. It is designed to be a full sky viewer widget, not a coordinate math library. Embedding it would conflict with the existing Three.js scene and balloon the bundle. It cannot be tree-shaken because the WASM is monolithic. **Confidence: HIGH** (verified package size and architecture).

3. **The TAN projection is ~40 lines of code.** For an observation planner that only needs gnomonic (tangent plane) projection at a single boresight, the math is straightforward and well-documented (Calabretta & Greisen 2002, Wolfram MathWorld). The existing `coordinates.ts` already has the cartesian-to-spherical conversions. Adding forward/inverse TAN projection is trivial:

```typescript
// Forward: sky (ra, dec) -> tangent plane (xi, eta) in radians
// Given boresight (ra0, dec0)
const cosc = sin(dec0)*sin(dec) + cos(dec0)*cos(dec)*cos(ra - ra0);
const xi  = cos(dec)*sin(ra - ra0) / cosc;
const eta = (cos(dec0)*sin(dec) - sin(dec0)*cos(dec)*cos(ra - ra0)) / cosc;

// Inverse: tangent plane (xi, eta) -> sky (ra, dec)
const rho = sqrt(xi*xi + eta*eta);
const c   = atan(rho);
const dec = asin(cos(c)*sin(dec0) + eta*sin(c)*cos(dec0)/rho);
const ra  = ra0 + atan2(xi*sin(c), rho*cos(dec0)*cos(c) - eta*sin(dec0)*sin(c));
```

This is the same math used by astropy, pysiaf, and every FITS WCS library. No dependency needed.

**Confidence: HIGH** -- formulas verified against Wolfram MathWorld gnomonic projection and FITS WCS standard (Calabretta & Greisen 2002).

### New: WFI Detector Geometry (SIAF Data)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Static JSON extracted from pysiaf `roman_siaf.xml` | PRD version (2022+) | WFI SCA positions, V2/V3 references, corner vertices | Single source of truth for detector geometry |

**Approach:** Extract the 18 WFI aperture definitions from `pysiaf/prd_data/Roman/roman_siaf.xml` into a static JSON file (`src/data/wfi_siaf.json`). This replaces the current approximate `wfi_geometry.json` which uses a uniform 3x6 grid with estimated gap sizes.

**Key SIAF parameters per SCA (verified from XML):**

| Parameter | Value (all SCAs) | Purpose |
|-----------|-----------------|---------|
| V2Ref, V3Ref | Varies per SCA (arcsec) | SCA center in V2/V3 telescope frame |
| V3IdlYAngle | -60.0 deg | Rotation of ideal frame relative to V2/V3 |
| VIdlParity | -1 | Handedness of ideal-to-V2/V3 transform |
| XSciRef, YSciRef | 2044.5, 2044.5 | Science frame reference pixel |
| XSciScale, YSciScale | ~0.1093, ~0.1064 arcsec/px | Pixel scale (slightly non-square) |
| XDetSize, YDetSize | 4096, 4096 | Full detector size (active: 4088x4088) |
| XIdlVert1-4, YIdlVert1-4 | Varies per SCA | Corner positions in ideal coordinates |

**V2/V3 reference positions for first 12 SCAs (from SIAF XML):**

| SCA | V2Ref (arcsec) | V3Ref (arcsec) |
|-----|----------------|----------------|
| WFI01 | 1312.95 | -1040.79 |
| WFI02 | 1769.43 | -1304.00 |
| WFI03 | 2177.85 | -1539.22 |
| WFI04 | 984.27 | -1414.95 |
| WFI05 | 1441.45 | -1679.19 |
| WFI06 | 1848.91 | -1913.77 |
| WFI07 | 536.01 | -1718.75 |
| WFI08 | 995.14 | -1984.95 |
| WFI09 | 1397.07 | -2221.32 |
| WFI10 | 1557.34 | -617.42 |
| WFI11 | 2013.74 | -880.92 |
| WFI12 | 2421.76 | -1116.82 |

*Note: WFI13-WFI18 were truncated in the XML fetch. Full extraction requires running pysiaf locally or fetching the complete XML.*

**WFI focal plane is rotated 60 degrees from the -V3 axis, with center offset 0.496 degrees from boresight origin.**

**Confidence: HIGH** -- V2/V3 data verified from official pysiaf XML at spacetelescope/pysiaf GitHub. Coordinate transform chain documented at roman-docs.stsci.edu.

### New: External API Integrations

#### SIMBAD/Sesame Name Resolution (already stubbed)

| Technology | Endpoint | Purpose | Why |
|------------|----------|---------|-----|
| CDS Sesame HTTP API | `https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/SNV?{name}` | Resolve target names to RA/Dec | Standard service, CORS confirmed (`Access-Control-Allow-Origin: *`), no auth needed |

**Implementation already exists** in `src/lib/simbad.ts` with both TAP and Sesame methods. The Sesame approach (`sesameResolve()`) is the right primary resolver:
- Faster than TAP query (single HTTP GET vs. ADQL query)
- Queries SIMBAD, NED, and VizieR simultaneously (the `SNV` in the URL)
- Returns XML with `jradeg`/`jdedeg` elements for coordinates
- Existing implementation is correct; just needs to be wired into the UI

**The TAP `resolveName()` method has a SQL injection risk** -- the `sanitize()` function only strips `';\\` but should use parameterized queries or at minimum a stricter sanitizer. For name resolution, prefer Sesame over TAP.

**CORS verified:** `Access-Control-Allow-Origin: *` confirmed on both endpoints (tested 2026-03-19 with curl).

**Sesame response format options:**
- `-ox` = XML (W3C schema, current)
- `-oxp` = XML with text/plain MIME (useful for debugging)
- `-oI` = Include all identifiers
- No native JSON format -- XML only, parse with DOMParser (as existing code does)

**Confidence: HIGH** -- CORS headers verified, API endpoints tested, existing code reviewed.

#### Gaia DR3 Star Catalog via TAPVizieR (already stubbed -- BUT HAS CRITICAL BUG)

| Technology | Endpoint | Purpose | Why |
|------------|----------|---------|-----|
| CDS TAPVizieR | `https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync` | Query Gaia DR3 stars in cone around target | CORS confirmed, no auth, JSON format supported |

**Implementation already exists** in `src/lib/vizier.ts`, but **the existing code uses WRONG column names and WILL FAIL**.

**CRITICAL BUG -- Wrong Column Names (verified 2026-03-19):**

The existing `gaiaConSearch()` queries `SELECT ra, dec, phot_g_mean_mag FROM "I/355/gaiadr3"`. This returns an XML error:

```
Unknown column "ra" !
Unknown column "dec" !
Unknown column "phot_g_mean_mag" !
```

TAPVizieR uses VizieR-standard column names, NOT ESA Gaia Archive column names:

| Wrong (current code) | Correct (TAPVizieR) | Description |
|---------------------|---------------------|-------------|
| `ra` | `RAJ2000` | RA in degrees (ICRS, propagated to J2000 epoch) |
| `dec` | `DEJ2000` | Dec in degrees (ICRS, propagated to J2000 epoch) |
| `phot_g_mean_mag` | `Gmag` | G-band mean magnitude |

**The CONTAINS/CIRCLE spatial function columns must also use `RAJ2000, DEJ2000`.**

Correct ADQL query:
```sql
SELECT TOP 500 RAJ2000, DEJ2000, Gmag
FROM "I/355/gaiadr3"
WHERE 1=CONTAINS(POINT('ICRS', RAJ2000, DEJ2000),
                 CIRCLE('ICRS', 10.684, 41.269, 0.30))
AND Gmag < 18
ORDER BY Gmag ASC
```

**Verified working** -- tested with curl, returns proper JSON with star data.

**Note on coordinate epoch:** TAPVizieR's `RAJ2000`/`DEJ2000` columns contain positions propagated to J2000 epoch by CDS (not Gaia's native epoch 2016.0). For high-proper-motion stars, this introduces sub-arcsecond offsets. Acceptable for a planning tool.

**Key operational parameters:**
- **CORS:** `Access-Control-Allow-Origin: *` confirmed (tested 2026-03-19)
- **Sync query row limit:** Configurable via `SELECT TOP N`, practical limit ~2000 rows
- **Query timeout:** TAPVizieR allows up to 5 hours for sync queries (generous), but dense galactic plane fields may take 10-30+ seconds even with magnitude limits
- **No authentication required** for anonymous queries
- **Response format:** JSON via `FORMAT=json` parameter
- **Cone search radius:** For WFI FOV (~0.8 x 0.4 deg), use ~0.3-0.5 deg radius
- **Magnitude limit:** Add `AND Gmag < 18` to reduce response size and query time. For dense fields near the galactic plane, tighten to `Gmag < 15`.

**Do NOT use ESA Gaia Archive directly** (`gea.esac.esa.int`):
- No CORS headers (verified: returns 500 with no `Access-Control-Allow-Origin`)
- Designed for server-side Python/curl access, not browser JavaScript
- Sync queries limited to 2000 rows and 1-minute timeout
- The CDS/TAPVizieR mirror is the correct approach for browser-side queries

**Confidence: HIGH** -- column names verified by direct API testing, CORS confirmed, error behavior confirmed.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| WCS math | Custom TAN projection (~40 LOC) | wcsjs (astrojs/wcsjs) | Not on npm, unmaintained since ~2016, Emscripten binary |
| WCS math | Custom TAN projection | Aladin Lite (3.8.2) | 2.5 MB WASM bundle, full sky viewer widget, conflicts with Three.js, cannot tree-shake |
| WCS math | Custom TAN projection | proj4js (2.20.3) | Designed for geographic projections (EPSG), not FITS WCS TAN. Would require adapting geographic projection to celestial, adding complexity for no benefit |
| Star catalog | CDS TAPVizieR (Gaia DR3) | ESA Gaia Archive TAP | No CORS support, designed for server-side access |
| Star catalog | CDS TAPVizieR | MAST Gaia DR3 TAP | Would need CORS testing, less documented for browser use |
| Name resolution | CDS Sesame | NED name resolver | Sesame already queries NED + SIMBAD + VizieR in one call |
| SIAF data | Static JSON from pysiaf XML | Hardcoded detector positions | pysiaf XML is the single source of truth, community-standard |
| SIAF data | Static JSON from pysiaf XML | Runtime pysiaf via Pyodide | Massive overhead (~50 MB) to run Python in browser for a static lookup |

## What NOT to Install

| Package | Why Not |
|---------|---------|
| `wcsjs` | Not on npm. Dead project. |
| `fitsjs` | For reading FITS files, not for coordinate math. Last updated 8+ years ago. |
| `aladin-lite` | Overkill. 2.5 MB WASM. Replaces your entire viewer. |
| `proj4js` | Geographic projections, not celestial. Wrong abstraction. |
| `pyodide` | Running Python in browser to use astropy/pysiaf is absurd for static geometry data. |
| `astroquery` | Python library, not usable in browser JavaScript. |

## Data Files to Create/Update

| File | Source | Purpose |
|------|--------|---------|
| `src/data/wfi_siaf.json` | Extracted from `pysiaf/prd_data/Roman/roman_siaf.xml` | Accurate V2/V3 positions, corner vertices, and transform parameters for all 18 SCAs |
| Update `src/lib/coordinates.ts` | Gnomonic projection formulas (Calabretta & Greisen 2002) | Add `skyToTangent()` and `tangentToSky()` functions |
| Update `src/lib/roman.ts` | Use SIAF data instead of uniform grid approximation | Replace current row/col grid with actual V2/V3-based positions |
| **FIX** `src/lib/vizier.ts` | Correct column names | Change `ra` to `RAJ2000`, `dec` to `DEJ2000`, `phot_g_mean_mag` to `Gmag` |

## Installation

```bash
# No new npm packages needed.
# The entire scientifically accurate WFI footprint system can be built
# with existing dependencies plus custom coordinate math.
```

## Extraction Script (One-Time, Development Only)

To extract SIAF data from pysiaf for the static JSON:

```python
# Run locally, not in browser. Output committed as src/data/wfi_siaf.json
import pysiaf
import json

siaf = pysiaf.Siaf('Roman')
data = {"apertures": {}, "meta": {"source": "pysiaf", "instrument": "Roman WFI"}}

for i in range(1, 19):
    ap = siaf[f'WFI{i:02d}_FULL']
    data["apertures"][f"WFI{i:02d}"] = {
        "V2Ref": ap.V2Ref,
        "V3Ref": ap.V3Ref,
        "V3IdlYAngle": ap.V3IdlYAngle,
        "VIdlParity": ap.VIdlParity,
        "XSciRef": ap.XSciRef,
        "YSciRef": ap.YSciRef,
        "XSciScale": ap.XSciScale,
        "YSciScale": ap.YSciScale,
        "XDetSize": ap.XDetSize,
        "YDetSize": ap.YDetSize,
        "corners_idl": {
            "x": [ap.XIdlVert1, ap.XIdlVert2, ap.XIdlVert3, ap.XIdlVert4],
            "y": [ap.YIdlVert1, ap.YIdlVert2, ap.YIdlVert3, ap.YIdlVert4]
        },
        "corners_tel": list(zip(
            *ap.idl_to_tel(
                [ap.XIdlVert1, ap.XIdlVert2, ap.XIdlVert3, ap.XIdlVert4],
                [ap.YIdlVert1, ap.YIdlVert2, ap.YIdlVert3, ap.YIdlVert4]
            )
        ))
    }

# Also extract WFI_CEN for boresight reference
wfi_cen = siaf['WFI_CEN']
data["boresight"] = {"V2Ref": wfi_cen.V2Ref, "V3Ref": wfi_cen.V3Ref}

with open('wfi_siaf.json', 'w') as f:
    json.dump(data, f, indent=2)
```

## Key Technical Specifications

| Parameter | Value | Source |
|-----------|-------|--------|
| WFI total FOV | ~0.8 x 0.4 deg (0.281 sq deg active) | NASA WFI Technical |
| Pixel scale | 0.11 arcsec/pixel | NASA WFI Technical, SIAF (XSciScale ~0.1093) |
| Detector size | 4096 x 4096 px (4088 x 4088 active) | SIAF, NASA docs |
| Individual SCA FOV | ~450 x 450 arcsec (~7.5 x 7.5 arcmin) | Computed from 4088 px * 0.11"/px |
| Focal plane rotation | -60 deg from -V3 axis | SIAF (V3IdlYAngle = -60.0 for all SCAs) |
| Boresight offset | 0.496 deg from V frame origin | Roman coordinate systems documentation |
| Geometric distortion | < 2% over FOV | NASA WFI description |
| Detector layout | 3 rows x 6 columns, two orientations | NASA WFI description |

## Sources

- [PySIAF for Roman - Roman User Documentation](https://roman-docs.stsci.edu/simulation-tools-handbook-home/simulation-development-utilities/pysiaf-for-roman) -- SIAF coordinate systems and transforms
- [Coordinate Systems - Roman User Documentation](https://roman-docs.stsci.edu/data-handbook-home/wfi-data-format/coordinate-systems) -- Transform chain (Det -> Sci -> Idl -> Tel -> Sky)
- [Description of the WFI - Roman User Documentation](https://roman-docs.stsci.edu/roman-instruments/the-wide-field-instrument/description-of-the-wfi) -- Detector specifications
- [WFI Quick Reference - Roman User Documentation](https://roman-docs.stsci.edu/roman-instruments/the-wide-field-instrument/observing-with-the-wfi/wfi-quick-reference) -- FOV and pixel scale
- [WFI Technical - NASA](https://roman.gsfc.nasa.gov/science/WFI_technical.html) -- Official specifications
- [pysiaf GitHub (spacetelescope/pysiaf)](https://github.com/spacetelescope/pysiaf) -- SIAF XML data source
- [Gnomonic Projection - Wolfram MathWorld](https://mathworld.wolfram.com/GnomonicProjection.html) -- TAN projection formulas
- [Sesame Documentation](http://vizier.unistra.fr/doc/sesame.htx) -- Name resolver API
- [Gaia Archive Programmatic Access](https://www.cosmos.esa.int/web/gaia-users/archive/programmatic-access) -- TAP service details

---

*Stack research: 2026-03-19*
