# Architecture Patterns

**Domain:** Browser-based WFI footprint visualization with live star catalog queries
**Researched:** 2026-03-19

## Recommended Architecture

The system extends the existing React + Three.js architecture with three new subsystems: a **SIAF geometry engine** (static config, computed at build time into a JSON blob), an **async catalog query layer** (Gaia TAP with IndexedDB caching), and a **dual-render visualization** (Three.js WebGL for stars, SVG overlay for detector footprints and labels). These integrate through a new `useStarField` hook that bridges API data to GPU buffers.

### High-Level Data Flow

```
User selects target (RA/Dec)
       |
       v
[SIAF Geometry Engine]                [Catalog Query Layer]
  Static JSON config                   Gaia TAP via CDS VizieR
  V2V3 -> sky transform               ADQL cone search
  18 SCA corner positions              ~500-2000 sources
       |                                      |
       v                                      v
[WCS Projection Engine]              [Star Buffer Builder]
  Gnomonic (TAN) projection           Float32Array positions
  PA rotation matrix                   colors, sizes from mag
  Sky coords -> focal plane            Prepared for GPU upload
       |                                      |
       +------------------+-------------------+
                          |
                          v
                [Visualization Layer]
          Three.js Points (star field)
          SVG/HTML overlay (detector outlines, labels)
          React Three Fiber scene composition
```

### Component Boundaries

| Component | Responsibility | Communicates With | Location |
|-----------|---------------|-------------------|----------|
| **SIAFConfig** | Static SIAF data: V2Ref, V3Ref, corners for all 18 SCAs in V2V3 frame | WCSEngine, WFIFootprint | `src/data/siaf.json` + `src/lib/siaf.ts` |
| **WCSEngine** | Gnomonic projection, V2V3-to-sky transforms, PA rotation | SIAFConfig, FocalPlaneView, WFIFootprint | `src/lib/wcs.ts` |
| **CatalogService** | Gaia TAP queries via CDS TAPVizieR, result parsing, error handling | CatalogCache, StarBufferBuilder | `src/lib/catalog-service.ts` |
| **CatalogCache** | IndexedDB-backed cache keyed by field center + radius | CatalogService | `src/lib/catalog-cache.ts` |
| **StarBufferBuilder** | Converts catalog results to typed arrays (Float32Array) for GPU | CatalogService, StarFieldView | `src/lib/star-buffer.ts` |
| **useStarField** | React hook: triggers query on target change, manages loading/error/data states | CatalogService, CatalogCache, StarBufferBuilder | `src/hooks/useStarField.ts` |
| **DynamicStarField** | Three.js Points component rendering queried stars with custom shaders | useStarField, scene | `src/components/scene/DynamicStarField.tsx` |
| **WFIFootprint** (evolved) | Renders 18 SCA outlines using SIAF corner data + WCS projection | SIAFConfig, WCSEngine | `src/components/scene/WFIFootprint.tsx` |
| **FocalPlaneView** (evolved) | SVG focal plane display with queried stars projected onto detector grid | WCSEngine, useStarField, SIAFConfig | `src/components/ui/FocalPlaneView.tsx` |
| **SkyView** (new) | Composite component: DynamicStarField + footprint overlay at target pointing | useStarField, WFIFootprint, WCSEngine | `src/components/scene/SkyView.tsx` |

## Data Flow: Detailed

### 1. Target Selection to Star Query (API to GPU)

