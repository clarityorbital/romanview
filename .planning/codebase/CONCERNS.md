# Codebase Concerns

**Analysis Date:** 2026-03-19

## Tech Debt

**SIMBAD/CDS API Dependency:**
- Issue: The application relies on two external APIs (`sesameResolve` and `gaiaConSearch`) hosted at CDS (Centre de Données astronomiques de Strasbourg) without fallback mechanisms. These services may experience outages or rate limiting.
- Files: `src/lib/simbad.ts`, `src/lib/vizier.ts`, `src/components/ui/TargetSearch.tsx`
- Impact: Users cannot search for targets if CDS services are unavailable; no graceful degradation strategy.
- Fix approach: Implement local fallback catalog, add request timeouts, implement exponential backoff for retries, cache previous search results in localStorage.

**XML Parsing Without Validation:**
- Issue: `sesameResolve()` in `src/lib/simbad.ts` uses `DOMParser` to parse XML responses without validating the structure before accessing nested elements.
- Files: `src/lib/simbad.ts` (lines 46-50)
- Impact: Malformed or unexpected XML responses could cause `null` reference access; error handling silently returns `null` which obscures underlying API issues.
- Fix approach: Add explicit schema validation before parsing; wrap parser in try-catch with more specific error logging.

**No Input Validation for Coordinate Entry:**
- Issue: Manual RA/Dec entry in `TargetSearch.tsx` (lines 133-150) only validates via `parseFloat()` and `isNaN()` checks. No range validation (RA should be 0-360°, Dec should be -90 to +90°).
- Files: `src/components/ui/TargetSearch.tsx` (lines 56-65)
- Impact: Invalid coordinates (RA > 360°, Dec > 90°) can be added; later calculations may produce NaN or undefined behavior.
- Fix approach: Add explicit range validation before calling `onAddTarget()`.

**Unsanitized SIMBAD Query String:**
- Issue: The `resolveName()` function in `src/lib/simbad.ts` constructs an ADQL query with user input. While `sanitize()` blocks some characters, it's not robust against all ADQL injection patterns.
- Files: `src/lib/simbad.ts` (lines 8-9, 65-67)
- Impact: Potential for ADQL injection attacks or unexpected query behavior; currently unused but present as technical debt.
- Fix approach: Use parameterized queries (if ADQL supports them) or more comprehensive sanitization; prefer the simpler `sesameResolve()` endpoint.

## Known Bugs

**Epoch Dependency Not Fully Reactive:**
- Issue: In `src/hooks/useEphemeris.ts` (lines 7-9), the `sunPosition` memoization depends on `epoch.getTime()` within the dependency array, but the logic relies on comparing date objects by reference.
- Files: `src/hooks/useEphemeris.ts` (line 9)
- Impact: If `epoch` changes but `getTime()` returns the same value (e.g., due to millisecond precision loss), the Sun position won't update. Conversely, multiple rapid updates to the same date may cause unnecessary recalculations.
- Fix approach: Ensure memoization is keyed directly on `epoch.getTime()` as a number.

**High-Latitude Astrophysics Coordinate Singularity:**
- Issue: In `src/lib/roman.ts` and WFI calculations, the position angle computation in `src/lib/coordinates.ts` (lines 93-110) uses standard position angle formulation, which can have numerical instability when targets are very close to the ecliptic poles.
- Files: `src/lib/coordinates.ts` (lines 104-105), `src/components/ui/FocalPlaneView.tsx` (line 54)
- Impact: For targets near the celestial poles, the PA may be poorly defined or exhibit jumps; the focal plane projection also uses `cosDec > 0.01` guard but this is a soft threshold.
- Fix approach: Add explicit pole-handling logic; consider using alternative projection near poles; add warnings in UI for high-latitude observations.

