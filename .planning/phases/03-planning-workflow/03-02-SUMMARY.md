---
phase: 03-planning-workflow
plan: 02
subsystem: ui
tags: [react, pa-slider, url-state, ds9-export, share-url, position-angle, wfi-footprint]

# Dependency graph
requires:
  - phase: 03-planning-workflow
    plan: 01
    provides: "computeRollRange, encodeToHash/decodeFromHash, downloadDS9Regions library modules"
  - phase: 01-geometry-engine
    provides: "SIAF data, positionAngle, v2v3ToSky, FPA_ROTATION_DEG"
  - phase: 02-catalog-overlays
    provides: "Gaia stars, WFI_DETECTORS, WFI_BORESIGHT, FocalPlaneView, WFIFootprint"
provides:
  - "PA slider with roll range visualization and V3PA/APA readout"
  - "Share button copying URL with observation parameters to clipboard"
  - "Export button downloading DS9 region files for WFI footprint"
  - "URL hash state sync: bookmark/share/hydrate observation setups"
  - "Centralized PA state in App with effectiveV3PA prop threading"
affects: [03-03, 04-advanced-features]

# Tech tracking
tech-stack:
  added: []
  patterns: [lifted-state-with-override, url-hash-sync-replaceState, offset-space-slider, skipRef-feedback-guard]

key-files:
  created:
    - src/components/ui/PASlider.tsx
    - src/components/ui/ShareButton.tsx
    - src/components/ui/ExportButton.tsx
  modified:
    - src/App.tsx
    - src/components/ui/FocalPlaneView.tsx
    - src/components/scene/WFIFootprint.tsx
    - src/components/scene/CelestialScene.tsx
    - src/components/ui/Header.tsx

key-decisions:
  - "PA slider uses offset space [-15,+15] internally to avoid 0/360 wrap-around display bugs"
  - "URL sync uses history.replaceState (not hash assignment) with skipNextHashUpdate ref to prevent infinite loops"
  - "PA override resets to null on target/epoch change after initial hydration to recompute nominal PA"
  - "Share and Export buttons placed in Header toolbar with separator from toggle controls"

patterns-established:
  - "Lifted state with override: paOverride ?? nominalV3PA pattern for user-adjustable computed values"
  - "URL hash sync: replaceState + skipRef guard pattern for bidirectional URL/state sync without loops"
  - "Offset-space slider: operate in offset from nominal, display absolute values -- avoids modular arithmetic bugs"

requirements-completed: [PLAN-01, PLAN-02, PLAN-03]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 3 Plan 2: UI Wiring Summary

**Interactive PA slider with roll-range bounds, shareable URL hash state, and DS9 export button -- all wired into the existing React app layout**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-20T00:23:41Z
- **Completed:** 2026-03-20T00:26:53Z
- **Tasks:** 2
- **Files created:** 3
- **Files modified:** 5

## Accomplishments
- PA slider controls footprint rotation in both sky view and focal plane view with real-time V3PA/APA readout
- URL hash updates silently on state changes; loading a hash URL hydrates target, PA, and date correctly
- Share button copies full URL to clipboard with 2-second "Copied" feedback
- Export button triggers DS9 region file download with target name and PA in filename
- WFIFootprint and FocalPlaneView refactored to accept v3pa prop instead of computing internally

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PASlider, ShareButton, ExportButton** - `e9a279f` (feat: three new UI components)
2. **Task 2: Wire PA state, URL sync, update WFIFootprint/FocalPlaneView** - `d0be398` (feat: central state, URL sync, prop threading)

## Files Created/Modified
- `src/components/ui/PASlider.tsx` - Interactive PA slider with offset-space operation, V3PA/APA display, reset button, roll range disclaimer
- `src/components/ui/ShareButton.tsx` - Copy-URL-to-clipboard button with brief confirmation feedback
- `src/components/ui/ExportButton.tsx` - DS9 region file download button calling ds9Export module
- `src/App.tsx` - Central PA state (paOverride/nominalV3PA/effectiveV3PA), URL hash sync, prop threading to all views
- `src/components/ui/FocalPlaneView.tsx` - Accepts v3pa prop instead of computing from sunPosition
- `src/components/scene/WFIFootprint.tsx` - Accepts v3pa prop instead of computing from sunPosition
- `src/components/scene/CelestialScene.tsx` - Passes v3pa through to WFIFootprint
- `src/components/ui/Header.tsx` - Accepts share/export button slots with separator

## Decisions Made
- PA slider operates in offset space [-15, +15] around nominal to avoid 0/360 wrap-around display issues (per research pitfall #1)
- URL sync uses `history.replaceState` with a `skipNextHashUpdate` ref to prevent infinite state/URL feedback loops (per research pitfall #3)
- PA override resets to null on target or epoch change (but not during initial hash hydration) so nominal PA recomputes for new geometry
- Share and Export buttons placed in Header toolbar area alongside toggle controls with a vertical separator for visual grouping

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - all 78 existing tests continue to pass, TypeScript compilation clean.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All PA slider, share, and export features wired and functional
- Ready for Plan 03 (visual verification and integration testing)
- URL state supports bookmarking and sharing observation configurations

## Self-Check: PASSED

All 3 created files verified on disk. All 5 modified files verified on disk. All 2 commit hashes verified in git log.

---
*Phase: 03-planning-workflow*
*Completed: 2026-03-20*