```
Target selected (RA=83.633, Dec=-5.375)
  |
  v
useStarField hook fires
  |
  +-- Check CatalogCache (IndexedDB)
  |     Key: "83.63_-5.38_0.30" (rounded center + radius)
  |     Hit? -> Skip fetch, use cached GaiaSource[]
  |     Miss? -> Continue to fetch
  |
  +-- CatalogService.queryCone(ra, dec, radius=0.3deg)
  |     Build ADQL: SELECT ra, dec, phot_g_mean_mag, bp_rp
  |       FROM "I/355/gaiadr3"
  |       WHERE CONTAINS(POINT(...), CIRCLE(...))
  |       AND phot_g_mean_mag < 18
  |       ORDER BY phot_g_mean_mag
  |       TOP 2000
  |     POST to https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync
  |     Parse JSON response -> GaiaSource[]
  |
  +-- Store in CatalogCache (IndexedDB)
  |     TTL: 24 hours (star positions don't change)
  |
  +-- StarBufferBuilder.build(sources: GaiaSource[])
  |     For each source:
  |       position = raDecToCartesian(ra, dec, 100)
  |       color = bpRpToColor(bp_rp)       // Gaia's native color index
  |       size = magToSize(phot_g_mean_mag) // Fainter = smaller
  |     Output: { positions: Float32Array, colors: Float32Array, sizes: Float32Array }
  |
  v
DynamicStarField component receives typed arrays
  |
  +-- Create/update BufferGeometry attributes
  |     geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  |     geo.setAttribute('starColor', new Float32BufferAttribute(colors, 3))
  |     geo.setAttribute('size', new Float32BufferAttribute(sizes, 1))
  |     [Flag needsUpdate = true on attribute change]
  |
  +-- Render via ShaderMaterial (reuse existing star shaders)
  |     Points rendered at radius 100 on celestial sphere
  |     Additive blending + bloom post-processing
  |
  v
Stars visible in 3D scene around target position
```

### 2. SIAF Data to Footprint Rendering

```
Static SIAF JSON (built from pysiaf extraction)
  |
  v
siaf.ts loads and exposes:
  - WFI_SIAF: Array<SCAGeometry>
    - id: "WFI01" ... "WFI18"
    - v2Ref, v3Ref: arcseconds (telescope frame)
    - corners: 4x {v2, v3} in arcseconds
  - WFI_CENTER: { v2, v3 } (WFI_CEN reference point)
  - FPA_ROTATION: 60 degrees (FPA rotated from -V3)
  - BORESIGHT_OFFSET: 0.496 degrees (center from V frame origin)
  |
  v
WCSEngine.scaCornersToSky(target, pa):
  For each SCA corner {v2, v3}:
    1. Apply FPA rotation (60deg) to get ideal frame coords
    2. Convert V2V3 arcsec -> tangent plane coords relative to boresight
    3. Apply PA rotation for spacecraft orientation
    4. Inverse gnomonic projection: tangent plane -> RA/Dec
  Output: 18 sets of 4 corner RA/Dec positions
  |
  v
WFIFootprint renders corners as Line segments in 3D scene
  (Same pattern as current, but corners come from SIAF not grid math)
```

### 3. Focal Plane Projection (Stars onto Detectors)

```
useStarField provides GaiaSource[] for current field
  |
  v
FocalPlaneView receives sources + target + sunPosition
  |
  +-- WCSEngine.projectToFocalPlane(starRa, starDec, boresightRa, boresightDec, pa)
  |     1. Gnomonic (TAN) projection: star (ra,dec) -> (xi, eta) radians
  |     2. Convert to arcminutes
  |     3. Rotate by -PA to get focal plane coordinates
  |     Output: (fpX, fpY) in arcminutes from boresight
  |
  +-- For each projected star, test which SCA contains it:
  |     SIAFConfig provides detector bounds in focal plane coords
  |     Classify: star -> SCA assignment (or inter-detector gap)
  |
  +-- SVG renders:
  |     - 18 detector rectangles (from SIAF ideal-frame geometry)
  |     - Star positions as circles
  |     - Stars colored by Gaia bp_rp color index
  |     - SCA labels, boresight crosshair, N/E compass
  |
  v
Focal plane display shows queried Gaia stars on detector layout
```

## Patterns to Follow

### Pattern 1: Async Data Hook with Cache-First Strategy

**What:** React hook that manages async catalog queries with IndexedDB caching, loading states, and error handling. Always returns cached data immediately if available, then optionally refreshes.

**When:** Any component needs star catalog data for the current target.

**Example:**
```typescript
// src/hooks/useStarField.ts
interface UseStarFieldResult {
  stars: GaiaSource[] | null;
  loading: boolean;
  error: string | null;
  stale: boolean;  // true if showing cached data while refresh in progress
}

function useStarField(
  ra: number | null,
  dec: number | null,
  radiusDeg: number = 0.3
): UseStarFieldResult {
  const [stars, setStars] = useState<GaiaSource[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ra === null || dec === null) return;

    const controller = new AbortController();
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);

      // 1. Check cache first
      const cached = await catalogCache.get(ra!, dec!, radiusDeg);
      if (cached && !cancelled) {
        setStars(cached);
        setLoading(false);
        return;
      }

      // 2. Query Gaia
      try {
        const result = await catalogService.queryCone(
          ra!, dec!, radiusDeg, { signal: controller.signal }
        );
        if (!cancelled) {
          setStars(result);
          await catalogCache.put(ra!, dec!, radiusDeg, result);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; controller.abort(); };
  }, [ra, dec, radiusDeg]);

  return { stars, loading, error, stale: false };
}
```