**Star Catalog Static Data Without Validation:**
- Issue: The bright star catalog (`src/data/hyg_bright.json`) is loaded as raw JSON without schema validation.
- Files: `src/lib/catalog.ts` (line 1)
- Impact: If the catalog file is corrupted or has unexpected structure, the rendering will fail silently or produce visual artifacts.
- Fix approach: Add runtime schema validation using Zod (already a dependency in another project) or simple array length checks.

**Debounce Cleanup Not Guaranteed:**
- Issue: In `src/components/ui/TargetSearch.tsx`, the debounce cleanup relies on the return function of `useEffect` (line 53). If the component unmounts during a debounced callback, the callback might still fire.
- Files: `src/components/ui/TargetSearch.tsx` (lines 45-54)
- Impact: Race condition where search results appear after target is removed; unlikely but possible with fast user interactions.
- Fix approach: Store a ref to track if component is still mounted; use a more robust debounce library.

## Security Considerations

**External API Endpoint Hardcoding:**
- Risk: CDS endpoints are hardcoded in source code without any authentication. If endpoints move or change, the application breaks.
- Files: `src/lib/simbad.ts` (lines 19, 40), `src/lib/vizier.ts` (line 24)
- Current mitigation: None; endpoints are public APIs.
- Recommendations: Store endpoint URLs in environment variables; add a config layer for easy updates; consider implementing a wrapper API to control/monitor access.

**No CORS Handling:**
- Risk: SIMBAD/CDS endpoints are being called directly from the browser. If CORS is restrictive, requests fail silently.
- Files: `src/lib/simbad.ts`, `src/lib/vizier.ts`
- Current mitigation: External services appear to support CORS; no explicit handling.
- Recommendations: Add explicit error handling for CORS failures; provide user feedback if cross-origin requests are blocked.

**localStorage Data Integrity:**
- Risk: Target list is persisted to `localStorage` without encryption or validation. User can modify stored targets via browser dev tools.
- Files: `src/hooks/useTargets.ts` (lines 11-24)
- Current mitigation: None; targets are trusted data.
- Recommendations: For production, consider encrypting localStorage or moving to IndexedDB with validation; currently acceptable if used internally only.

## Performance Bottlenecks

**Star Catalog Brute-Force Filtering:**
- Problem: In `src/components/ui/FocalPlaneView.tsx` (lines 96-119), every frame renders all projected stars by iterating through the entire `getRawStars()` array and filtering with simple distance checks.
- Files: `src/components/ui/FocalPlaneView.tsx` (lines 100-106)
- Cause: No spatial indexing (e.g., KD-tree) or pre-culling; O(n) per render for thousands of stars.
- Improvement path: Pre-build a spatial index when catalog loads; cache filtered results by target RA/Dec; implement viewport-based culling.

**Observability Timeline Recalculation Frequency:**
- Problem: `ObservabilityTimeline` recalculates observability windows for all targets every time targets or epoch changes. With many targets and 12-month windows at 2-day granularity (~180 points per target), this is expensive.
- Files: `src/components/ui/ObservabilityTimeline.tsx` (lines 35-40)
- Cause: No memoization or chunking of computation; linear in number of targets and days.
- Improvement path: Memoize windows by target ID and date range; implement incremental updates only when epoch changes; consider web worker for heavy calculations.

**Three.js Scene Complexity Unbounded:**
- Problem: The celestial scene renders all stars, grid lines, and constraint zones simultaneously. With 3D rendering at potentially high device pixel ratio (`dpr={[1, 2]}`), GPU usage can spike.
- Files: `src/components/scene/CelestialScene.tsx` (line 57)
- Cause: No LOD (level-of-detail) or frustum culling; all geometries are always active.
- Improvement path: Add dynamic LOD based on zoom level; implement frustum culling for grid lines; throttle postprocessing effects at lower zoom.

