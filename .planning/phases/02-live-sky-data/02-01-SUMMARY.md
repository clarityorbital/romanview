---
phase: 02-live-sky-data
plan: 01
subsystem: data-layer
tags: [vizier, gaia, adql, coordinate-parsing, hms-dms, react-hook, abort-controller]

# Dependency graph
requires:
  - phase: 01-siaf-geometry
    provides: WCS engine (skyToFocalPlane), SIAF detector data, test infrastructure (Vitest)
provides:
  - HMS/DMS and decimal coordinate parser (parseCoords)
  - Fixed VizieR TAP cone search with correct column names (RA_ICRS, DE_ICRS, Gmag)
  - Adaptive density management (dense/sparse/normal field detection)
  - React hook for async Gaia star queries with debounce and abort
  - Decimal degree formatting functions (formatRaDeg, formatDecDeg)
  - SIMBAD Sesame test coverage
affects: [02-02-ui-wiring, 02-03-visual-verification]

# Tech tracking
tech-stack:
  added: []
  patterns: [adaptive-query-density, debounced-async-hook, mock-DOMParser-testing]

key-files:
  created:
    - src/lib/parseCoords.ts
    - src/hooks/useGaiaStars.ts
    - src/lib/__tests__/parseCoords.test.ts
    - src/lib/__tests__/vizier.test.ts
    - src/lib/__tests__/coordinates.test.ts
    - src/lib/__tests__/simbad.test.ts
  modified:
    - src/lib/vizier.ts
    - src/lib/coordinates.ts

key-decisions:
  - "Mock DOMParser in Node test environment instead of adding jsdom dependency"
  - "URL-decode VizieR fetch URLs in tests to handle URLSearchParams plus-encoding"

patterns-established:
  - "Adaptive query pattern: initial Gmag<18 query, trim if dense (>=2000), expand if sparse (<100)"
  - "Debounced async hook with AbortController for stale request cancellation"
  - "Mock DOMParser for XML-parsing tests in Node environment"

requirements-completed: [TARG-01, TARG-02, TARG-03, STAR-01, STAR-02]

# Metrics
duration: 4min
completed: 2026-03-19
---

# Phase 2 Plan 01: Data Layer Summary

**Fixed VizieR ADQL queries with correct column names, HMS/DMS coordinate parser, adaptive density management, and debounced useGaiaStars hook with 25 new unit tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-19T21:14:39Z
- **Completed:** 2026-03-19T21:19:15Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Fixed critical VizieR column name bug: RA_ICRS/DE_ICRS/Gmag instead of wrong ra/dec/phot_g_mean_mag
- Created parseCoords.ts handling decimal degrees, HMS/DMS with letters, and HMS/DMS with colons
- Implemented adaptiveGaiaQuery with 3-branch density logic (dense trims to 2000, sparse expands to Gmag<21, normal passes through)
- Built useGaiaStars React hook with 300ms debounce and AbortController cancellation
- Added formatRaDeg/formatDecDeg to coordinates.ts alongside existing HMS/DMS formatters
- 25 new tests (parseCoords: 11, vizier: 7, coordinates: 7, simbad: 3) all passing alongside 26 existing tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Create parseCoords, fix vizier.ts, and create simbad tests** - `e07c0b6` (feat, TDD)
2. **Task 2: Create useGaiaStars hook** - `166ddfb` (feat)

## Files Created/Modified
- `src/lib/parseCoords.ts` - HMS/DMS and decimal coordinate parser with range validation
- `src/lib/vizier.ts` - Fixed VizieR TAP query with correct column names, added adaptiveGaiaQuery
- `src/lib/coordinates.ts` - Added formatRaDeg/formatDecDeg decimal degree formatters
- `src/hooks/useGaiaStars.ts` - React hook wrapping adaptive VizieR query with debounce/abort
- `src/lib/__tests__/parseCoords.test.ts` - 11 tests: decimal, HMS/DMS, range validation, edge cases
- `src/lib/__tests__/vizier.test.ts` - 7 tests: ADQL construction, AbortSignal, adaptive density branches
- `src/lib/__tests__/coordinates.test.ts` - 7 tests: formatRaDeg, formatDecDeg, formatRA/formatDec regression
- `src/lib/__tests__/simbad.test.ts` - 3 tests: Sesame resolve success, not found, network error

## Decisions Made
- Mocked DOMParser in simbad tests instead of adding jsdom as a dependency (lighter, sufficient for XML element queries)
- Used `decodeURIComponent` with `+` to space replacement in vizier tests because URLSearchParams encodes spaces as `+` not `%20`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] DOMParser not available in Node test environment**
- **Found during:** Task 1 (simbad tests)
- **Issue:** `DOMParser` is a browser API not available in Vitest's default Node environment; simbad.ts uses it for XML parsing
- **Fix:** Created a minimal MockDOMParser class in the test file that uses regex-based element extraction
- **Files modified:** src/lib/__tests__/simbad.test.ts
- **Verification:** All 3 simbad tests pass
- **Committed in:** e07c0b6

**2. [Rule 1 - Bug] URL encoding in vizier test assertions**
- **Found during:** Task 1 (vizier tests)
- **Issue:** URLSearchParams encodes spaces as `+` not `%20`, so `toContain('TOP 2500')` failed against `TOP+2500`
- **Fix:** Decode URL with `.replace(/\+/g, ' ')` before assertions
- **Files modified:** src/lib/__tests__/vizier.test.ts
- **Verification:** All 7 vizier tests pass
- **Committed in:** e07c0b6

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for test environment compatibility. No scope creep.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Data layer complete: parseCoords, fixed vizier, adaptiveGaiaQuery, useGaiaStars hook, formatRaDeg/formatDecDeg all ready
- Plan 02 (UI wiring) can import these directly: useGaiaStars hook, parseCoords, formatRaDeg/formatDecDeg
- All 51 tests green (26 existing + 25 new), no regressions

## Self-Check: PASSED

- All 9 expected files exist on disk
- Both task commits (e07c0b6, 166ddfb) found in git history
- All 51 tests pass (npx vitest run)

---
*Phase: 02-live-sky-data*
*Completed: 2026-03-19*