### Pattern 2: Typed Array Bridge (API Data to GPU)

**What:** Convert API response arrays to GPU-ready Float32Arrays in a single pass, reusing buffer allocations when count is stable.

**When:** Star catalog data arrives and needs to be rendered in Three.js.

**Example:**
```typescript
// src/lib/star-buffer.ts
interface StarBuffers {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  count: number;
}

function buildStarBuffers(sources: GaiaSource[]): StarBuffers {
  const count = sources.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const { ra, dec, mag, bpRp } = sources[i];

    // Position on celestial sphere
    const pos = raDecToCartesian(ra, dec, 100);
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;

    // Color from Gaia BP-RP (bluer = negative, redder = positive)
    const color = bpRpToColor(bpRp);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    // Size inversely proportional to magnitude
    sizes[i] = Math.max(0.15, 2.5 - mag * 0.12);
  }

  return { positions, colors, sizes, count };
}
```

### Pattern 3: Static SIAF Config as Pre-Extracted JSON

**What:** Extract SIAF V2V3 reference positions and corner coordinates from pysiaf once, store as a static JSON file in the codebase. No runtime XML parsing. Update when SIAF version changes.

**When:** Any component needs detector geometry (footprint rendering, focal plane view, star-to-SCA assignment).

**Example:**
```typescript
// src/data/siaf.json (pre-extracted from pysiaf)
{
  "version": "2025.1",
  "fpaRotationDeg": 60,
  "boresightOffsetDeg": 0.496,
  "wfiCenter": { "v2": 1200.0, "v3": -1400.0 },
  "detectors": [
    {
      "id": "WFI01",
      "v2Ref": 1312.95,
      "v3Ref": -1040.79,
      "corners": {
        "v2": [1088.25, 1537.65, 1537.65, 1088.25],
        "v3": [-816.09, -816.09, -1265.49, -1265.49]
      }
    }
    // ... 17 more detectors
  ]
}
```

```typescript
// src/lib/siaf.ts
import siafData from '../data/siaf.json';

export interface SCAGeometry {
  id: string;
  v2Ref: number;  // arcseconds
  v3Ref: number;  // arcseconds
  corners: { v2: number[]; v3: number[] };  // 4 corners in arcseconds
}

export const WFI_SIAF: SCAGeometry[] = siafData.detectors;
export const FPA_ROTATION_DEG = siafData.fpaRotationDeg;
export const BORESIGHT_OFFSET_DEG = siafData.boresightOffsetDeg;
```

### Pattern 4: Gnomonic Projection with PA Rotation (WCS Engine)

**What:** Centralized WCS math module handling all coordinate transforms: gnomonic projection (sky to tangent plane), inverse gnomonic (tangent plane to sky), V2V3 to sky via boresight attitude, and position angle rotation.

**When:** Converting between sky coordinates and focal plane coordinates in either direction.