**Redundant Sun Position Computation:**
- Problem: Sun position is computed in both `useEphemeris` hook and passed to multiple child components which may independently recalculate it.
- Files: `src/hooks/useEphemeris.ts`, `src/App.tsx` (lines 44-56)
- Cause: `getSunPosition()` is not expensive, but computed multiple times for the same epoch.
- Improvement path: Centralize in app context; memoize at the top level; ensure all uses reference the same computed value.

## Fragile Areas

**Position Angle Calculation at Poles:**
- Files: `src/lib/coordinates.ts` (lines 93-110)
- Why fragile: The position angle becomes undefined when target is at celestial pole or when Sun is directly north/south. The current implementation uses `atan2()` which handles some degenerate cases but not all.
- Safe modification: Add explicit pole detection (dec > 85° or < -85°); fall back to default PA (0°) or emit a warning; test with synthetic polar targets.
- Test coverage: No unit tests for coordinate math; edge cases are not validated.

**Focal Plane Projection Edge Cases:**
- Files: `src/components/ui/FocalPlaneView.tsx` (lines 24-62)
- Why fragile: Gnomonic projection fails for targets on the tangent point's horizon (cosC <= 0). The check at line 44 returns null, but downstream code in lines 108-109 silently skips these stars. For targets very close to the celestial pole, the projection distortion is severe.
- Safe modification: Add unit test with synthetic targets at various declinations; validate that projection is mathematically correct for the focal plane orientation; add warnings in UI for high-latitude targets.
- Test coverage: No tests for focal plane math; projection behavior is only visually validated.

**ExclusionZones Constraint Shader:**
- Files: `src/components/scene/ExclusionZones.tsx` (presumed; need to verify)
- Why fragile: Custom GLSL shader for exclusion zones is not tested; if Sun position is NaN or Inf, the shader produces undefined behavior.
- Safe modification: Validate Sun position is finite before passing to shader; add fallback if shader compilation fails; test with edge-case Sun positions (poles, anti-poles).
- Test coverage: No unit tests for shader logic; visual validation only.

**Target List Selection State Persistence:**
- Files: `src/hooks/useTargets.ts` (lines 26-28)
- Why fragile: `selectedTargetId` is stored in component state but targets are persisted to localStorage. If user has target A selected, closes browser, then manually edits localStorage to delete target A, the selectedTargetId becomes stale.
- Safe modification: On load, validate that `selectedTargetId` exists in loaded targets; fall back to first target or null if not found.
- Test coverage: No integration tests for localStorage/state consistency.

## Scaling Limits

**Catalog Size:**
- Current capacity: The bright star catalog (`hyg_bright.json`) likely contains ~10k stars based on typical bright catalogs.
- Limit: If expanded to full Gaia DR3 (billions of sources), the client-side filtering at render time becomes unusable; the entire catalog cannot fit in browser memory.
- Scaling path: Implement server-side catalog query (cone search with radius limit); pre-process catalog into spatial tiles; use WebAssembly for fast local filtering.

**Target List:**
- Current capacity: Targets are stored in localStorage; typical storage limit is 5-10MB. A target is ~200 bytes, so ~25k-50k targets are theoretically possible.
- Limit: Storing >1000 targets causes noticeable slowdown in UI rendering (ObservabilityTimeline recalculates for all targets).
- Scaling path: Implement pagination or lazy loading; move to IndexedDB; implement server-side target storage.

**Observability Window Computation:**
- Current capacity: 12-month windows at 2-day granularity = 180 points per target; with 10 targets this is 1800 calculations per render.
- Limit: Increasing to 1-day granularity or adding many targets causes frame rate drops; no throttling or worker thread.
- Scaling path: Implement web worker; batch calculations; use memoization with selective invalidation; pre-compute windows server-side.

## Dependencies at Risk

**astronomy-engine (v2.1.19):**
- Risk: This dependency provides `Body.Sun`, `Equator()`, and other astronomical calculations. If unmaintained, security updates may lag.
- Impact: Incorrect solar ephemeris would cause constraint calculations to be wrong; contract depends on accuracy.
- Migration plan: Identify alternative (e.g., astrojs/astronomy or SkySafari API); create adapter layer; validate output consistency during migration.

