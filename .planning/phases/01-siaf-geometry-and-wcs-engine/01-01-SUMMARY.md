---
phase: 01-siaf-geometry-and-wcs-engine
plan: 01
subsystem: geometry
tags: [siaf, wcs, gnomonic, pysiaf, vitest, coordinate-transforms]

# Dependency graph
requires: []
provides:
  - "wfi_siaf.json: Static SIAF data for 18 WFI SCAs with V2/V3 positions and corner coordinates"
  - "siaf.ts: TypeScript types and accessor functions (getAllDetectors, getDetector, getBoresight)"
  - "wcs.ts: Centralized WCS engine with gnomonic projection, PA rotation, V2V3-to-sky, skyToFocalPlane"
  - "vitest test infrastructure with 21 passing tests"
affects: [01-02, 01-03, 02-vizier-catalog-integration, 03-observation-workflow]

# Tech tracking
tech-stack:
  added: [vitest]
  patterns: [TDD red-green, centralized WCS engine, static SIAF JSON from pysiaf extraction]

key-files:
  created:
    - src/data/wfi_siaf.json
    - src/lib/siaf.ts
    - src/lib/wcs.ts
    - src/lib/__tests__/siaf.test.ts
    - src/lib/__tests__/wcs.test.ts
    - vitest.config.ts
    - scripts/extract-siaf.py
  modified:
    - package.json

key-decisions:
  - "Used real pysiaf v0.25.0 data instead of approximate manual values -- pysiaf was available in dev environment"
  - "Replaced axis-aligned bounding box overlap test with Separating Axis Theorem for rotated detector polygons"
  - "WFI_CEN boresight at V2=1546.38, V3=-892.79 arcsec (from pysiaf, not the approximate 0/-468 from plan)"

patterns-established:
  - "TDD: Write failing tests first, then implement to pass"
  - "SIAF data access: Always use siaf.ts accessors, never import JSON directly in components"
  - "WCS engine: All coordinate projections go through wcs.ts -- no duplicate projection code"
  - "V2 sign convention: xi = -dV2 when converting V2V3 to tangent plane"

requirements-completed: [FOOT-01, FOOT-02, FOOT-04]

# Metrics
duration: 4min
completed: 2026-03-19
---

# Phase 1 Plan 01: SIAF Geometry and WCS Engine Summary

**Pysiaf-extracted SIAF data for 18 WFI detectors with centralized gnomonic WCS engine and 21 passing tests via vitest TDD**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-19T20:07:13Z
- **Completed:** 2026-03-19T20:11:27Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Extracted real SIAF V2/V3 positions from pysiaf v0.25.0 for all 18 WFI detectors into static JSON
- Built typed accessor layer (siaf.ts) with getAllDetectors, getDetector, getBoresight
- Created centralized WCS engine (wcs.ts) with gnomonic forward/inverse, PA rotation, V2V3-to-sky, and skyToFocalPlane
- Established vitest test infrastructure with 21 tests (10 SIAF + 11 WCS) all passing
- Gnomonic round-trip accuracy verified at <0.001 arcsec across equator, mid-latitude, and near-pole positions

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Vitest and create test scaffolds** - `51a8252` (test) - RED phase: failing tests for SIAF data integrity and WCS projection
2. **Task 2: Create SIAF data JSON and typed accessors** - `8ad5bba` (feat) - GREEN phase: pysiaf extraction, siaf.ts accessors, 10 SIAF tests pass
3. **Task 3: Create centralized WCS engine** - `1914402` (feat) - GREEN phase: wcs.ts with 5 projection functions, 11 WCS tests pass

## Files Created/Modified
- `src/data/wfi_siaf.json` - Static SIAF data for 18 WFI SCAs extracted from pysiaf
- `src/lib/siaf.ts` - TypeScript types and accessor functions for SIAF data
- `src/lib/wcs.ts` - Centralized WCS engine (gnomonic projection, PA rotation, V2V3-to-sky)
- `src/lib/__tests__/siaf.test.ts` - 10 tests for SIAF data integrity, naming, overlaps
- `src/lib/__tests__/wcs.test.ts` - 11 tests for WCS projection accuracy and correctness
- `vitest.config.ts` - Vitest configuration for test discovery
- `scripts/extract-siaf.py` - Pysiaf extraction script (for reproducibility)
- `package.json` - Added vitest dev dependency

## Decisions Made
- Used real pysiaf v0.25.0 data instead of approximate manual values since pysiaf was installable in the dev environment. Boresight V2/V3 values from pysiaf differ significantly from the plan's approximate values (V2=1546 vs 0, V3=-893 vs -468), confirming the importance of using real data.
- Replaced axis-aligned bounding box overlap test with Separating Axis Theorem (SAT) because the 60-degree FPA rotation causes AABB overlaps between non-overlapping rotated detector polygons.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed overlap test for rotated detector polygons**
- **Found during:** Task 2 (SIAF data creation, GREEN phase)
- **Issue:** Plan specified axis-aligned bounding box overlap check, but real SIAF detectors are rotated 60 degrees, causing AABB false positives for adjacent detectors
- **Fix:** Replaced AABB overlap check with Separating Axis Theorem (SAT) which correctly handles convex polygon overlap for rotated rectangles
- **Files modified:** src/lib/__tests__/siaf.test.ts
- **Verification:** All 18 detectors confirmed non-overlapping with SAT check
- **Committed in:** 8ad5bba (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix in test logic)
**Impact on plan:** Necessary correction for real SIAF geometry. No scope creep.

## Issues Encountered
None -- pysiaf installed successfully and extracted all 18 detectors without issues.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SIAF data foundation complete with 18 real detector positions
- WCS engine ready to be consumed by Plan 02 (rewire roman.ts to SIAF) and Plan 03 (rewire UI components)
- vitest infrastructure established for future test additions
- FocalPlaneView.tsx still has its own projectToFocalPlane -- will be replaced in Plan 02/03

## Self-Check: PASSED

All 7 created files verified on disk. All 3 task commits (51a8252, 8ad5bba, 1914402) verified in git log.

---
*Phase: 01-siaf-geometry-and-wcs-engine*
*Completed: 2026-03-19*