**Example:**
```typescript
// src/lib/wcs.ts — core projection functions

/**
 * Forward gnomonic (TAN) projection: sky (ra, dec) -> tangent plane (xi, eta)
 * Returns null if source is behind tangent point (cosC <= 0).
 * Output in radians.
 */
export function gnomonicProject(
  ra: number, dec: number,       // source, degrees
  ra0: number, dec0: number      // tangent point, degrees
): { xi: number; eta: number } | null {
  const toRad = Math.PI / 180;
  const cosDec = Math.cos(dec * toRad);
  const sinDec = Math.sin(dec * toRad);
  const cosDec0 = Math.cos(dec0 * toRad);
  const sinDec0 = Math.sin(dec0 * toRad);
  const dRa = (ra - ra0) * toRad;

  const cosC = sinDec0 * sinDec + cosDec0 * cosDec * Math.cos(dRa);
  if (cosC <= 0) return null;

  const xi = (cosDec * Math.sin(dRa)) / cosC;
  const eta = (cosDec0 * sinDec - sinDec0 * cosDec * Math.cos(dRa)) / cosC;

  return { xi, eta };
}

/**
 * Inverse gnomonic: tangent plane (xi, eta) -> sky (ra, dec)
 * Input in radians, output in degrees.
 */
export function gnomonicDeproject(
  xi: number, eta: number,       // tangent plane, radians
  ra0: number, dec0: number      // tangent point, degrees
): { ra: number; dec: number } {
  const toRad = Math.PI / 180;
  const cosDec0 = Math.cos(dec0 * toRad);
  const sinDec0 = Math.sin(dec0 * toRad);
  const rho = Math.sqrt(xi * xi + eta * eta);

  const c = Math.atan(rho);
  const cosC = Math.cos(c);
  const sinC = Math.sin(c);

  const dec = Math.asin(cosC * sinDec0 + (eta * sinC * cosDec0) / rho);
  const ra = ra0 * toRad + Math.atan2(
    xi * sinC,
    rho * cosDec0 * cosC - eta * sinDec0 * sinC
  );

  return {
    ra: ((ra / toRad) % 360 + 360) % 360,
    dec: dec / toRad,
  };
}

/**
 * Rotate tangent-plane coordinates by position angle.
 * PA measured east of north (standard astronomical convention).
 */
export function rotateByPA(
  xi: number, eta: number, paDeg: number
): { xi: number; eta: number } {
  const pa = paDeg * Math.PI / 180;
  return {
    xi: xi * Math.cos(pa) + eta * Math.sin(pa),
    eta: -xi * Math.sin(pa) + eta * Math.cos(pa),
  };
}
```

### Pattern 5: Dynamic Buffer Update in Three.js (No Geometry Recreation)

**What:** When star catalog data changes, update existing BufferGeometry attributes in place rather than recreating the geometry. Set `needsUpdate = true` on each attribute.

**When:** New catalog query results arrive for a different target.