**Three.js (v0.183.2):**
- Risk: Major dependency for 3D rendering; version is not pinned to exact patch level in package.json (uses caret `^`).
- Impact: Minor version bumps could introduce rendering bugs or breaking changes; no automated testing for visual correctness.
- Migration plan: Pin major version; add visual regression tests (screenshot comparison); evaluate WebGL alternatives (Babylon.js, Cesium) if Three.js becomes problematic.

**React Three Fiber & Drei (v9.5.0 and v10.7.7):**
- Risk: Experimental integrations; API surface is large and frequently evolving.
- Impact: Component incompatibilities; prop changes require source updates.
- Migration plan: Monitor release notes; test minor upgrades in CI before merging; maintain abstraction layer for 3D components to ease future replacements.

## Missing Critical Features

**No Offline Support:**
- Problem: The application requires internet connectivity to resolve target names via SIMBAD and to compute ephemeris (though `astronomy-engine` is local, it's not offline-ready).
- Blocks: Users on intermittent connections cannot work reliably; cannot plan observations without network.
- Recommendations: Implement offline mode with cached star catalog and pre-computed ephemeris data; use service workers for HTTP caching; bundle coarse ephemeris data locally.

**No Export/Import of Observation Plans:**
- Problem: Targets are stored only in localStorage; no way to export a list or import from external sources (e.g., CSV, JSON).
- Blocks: Users cannot easily share observation plans or version-control them; switching browsers loses data.
- Recommendations: Add export to CSV/JSON; add import from file; consider cloud sync (simple REST backend).

**No Observability Prediction Beyond One Year:**
- Problem: `computeObservabilityWindows()` is called over a 12-month sliding window. Requests for multi-year planning are not supported.
- Blocks: Long-term survey planning requires manual extrapolation.
- Recommendations: Extend window to support 2-5 year predictions; optimize computation (consider using analytical approximations for long timescales).

## Test Coverage Gaps

**Coordinate Transformations:**
- What's not tested: RA/Dec to Cartesian, angular separation, position angle, gnomonic projection.
- Files: `src/lib/coordinates.ts`, `src/components/ui/FocalPlaneView.tsx`
- Risk: Bugs in these functions propagate to all spatial calculations; edge cases (poles, large separations) are not validated.
- Priority: High

**Constraint Checking:**
- What's not tested: `checkObservability()`, `computeObservabilityWindows()` with various date ranges and target positions.
- Files: `src/lib/constraints.ts`
- Risk: Observability calculations are core to mission planning; errors directly impact scientific decisions.
- Priority: High

**External API Integration:**
- What's not tested: `sesameResolve()`, `gaiaConSearch()` error handling, timeouts, malformed responses.
- Files: `src/lib/simbad.ts`, `src/lib/vizier.ts`, `src/components/ui/TargetSearch.tsx`
- Risk: Silent failures or race conditions in network calls; no way to verify behavior without live API access.
- Priority: Medium (recommend mocking)

**User Interactions:**
- What's not tested: Target search, target list updates, epoch slider changes, focal plane view rendering.
- Files: `src/components/ui/TargetSearch.tsx`, `src/components/ui/TargetList.tsx`, `src/components/ui/EpochSlider.tsx`, `src/components/ui/FocalPlaneView.tsx`
- Risk: UI bugs go undetected until user reports; prop drilling and state management are not validated.
- Priority: Medium

**Three.js Scene Rendering:**
- What's not tested: Scene initialization, camera controls, star field visibility, exclusion zone visualization, focal plane footprint rendering.
- Files: `src/components/scene/CelestialScene.tsx` and all subcomponents.
- Risk: Visual correctness is not validated; shader errors or geometry issues are only caught by manual testing.
- Priority: Medium (recommend visual snapshot tests)

---

*Concerns audit: 2026-03-19*
