---
phase: 02-live-sky-data
plan: 02
subsystem: ui
tags: [gaia-stars, three-js, focal-plane, hms-dms, coordinate-display, density-indicator, react-props]

# Dependency graph
requires:
  - phase: 02-live-sky-data
    plan: 01
    provides: useGaiaStars hook, parseCoords, formatRaDeg/formatDecDeg, fixed VizieR TAP queries
  - phase: 01-siaf-geometry
    provides: WCS engine (skyToFocalPlane), SIAF detector data, CelestialScene structure
provides:
  - useGaiaStars wired in App.tsx with prop threading to CelestialScene and FocalPlaneView
  - HMS/DMS coordinate input via parseCoords in TargetSearch manual mode
  - Dual-format coordinate display (HMS/DMS + decimal degrees) in CoordinateDisplay
  - GaiaStarLayer Three.js Points component for blue Gaia star overlay in 3D sky
  - Gaia star projection in FocalPlaneView SVG (replaced HYG catalog)
  - Density indicator in FocalPlaneView footer (count, mag limit, dense/loading/error states)
affects: [02-03-visual-verification]

# Tech tracking
tech-stack:
  added: []
  patterns: [two-layer-star-rendering, additive-blending-overlay, density-status-indicator]

key-files:
  created:
    - src/components/scene/GaiaStarLayer.tsx
  modified:
    - src/App.tsx
    - src/components/ui/TargetSearch.tsx
    - src/components/ui/CoordinateDisplay.tsx
    - src/components/ui/FocalPlaneView.tsx
    - src/components/scene/CelestialScene.tsx

key-decisions:
  - "Gaia stars rendered at radius 99 (inside HYG StarField at 100) with additive blending for visibility"
  - "FocalPlaneView star rendering uses fixed #88bbff blue instead of per-star color index"
  - "Density indicator shows loading/loaded/error/idle states with DENSE warning badge"

patterns-established:
  - "Two-layer star rendering: HYG background stars at r=100, Gaia overlay at r=99"
  - "Prop threading pattern: App.tsx owns hook state, passes to both 3D scene and 2D SVG views"
  - "Status-driven UI: density indicator switches display based on QueryStatus.state"

requirements-completed: [TARG-01, TARG-02, TARG-03, STAR-01, STAR-03]

# Metrics
duration: 3min
completed: 2026-03-19
---

# Phase 2 Plan 02: UI Wiring Summary

**Wired Gaia DR3 stars into 3D sky view and focal plane SVG, added HMS/DMS coordinate input, dual-format display, and density indicator**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-19T21:22:32Z
- **Completed:** 2026-03-19T21:26:30Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Wired useGaiaStars hook in App.tsx with prop threading to both CelestialScene and FocalPlaneView
- Created GaiaStarLayer Three.js Points component rendering blue Gaia stars in 3D sky view
- Replaced HYG catalog star rendering in FocalPlaneView with live Gaia DR3 star projection
- Updated TargetSearch manual mode with single text input accepting HMS/DMS and decimal formats via parseCoords
- Added decimal degrees row to CoordinateDisplay alongside existing HMS/DMS
- Added density indicator in FocalPlaneView footer with loading/loaded/error/idle states and DENSE badge

## Task Commits

Each task was committed atomically:

1. **Task 1: Update TargetSearch with HMS/DMS input and CoordinateDisplay with decimal degrees** - `cbbaa0c` (feat)
2. **Task 2: Wire useGaiaStars, create GaiaStarLayer, update FocalPlaneView and CelestialScene** - `f575593` (feat)

## Files Created/Modified
- `src/components/scene/GaiaStarLayer.tsx` - Three.js Points layer for Gaia DR3 stars with additive blending
- `src/App.tsx` - Added useGaiaStars hook call and prop threading to CelestialScene and FocalPlaneView
- `src/components/ui/TargetSearch.tsx` - Single text input with parseCoords for HMS/DMS and decimal coordinate input
- `src/components/ui/CoordinateDisplay.tsx` - Added decimal degrees row below HMS/DMS for TARGET section
- `src/components/ui/FocalPlaneView.tsx` - Gaia star projection, blue rendering, density indicator footer
- `src/components/scene/CelestialScene.tsx` - Added GaiaStarLayer after StarField with visibility tied to selectedTarget

## Decisions Made
- Gaia stars rendered at radius 99 (slightly inside HYG StarField at 100) so they appear as a distinct overlay layer
- Used fixed #88bbff blue for all Gaia stars in both 3D and SVG views (no per-star color index needed since Gaia DR3 query only returns G-band magnitude)
- Density indicator shows four states: loading (pulse animation), loaded (count + mag limit + optional DENSE badge), error (red text), idle (no target selected)
- Confirmed SIMBAD auto-center chain works via existing CameraController (no changes needed)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 2 requirements (TARG-01/02/03, STAR-01/03) are functionally complete
- Plan 03 (visual verification) can proceed to validate rendering correctness
- All 51 tests pass, TypeScript compiles cleanly, no regressions

## Self-Check: PASSED

- All 6 expected files exist on disk
- Both task commits (cbbaa0c, f575593) found in git history
- All 51 tests pass (npx vitest run)

---
*Phase: 02-live-sky-data*
*Completed: 2026-03-19*