**Example:**
```typescript
// In DynamicStarField component
useEffect(() => {
  if (!buffers || !geometryRef.current) return;

  const geo = geometryRef.current;
  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;

  if (posAttr && posAttr.count === buffers.count) {
    // Same size: update in place
    posAttr.set(buffers.positions);
    posAttr.needsUpdate = true;
    // ... same for color, size
  } else {
    // Different size: replace attributes
    geo.setAttribute('position',
      new THREE.Float32BufferAttribute(buffers.positions, 3));
    geo.setAttribute('starColor',
      new THREE.Float32BufferAttribute(buffers.colors, 3));
    geo.setAttribute('size',
      new THREE.Float32BufferAttribute(buffers.sizes, 1));
  }

  geo.computeBoundingSphere();
}, [buffers]);
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Recreating Geometry on Every Render
**What:** Creating new `BufferGeometry` and `Float32Array` allocations each frame or on each prop change.
**Why bad:** Causes GC pressure, GPU buffer thrashing, and frame drops. Three.js must re-upload buffers to GPU every time.
**Instead:** Allocate typed arrays once at max expected size. Update in place with `needsUpdate = true`. Use `drawRange` to limit rendering if count changes.

### Anti-Pattern 2: Parsing SIAF XML at Runtime
**What:** Bundling the 200KB+ `roman_siaf.xml` and parsing it in the browser.
**Why bad:** XML parsing is slow, increases bundle size, and the data never changes at runtime. Browser XML parsers are not optimized for this.
**Instead:** Pre-extract the 18 detector positions and corners from pysiaf into a minimal JSON file (~5KB). Include a script in the repo that regenerates it from pysiaf when SIAF updates.

### Anti-Pattern 3: Unbounded Gaia Queries
**What:** Querying all Gaia sources in a large radius without magnitude limits.
**Why bad:** Gaia DR3 has ~1.8 billion sources. A 1-degree cone near the Galactic plane can return millions of rows, overwhelming the browser and the TAP service.
**Instead:** Always apply `phot_g_mean_mag < 18` (or tighter) and `TOP 2000` limits. For dense fields, tighten the magnitude limit dynamically. The WFI FOV is ~0.28 deg^2, so a 0.3-degree radius cone search is appropriate.

### Anti-Pattern 4: SVG for Thousands of Stars
**What:** Rendering each queried Gaia star as an SVG `<circle>` element in the focal plane view.
**Why bad:** SVG DOM performance degrades rapidly above ~1000 elements. With 2000 stars, the focal plane view becomes sluggish.
**Instead:** Use Canvas 2D for star rendering in the focal plane view, with SVG only for the 18 detector outlines and labels. Alternatively, keep SVG but limit displayed stars to brightest ~200 in the focal plane panel (it is a small HUD element, not the main visualization).

### Anti-Pattern 5: Separate Coordinate Transform Implementations
**What:** Having gnomonic projection code in `coordinates.ts`, `FocalPlaneView.tsx`, and `WFIFootprint.tsx` independently.
**Why bad:** The current codebase already has three different places doing variants of the same projection math. Bugs in one copy won't be caught in others.
**Instead:** Centralize all WCS math in `src/lib/wcs.ts`. The `FocalPlaneView` and `WFIFootprint` should both call `wcs.gnomonicProject()` and `wcs.rotateByPA()`.

## Rendering Strategy: Layered Approach

### Recommendation: Three.js for Stars, SVG for Footprint Annotations

Use the existing Three.js scene for the primary star field (both bundled bright stars and queried Gaia stars). Layer the WFI footprint detector outlines in the same Three.js scene as `Line` components (as currently done). Use SVG only in the focal plane HUD panel.

**Why not a separate SVG/Canvas overlay on the 3D scene?**
- The 3D scene has camera controls (orbit, zoom). An SVG overlay would need to track the Three.js camera projection matrix every frame to keep footprint outlines aligned with the star field. This is fragile and doubles the projection math.
- The existing approach of rendering footprints as `Line` segments inside the Three.js scene graph avoids this problem entirely -- they transform with the camera automatically.
- Three.js `Points` with custom shaders handle 2000+ stars at 60fps trivially.

**Focal Plane View (HUD panel):**
- Keep SVG for the 18 detector rectangles, labels, and compass (simple geometry, needs text rendering).
- Limit projected stars to brightest ~300 or switch the star layer to a small Canvas 2D element if performance is an issue with 2000 SVG circles.

### Rendering Layer Stack

```
[Three.js Canvas - full viewport]
  |-- Static bright stars (bundled HYG catalog, ~1000 points)
  |-- Dynamic queried stars (Gaia, ~500-2000 points)
  |-- Coordinate grid (Line segments)
  |-- Galactic plane (Line)
  |-- WFI footprint outlines (18 SCA rectangles as Line)
  |-- Selection indicator
  |-- Exclusion zones (GLSL shaders on sphere)
  |-- Field of regard (GLSL shaders)
  |-- Post-processing (Bloom, Vignette)

[HTML/CSS overlay - positioned over canvas]
  |-- Focal Plane View (SVG, top-left HUD)
  |-- Coordinate Display (HTML, bottom-left)
  |-- Sidebar (HTML, right side)
  |-- Header (HTML, top)
  |-- Timeline (HTML, bottom)
```

## Where SIAF Data Fits: Static Config vs Computed

**Static config (JSON, bundled):**
- V2Ref, V3Ref for all 18 SCAs (detector reference points in telescope frame)
- Corner coordinates in V2V3 (4 corners per SCA)
- FPA rotation angle (60 degrees)
- Boresight offset (0.496 degrees)
- Detector pixel dimensions (4088x4088 active)
- Pixel scale (0.11 arcsec/pixel)

**Computed at runtime:**
- Sky coordinates (RA/Dec) of each SCA corner for a given pointing + PA (from V2V3 via gnomonic deprojection)
- Position angle (from target + Sun position + epoch)
- Star-to-SCA assignment (which stars fall on which detector)
- Focal plane projection of catalog stars

**Why static:** The SIAF defines the physical instrument geometry, which does not change between observations. Only the mapping from instrument frame to sky frame changes with pointing and roll angle. Pre-extracting the SIAF into JSON avoids any runtime dependency on pysiaf (a Python package) and keeps the bundle small.

**SIAF extraction workflow:**
```
pysiaf (Python) --> extraction script --> src/data/siaf.json --> bundled
                                          |
                    Run once, or when SIAF version updates
                    Script lives in: scripts/extract-siaf.py
