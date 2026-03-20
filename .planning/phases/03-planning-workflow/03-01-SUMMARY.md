---
phase: 03-planning-workflow
plan: 01
subsystem: lib
tags: [tdd, vitest, roll-range, url-state, ds9, region-file, wcs, coordinates]

# Dependency graph
requires:
  - phase: 01-geometry-engine
    provides: "SIAF data, WCS projection (v2v3ToSky), coordinates (positionAngle, angularSeparation)"
  - phase: 02-catalog-overlays
    provides: "roman.ts WFI_DETECTORS and WFI_BORESIGHT exports"
provides:
  - "computeRollRange: V3PA roll range computation for PA slider"
  - "encodeToHash/decodeFromHash: URL hash state for shareable observation links"
  - "generateDS9Regions/downloadDS9Regions: DS9 region file export for all 18 SCAs"
affects: [03-02, 03-03, 04-advanced-features]

# Tech tracking
tech-stack:
  added: []
  patterns: [pure-function-tdd, url-search-params, ds9-region-format, blob-download]

key-files:
  created:
    - src/lib/rollRange.ts
    - src/lib/urlState.ts
    - src/lib/ds9Export.ts
    - src/lib/__tests__/rollRange.test.ts
    - src/lib/__tests__/urlState.test.ts
    - src/lib/__tests__/ds9Export.test.ts
  modified: []

key-decisions:
  - "Mock document.createElement globally for download tests in Node (no jsdom, following Phase 02-01 pattern)"
  - "RA/Dec formatted to 5 decimal places in URL hash, PA to 1 decimal place for clean shareable URLs"
  - "DS9 region coordinates formatted to 7 decimal places for sub-arcsecond precision"

patterns-established:
  - "Pure function TDD: Write failing tests first, implement minimal code, verify green"
  - "URL state pattern: URLSearchParams for standards-compliant encoding of special chars in target names"
  - "DS9 export pattern: Project V2V3 corners to sky via v2v3ToSky for each detector"

requirements-completed: [PLAN-01, PLAN-02, PLAN-03]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 3 Plan 1: Core Library Modules Summary

**Roll range computation, URL hash state, and DS9 region file export -- three pure-function TDD modules with 27 tests**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-20T00:17:50Z
- **Completed:** 2026-03-20T00:21:18Z
- **Tasks:** 2
- **Files created:** 6

## Accomplishments
- computeRollRange identifies observable targets (54-126 degree Sun separation) and returns nominal V3PA +/-15 degree range
- encodeToHash/decodeFromHash round-trips all observation parameters (ra, dec, name, pa, date) through URL hash with proper encoding of spaces and special characters
- generateDS9Regions produces valid DS9 v4.1 region files with FK5 polygon regions for all 18 WFI detectors projected onto the sky
- Full TDD cycle (RED/GREEN) for all three modules with 27 new tests, 78 total tests passing

## Task Commits

Each task was committed atomically (TDD RED then GREEN):

1. **Task 1: Roll range and URL state modules with tests**
   - `7849d9f` (test: failing tests for rollRange and urlState)
   - `3a093ac` (feat: implement rollRange and urlState modules)
2. **Task 2: DS9 region file export module with tests**
   - `deaf51e` (test: failing tests for DS9 export module)
   - `8d03d3c` (feat: implement DS9 region file export module)

## Files Created/Modified
- `src/lib/rollRange.ts` - Roll range computation with Sun exclusion check and +/-15 deg range
- `src/lib/urlState.ts` - URL hash encode/decode for shareable observation parameters
- `src/lib/ds9Export.ts` - DS9 region file generation and browser download trigger
- `src/lib/__tests__/rollRange.test.ts` - 7 tests: observability, PA matching, edge cases
- `src/lib/__tests__/urlState.test.ts` - 10 tests: round-trip, special chars, missing params
- `src/lib/__tests__/ds9Export.test.ts` - 10 tests: header, polygons, coordinates, download

## Decisions Made
- Mock document.createElement globally for download tests in Node (no jsdom dependency, consistent with Phase 02-01 pattern of mocking DOMParser)
- RA/Dec formatted to 5 decimal places in URL hash for ~1 arcsec precision; PA to 1 decimal place
- DS9 region coordinates formatted to 7 decimal places for sub-arcsecond precision matching professional tools

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed download test mock for Node environment**
- **Found during:** Task 2 (DS9 export GREEN phase)
- **Issue:** Tests used `vi.spyOn(document, 'createElement')` but `document` is undefined in Node vitest environment
- **Fix:** Mock `globalThis.document` directly as an object with createElement method, following existing project pattern of mocking DOM APIs without jsdom
- **Files modified:** src/lib/__tests__/ds9Export.test.ts
- **Verification:** All 10 DS9 export tests pass
- **Committed in:** 8d03d3c (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix in test setup)
**Impact on plan:** Minimal -- test mock approach adjusted for Node environment. No scope creep.

## Issues Encountered
None -- plan executed as written with one minor test environment adjustment.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three library modules ready for UI consumption in Plan 02 (PA slider, share links, DS9 download button)
- computeRollRange provides min/max for PA slider range bounds
- encodeToHash/decodeFromHash ready for URL sync in App component
- generateDS9Regions/downloadDS9Regions ready for export button integration

## Self-Check: PASSED

All 6 created files verified on disk. All 4 commit hashes verified in git log.

---
*Phase: 03-planning-workflow*
*Completed: 2026-03-20*
