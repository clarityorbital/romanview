---
phase: 01-siaf-geometry-and-wcs-engine
plan: 02
subsystem: geometry
tags: [siaf, wcs, v2v3, focal-plane, position-angle, gnomonic, wfi-footprint]

# Dependency graph
requires:
  - phase: 01-siaf-geometry-and-wcs-engine
    provides: "siaf.ts accessors and wcs.ts projection engine (Plan 01)"
provides:
  - "roman.ts: SIAF-derived WFI_DETECTORS with V2V3 positions and corners"
  - "roman.ts: WFI_BORESIGHT, TOTAL_FOV_ARCMIN/DEG computed from SIAF extents"
  - "WFIFootprint.tsx: Sky view with SIAF V2V3 corners projected via v2v3ToSky"
  - "FocalPlaneView.tsx: Focal plane using skyToFocalPlane with corrected APA display"
  - "No local projection code in any component -- all goes through wcs.ts"
affects: [01-03, 02-vizier-catalog-integration, 03-observation-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns: [SIAF-derived detector layout, V2V3 polygon rendering, APA = V3PA + 60 convention, cos(dec) star pre-filter]

key-files:
  created: []
  modified:
    - src/lib/roman.ts
    - src/components/scene/WFIFootprint.tsx
    - src/components/ui/FocalPlaneView.tsx

key-decisions:
  - "Kept TOTAL_FOV_ARCMIN/DEG exports computed from SIAF corners for InstrumentPanel compatibility"
  - "Detectors rendered as SVG polygons (not rectangles) since SIAF corners are not axis-aligned"
  - "Star projection sign convention: negate skyToFocalPlane x/y to map from tangent-plane (xi/eta) to V2V3 SVG coordinates"

patterns-established:
  - "SIAF data access: Components use roman.ts WFI_DETECTORS/WFI_BORESIGHT, never raw SIAF JSON"
  - "Projection: All sky/focal-plane transforms go through wcs.ts functions only"
  - "PA convention: V3PA from positionAngle(), APA = V3PA - FPA_ROTATION_DEG for display"
  - "SVG focal plane: V2 horizontal, -V3 vertical (SVG Y inversion)"

requirements-completed: [FOOT-01, FOOT-02, FOOT-03, FOOT-04]

# Metrics
duration: 3min
completed: 2026-03-19
---

# Phase 1 Plan 02: SIAF Geometry and WCS Engine -- Component Rewiring Summary

**Rewired WFI sky footprint and focal plane view to use SIAF V2V3 positions through centralized WCS engine, fixing 60-degree PA error and high-declination star filter bug**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-19T20:14:10Z
- **Completed:** 2026-03-19T20:17:49Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Replaced grid-based detector layout in roman.ts with SIAF-derived V2V3 positions and corners
- WFIFootprint.tsx now projects 18 detector V2V3 corners to sky RA/Dec via v2v3ToSky (no local projection)
- FocalPlaneView.tsx uses skyToFocalPlane from wcs.ts for star projection and renders detectors as SIAF polygons
- Fixed critical PA chain: focal plane header now shows APA (V3PA + 60 degrees) instead of raw V3PA
- Fixed high-declination star pre-filter bug with proper cos(dec) threshold scaling
- N/E compass in focal plane uses rotateByPA from wcs.ts for correct orientation
- SVG viewBox dynamically computed from SIAF detector corner extents
- All detector labels now show WFI01-WFI18 (no SCA references remain)
- Zero local projection code in any component -- all math goes through wcs.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewire roman.ts and WFIFootprint.tsx with SIAF data** - `5908f59` (feat) - SIAF-derived detectors, v2v3ToSky sky projection
2. **Task 2: Rewire FocalPlaneView.tsx with WCS engine and fix PA chain** - `a0888e8` (feat) - skyToFocalPlane, APA display, cos(dec) fix, compass fix

## Files Created/Modified
- `src/lib/roman.ts` - SIAF-derived WFI_DETECTORS, WFI_BORESIGHT, dynamic FOV computation (replaces grid-based layout)
- `src/components/scene/WFIFootprint.tsx` - Sky view footprint using v2v3ToSky for SIAF corner projection
- `src/components/ui/FocalPlaneView.tsx` - Focal plane using skyToFocalPlane, SIAF polygon rendering, corrected APA display

## Decisions Made
- Kept TOTAL_FOV_ARCMIN and TOTAL_FOV_DEG exports (computed from SIAF corner extents) because InstrumentPanel.tsx depends on them for its stats display. This avoids a cascading change to a component not in this plan's scope.
- Rendered detectors as SVG polygons rather than rectangles because SIAF corners are rotated ~60 degrees from axis-aligned, making axis-aligned rectangles incorrect.
- Star coordinates from skyToFocalPlane need sign negation (-x, -y) to convert from tangent-plane convention (xi East, eta North) to V2V3 SVG convention (V2 positive right, V3 positive up with SVG inversion).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Preserved TOTAL_FOV_ARCMIN/DEG and PIXELS_PER_DETECTOR exports**
- **Found during:** Task 1 (roman.ts rewrite)
- **Issue:** Plan said to remove TOTAL_FOV_ARCMIN, TOTAL_FOV_DEG, and PIXELS_PER_DETECTOR from roman.ts, but InstrumentPanel.tsx imports and displays these values
- **Fix:** Kept these exports but recomputed TOTAL_FOV_ARCMIN/DEG from SIAF corner extents instead of the old grid formula. Kept PIXELS_PER_DETECTOR as static 4096.
- **Files modified:** src/lib/roman.ts
- **Verification:** InstrumentPanel.tsx compiles without changes, all imports resolve
- **Committed in:** 5908f59 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking issue)
**Impact on plan:** Necessary to avoid breaking InstrumentPanel. FOV values are now SIAF-accurate instead of grid-approximate. No scope creep.

## Issues Encountered
None -- all code compiled cleanly and all 21 existing tests passed throughout execution.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All WFI visualization components now use SIAF data through wcs.ts
- No local projection code remains in any component
- Ready for Plan 03 (remaining phase tasks or verification)
- wfi_geometry.json is no longer imported but file still exists on disk (can be cleaned up in a future task)

## Self-Check: PASSED

All 3 modified files verified on disk. Both task commits (5908f59, a0888e8) verified in git log.

---
*Phase: 01-siaf-geometry-and-wcs-engine*
*Completed: 2026-03-19*