```

The actual SCA numbering is NOT a simple row-major grid. The real layout from official documentation:
```
Top row:    WFI09  WFI06  WFI03  WFI12  WFI15  WFI18
Middle row: WFI08  WFI05  WFI02  WFI11  WFI14  WFI17
Bottom row: WFI07  WFI04  WFI01  WFI10  WFI13  WFI16
```

The current `wfi_geometry.json` uses a simple sequential SCA01-SCA18 numbering with row/col indices that do not match the real SIAF layout. This must be replaced with SIAF-sourced data.

## Caching Strategy for Star Catalog Queries

### IndexedDB Cache Design

```
Database: "romanview-catalog-cache"
Object Store: "gaia_queries"

Key: "{ra_rounded}_{dec_rounded}_{radius}" (e.g., "83.63_-5.38_0.30")
Value: {
  sources: GaiaSource[],  // The query results
  timestamp: number,       // When cached
  queryCenter: { ra, dec },
  queryRadius: number,
  sourceCount: number
}
```

**Cache key rounding:** Round RA/Dec to 2 decimal places (~36 arcsec precision). This means slightly different pointings within ~36 arcsec will share cached results. Since the query radius (0.3 deg = 1080 arcsec) vastly exceeds this rounding, the overlap is negligible.

**TTL:** 24 hours. Gaia DR3 positions are fixed catalog data; they will not change. The TTL is only to prevent unbounded storage growth.

**Max entries:** Cap at ~50 cached fields. LRU eviction when full.

**Cache hit strategy:**
1. Check if requested field has a cache entry within the rounding tolerance.
2. If hit and not expired: return cached data, skip network.
3. If miss: query TAP, cache result, return.
4. If query fails: return stale cache if available, surface error.

**Why IndexedDB, not localStorage:**
- localStorage has a ~5MB limit per origin and stores strings only (JSON serialization overhead).
- IndexedDB can store structured data efficiently, handles ~50MB+ easily, and supports async reads (won't block the main thread).
- A single cached field with 2000 sources is ~100KB as JSON. 50 cached fields = ~5MB, well within IndexedDB capacity but at localStorage's limit.

**Why not Cache API / Service Worker:**
- Cache API is designed for HTTP request/response pairs. We transform the TAP response before caching (parse JSON, extract sources). IndexedDB stores the processed data directly.
- No need for offline-first; the app requires network access for new queries. Cache is purely a performance optimization to avoid re-fetching the same field.

## Scalability Considerations

| Concern | At 100 sources | At 2,000 sources | At 10,000 sources |
|---------|---------------|-------------------|-------------------|
| TAP query time | <500ms | 1-3 seconds | 5-10 seconds (avoid) |
| GPU buffer upload | Instant | ~1ms | ~5ms |
| Three.js render | No impact | No impact | Slight bloom cost |
| SVG focal plane | Fine | 300 max displayed | Canvas required |
| IndexedDB read | ~5ms | ~10ms | ~20ms |
| Memory (Float32Arrays) | 4KB | 80KB | 400KB |

**Practical target:** 500-2000 sources per field. Use `TOP 2000` in ADQL and `phot_g_mean_mag < 18`. For dense galactic plane fields, tighten to `mag < 15` and query fewer.

## Suggested Build Order (Dependencies)

Build order follows the dependency chain: foundational data layers first, then computation, then visualization, then integration.

### Phase 1: SIAF Foundation + WCS Engine
**Build:** `siaf.json`, `siaf.ts`, `wcs.ts`
**Rationale:** Everything else depends on correct coordinate transforms. The SIAF data is the single source of truth for detector geometry. The WCS engine centralizes projection math that is currently scattered.
**Depends on:** pysiaf extraction script (one-time, can be done manually first)
**Validates:** Correct detector corner positions, gnomonic projection accuracy

### Phase 2: Catalog Query Layer + Cache
**Build:** `catalog-service.ts`, `catalog-cache.ts`, `useStarField.ts`
**Rationale:** Independent of visualization. Can be tested with console output or simple lists. Must handle network errors, AbortController for cancelled queries, and IndexedDB setup.
**Depends on:** Nothing from Phase 1 (uses existing RA/Dec, not SIAF)
**Validates:** Gaia TAP queries work from browser, cache hit/miss behavior, error handling

### Phase 3: Star Rendering Pipeline
**Build:** `star-buffer.ts`, `DynamicStarField.tsx`
**Rationale:** Connects Phase 2 output to Three.js. Reuses existing shader patterns from `StarField.tsx`.
**Depends on:** Phase 2 (useStarField provides data), existing Three.js scene structure
**Validates:** Queried stars appear at correct positions in 3D scene, visual quality matches bundled stars

### Phase 4: Precise Footprint + Evolved Focal Plane
**Build:** Evolve `WFIFootprint.tsx` to use SIAF data, evolve `FocalPlaneView.tsx` to use queried stars + SIAF geometry
**Rationale:** Replaces the approximated grid layout with SIAF-accurate detector positions. Projects Gaia stars onto detectors.
**Depends on:** Phase 1 (SIAF + WCS), Phase 2 (queried stars), Phase 3 (rendering works)
**Validates:** Detector outlines match official SIAF positions, stars project correctly onto focal plane

### Phase 5: Integration + SkyView
**Build:** `SkyView.tsx` composite, PA controls, loading/error states in UI
**Rationale:** Wires everything together. Adds user-facing polish: loading indicators during queries, error messages for network failures, adjustable PA slider.
**Depends on:** All previous phases
**Validates:** End-to-end flow: select target, see stars load, see footprint overlay, see focal plane with real sources

### Dependency Graph

```
Phase 1 (SIAF + WCS) ----+
                          |
Phase 2 (Catalog + Cache) +---> Phase 4 (Footprint + FP View)
                          |              |
Phase 3 (Star Rendering) -+             v
                                  Phase 5 (Integration)
```

Phases 1 and 2 are independent and can be built in parallel. Phase 3 depends on Phase 2. Phase 4 depends on Phases 1, 2, and 3. Phase 5 depends on all.

## Sources

- [PySIAF for Roman - STScI Documentation](https://roman-docs.stsci.edu/simulation-tools-handbook-home/simulation-development-utilities/pysiaf-for-roman) - SIAF aperture structure, coordinate systems, V2V3 reference data (HIGH confidence)
- [Roman WFI Coordinate Systems - STScI](https://roman-docs.stsci.edu/data-handbook-home/wfi-data-format/coordinate-systems) - V2V3 frame, 60-degree FPA rotation, tangent plane projection per SCA (HIGH confidence)
- [Description of the WFI - STScI](https://roman-docs.stsci.edu/roman-instruments-home/wfi-imaging-mode-user-guide/wfi-design/description-of-the-wfi) - Detector numbering layout, FOV, pixel scale (HIGH confidence)
- [WFI Quick Reference - STScI](https://roman-docs.stsci.edu/roman-instruments/the-wide-field-instrument/observing-with-the-wfi/wfi-quick-reference) - Numerical specifications: 0.11"/px, 4088x4088 active, 0.281 sq deg (HIGH confidence)
- [WFI Technical - NASA GSFC](https://roman.gsfc.nasa.gov/science/WFI_technical.html) - FOV dimensions, detector specs (HIGH confidence)
- [pysiaf GitHub - spacetelescope](https://github.com/spacetelescope/pysiaf) - Source for SIAF XML data extraction (HIGH confidence)
- [Gaia Archive Programmatic Access - ESA](https://www.cosmos.esa.int/web/gaia-users/archive/programmatic-access) - TAP endpoint, sync query format, JSON output (HIGH confidence)
- [TAPVizieR - CDS](https://tapvizier.cds.unistra.fr/TAPVizieR/tap) - Alternative TAP endpoint used by existing vizier.ts stub (HIGH confidence)
- [Aladin Lite - CDS](https://github.com/cds-astro/aladin-lite) - Confirms CDS services are CORS-friendly for browser access (HIGH confidence)
- [Astropy Gnomonic Projection](https://docs.astropy.org/en/stable/api/astropy.modeling.projections.Sky2Pix_Gnomonic.html) - Reference for TAN projection math (HIGH confidence)
- [SVG vs Canvas vs WebGL Performance](https://www.svggenie.com/blog/svg-vs-canvas-vs-webgl-performance-2025) - Rendering technology comparison (MEDIUM confidence)
- [React Three Fiber Scaling Performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance) - GPU buffer update patterns (MEDIUM confidence)

---

*Architecture analysis: 2026-03-19*
