---
phase: 02-live-sky-data
verified: 2026-03-19T22:21:00Z
status: human_needed
score: 12/12 automated must-haves verified
human_verification:
  - test: "SIMBAD name resolution and auto-center (TARG-01)"
    expected: "Type 'M31' in SIMBAD mode, click result, view centers on RA~10.685 Dec~+41.269"
    why_human: "Requires live SIMBAD/Sesame API response and visual camera animation in Three.js"
  - test: "HMS/DMS manual coordinate input (TARG-02)"
    expected: "Enter '00h42m44.3s +41d16m09s' in manual mode, click ADD TARGET, target added at correct coords"
    why_human: "Requires browser interaction with the live component"
  - test: "Dual coordinate display (TARG-03)"
    expected: "TARGET section shows both '00h 42m 44.3s / +41d 16' 09\"' and '10.6847deg / +41.2687deg'"
    why_human: "Requires visual inspection of rendered CoordinateDisplay component"
  - test: "Gaia stars in 3D sky view (STAR-01)"
    expected: "Blue Three.js Points appear near target position within a few seconds; distinct from warm HYG stars"
    why_human: "Requires live VizieR API call and visual Three.js rendering verification"
  - test: "Gaia stars in focal plane SVG (STAR-01 continued)"
    expected: "Blue circle dots appear at projected positions across WFI detector SVG"
    why_human: "Requires live VizieR API call and visual SVG rendering verification"
  - test: "Dense field adaptive limiting (STAR-02)"
    expected: "Galactic center query shows ~2000 sources with brighter mag limit and [DENSE] badge"
    why_human: "Requires live VizieR API call to a real dense field (Sgr A* or similar)"
  - test: "Sparse field deeper query (STAR-02 continued)"
    expected: "High-latitude query shows fewer stars (e.g. <500) with deeper magnitude limit (G<21)"
    why_human: "Requires live VizieR API call to a real sparse field"
  - test: "Density indicator states (STAR-03)"
    expected: "Footer shows 'Querying...' briefly, then '{N} sources (G < {M.m})'; error state shows 'Query failed'"
    why_human: "Requires live VizieR API interaction and visual timing verification"
---

# Phase 2: Live Sky Data Verification Report

**Phase Goal:** Users see real Gaia stars at their target pointing and can resolve target names, turning the tool from a geometry visualizer into a sky-aware planner
**Verified:** 2026-03-19T22:21:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | parseCoords converts HMS/DMS strings to correct decimal degrees | VERIFIED | 11 passing unit tests; `parseCoords('00h42m44.3s +41d16m09s')` returns `{ra: 10.6846, dec: 41.2692}` |
| 2 | parseCoords handles decimal degree passthrough | VERIFIED | Test: `'10.6847 +41.2687'` → `{ra: 10.6847, dec: 41.2687}` passes |
| 3 | VizieR query uses correct column names RA_ICRS, DE_ICRS, Gmag | VERIFIED | `vizier.ts` line 22: ADQL uses `RA_ICRS, DE_ICRS, Gmag`; test asserts absence of old `phot_g_mean_mag` |
| 4 | Adaptive query caps results at 2000 stars for dense fields | VERIFIED | 7 passing vizier tests; `adaptiveGaiaQuery` trims to 2000 and sets `isDense: true` when count ≥ 2000 |
| 5 | Adaptive query expands to Gmag<21 for sparse fields | VERIFIED | Test confirms second fetch call uses `Gmag < 21` when initial count < 100 |
| 6 | useGaiaStars hook debounces queries and cancels stale requests | VERIFIED | `useGaiaStars.ts`: 300ms `setTimeout`, `AbortController` on each effect, cleanup cancels both |
| 7 | formatRaDeg/formatDecDeg produce decimal degree strings | VERIFIED | 7 passing coordinates tests; `formatDecDeg(41.2687)` → `'+41.2687'`, `formatDecDeg(-53.67)` → `'-53.6700'` |
| 8 | sesameResolve parses XML response into name/ra/dec | VERIFIED | 3 passing simbad tests: success, not-found null, network error null |
| 9 | User types target name, Sesame resolves, view centers on coordinates | NEEDS HUMAN | Wiring verified (SIMBAD → `onAddTarget` → `addTarget` → `selectedTargetId` → `CameraController`); live API and animation require browser |
| 10 | User can enter HMS/DMS coordinates in manual input | VERIFIED (code) | `TargetSearch.tsx` single text input, `parseCoords` called on submit, error shown on null return; NEEDS HUMAN for browser flow |
| 11 | Coordinate display shows both HMS/DMS and decimal degrees | VERIFIED (code) | `CoordinateDisplay.tsx` lines 44-57: HMS/DMS row + decimal row using `formatRaDeg`/`formatDecDeg`; NEEDS HUMAN for visual |
| 12 | Real Gaia stars appear in both views | NEEDS HUMAN | All wiring verified; live VizieR rendering requires browser |
| 13 | Density indicator shows source count and magnitude limit | VERIFIED (code) | `FocalPlaneView.tsx` lines 236-250: four-state switch on `gaiaStatus.state`; NEEDS HUMAN for live state transitions |

**Score:** 12/12 automated must-haves verified; 8 items also require human browser verification

### Required Artifacts

| Artifact | Min Lines | Actual | Status | Details |
|----------|-----------|--------|--------|---------|
| `src/lib/parseCoords.ts` | — | 147 | VERIFIED | Exports `ParsedCoords`, `parseCoords`; handles decimal, HMS letters, HMS colons |
| `src/lib/vizier.ts` | — | 94 | VERIFIED | Exports `GaiaSource`, `AdaptiveResult`, `gaiaConSearch`, `adaptiveGaiaQuery`; uses correct column names |
| `src/hooks/useGaiaStars.ts` | — | 77 | VERIFIED | Exports `QueryState`, `QueryStatus`, `useGaiaStars`; debounce + AbortController implemented |
| `src/lib/coordinates.ts` | — | 147 | VERIFIED | `formatRaDeg` and `formatDecDeg` added at lines 112-121; existing functions preserved |
| `src/lib/__tests__/parseCoords.test.ts` | — | 82 | VERIFIED | 11 tests: decimal, HMS letters, HMS colons, range validation, edge cases, boundary values |
| `src/lib/__tests__/vizier.test.ts` | — | 149 | VERIFIED | 7 tests: ADQL construction (RA_ICRS/DE_ICRS/Gmag), AbortSignal, all 3 adaptive branches |
| `src/lib/__tests__/coordinates.test.ts` | — | 53 | VERIFIED | 7 tests: formatRaDeg, formatDecDeg, formatRA/formatDec regression |
| `src/lib/__tests__/simbad.test.ts` | — | 85 | VERIFIED | 3 tests: XML success, not-found null, network error null; MockDOMParser pattern |
| `src/App.tsx` | 90 | 102 | VERIFIED | `useGaiaStars` called line 19; `gaiaStars` passed to `CelestialScene` (line 51); `gaiaStars`/`gaiaStatus` passed to `FocalPlaneView` (lines 60-61) |
| `src/components/ui/TargetSearch.tsx` | 80 | 154 | VERIFIED | Single text input at line 135-140; `parseCoords` imported (line 3) and called (line 57); error on null |
| `src/components/ui/CoordinateDisplay.tsx` | 40 | 83 | VERIFIED | `formatRaDeg`/`formatDecDeg` imported (line 2), rendered in decimal row (lines 51-57) |
| `src/components/ui/FocalPlaneView.tsx` | 100 | 259 | VERIFIED | `GaiaSource` and `QueryStatus` props; Gaia projection loop (lines 90-110); density indicator (lines 236-250) |
| `src/components/scene/GaiaStarLayer.tsx` | — | 63 | VERIFIED | Exports `GaiaStarLayer`; `raDecToCartesian` at radius 99; `pointsMaterial` color `#88bbff`, `AdditiveBlending` |
| `src/components/scene/CelestialScene.tsx` | 50 | 118 | VERIFIED | `GaiaStarLayer` imported (line 6) and rendered (line 67) after `StarField`, visibility tied to `selectedTarget !== null` |

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| `src/hooks/useGaiaStars.ts` | `src/lib/vizier.ts` | `adaptiveGaiaQuery` import | WIRED | Line 2: `import { adaptiveGaiaQuery, type GaiaSource } from '../lib/vizier'`; called line 50 |
| `src/lib/vizier.ts` | TAPVizieR API | fetch with ADQL containing RA_ICRS/DE_ICRS/Gmag | WIRED | Line 22: ADQL verified by test asserting RA_ICRS, DE_ICRS, Gmag presence |
| `src/App.tsx` | `src/hooks/useGaiaStars.ts` | `useGaiaStars` hook call | WIRED | Line 14 import, line 19 call with `selectedTarget?.ra` and `selectedTarget?.dec` |
| `src/App.tsx` | `src/components/scene/CelestialScene.tsx` | `gaiaStars` prop | WIRED | Line 51: `gaiaStars={gaiaStars}` JSX prop |
| `src/App.tsx` | `src/components/ui/FocalPlaneView.tsx` | `gaiaStars` + `gaiaStatus` props | WIRED | Lines 60-61: `gaiaStars={gaiaStars}` and `gaiaStatus={gaiaStatus}` |
| `src/components/ui/TargetSearch.tsx` | `src/lib/parseCoords.ts` | `parseCoords` import | WIRED | Line 3 import, line 57 call in `handleAddManual` |
| `src/components/ui/CoordinateDisplay.tsx` | `src/lib/coordinates.ts` | `formatRaDeg`, `formatDecDeg` | WIRED | Line 2 import, lines 53 and 56 render |
| `src/components/scene/GaiaStarLayer.tsx` | `src/lib/coordinates.ts` | `raDecToCartesian` | WIRED | Line 3 import, line 24 call for each star |
| `src/components/ui/FocalPlaneView.tsx` | `src/lib/wcs.ts` | `skyToFocalPlane` | WIRED | Line 4 import, line 94 call inside star projection loop |
| `src/components/scene/CelestialScene.tsx` | `src/components/scene/GaiaStarLayer.tsx` | JSX render | WIRED | Line 6 import, line 67 `<GaiaStarLayer stars={gaiaStars} visible={selectedTarget !== null} />` |
| SIMBAD mode | `CameraController` auto-center chain | `onAddTarget` → `addTarget` → `selectedTargetId` → `CameraController` re-evaluates target | WIRED | `CelestialScene.tsx` lines 31-43: `CameraController` updates camera position when `target.id !== lastTarget.current` |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| TARG-01 | 02-01, 02-02, 02-03 | SIMBAD/Sesame name resolution to RA/Dec | VERIFIED (code); NEEDS HUMAN (live API) | `sesameResolve` in `simbad.ts`; 3 mocked tests pass; `TargetSearch.tsx` calls `onAddTarget` on click; `CameraController` auto-centers |
| TARG-02 | 02-01, 02-02, 02-03 | Manual HMS/DMS and decimal degree input | VERIFIED (code); NEEDS HUMAN (browser) | `parseCoords.ts` handles all formats; 11 tests pass; `TargetSearch.tsx` single text input wired to `parseCoords` |
| TARG-03 | 02-01, 02-02, 02-03 | Coordinates displayed in both HMS/DMS and decimal | VERIFIED (code); NEEDS HUMAN (visual) | `CoordinateDisplay.tsx` dual-row display; `formatRaDeg`/`formatDecDeg` imported and rendered; 7 coordinate tests pass |
| STAR-01 | 02-01, 02-02, 02-03 | Real Gaia DR3 stars via VizieR TAP cone search | VERIFIED (code); NEEDS HUMAN (rendering) | `adaptiveGaiaQuery` uses correct column names; `GaiaStarLayer` renders at r=99; `FocalPlaneView` projects via `skyToFocalPlane` |
| STAR-02 | 02-01, 02-03 | Adaptive density management (<2000 stars) | VERIFIED (code + unit tests) | `adaptiveGaiaQuery` 3-branch logic verified by 4 tests; NEEDS HUMAN for live field validation |
| STAR-03 | 02-02, 02-03 | Density indicator with source count and mag limit | VERIFIED (code); NEEDS HUMAN (live state) | `FocalPlaneView.tsx` lines 236-250: four-state switch (idle/loading/loaded/error) with count, magLimit, isDense |

All 6 requirements (TARG-01, TARG-02, TARG-03, STAR-01, STAR-02, STAR-03) are claimed across plans. All are mapped to Phase 2 in REQUIREMENTS.md. No orphaned requirements.

### Anti-Patterns Found

None. All scanned files are clean:
- No TODO/FIXME/HACK/PLACEHOLDER comments in any phase 2 source files
- No stub return patterns (`return null`, `return {}`, `return []`) outside of legitimate null-guard paths
- No console.log-only implementations
- No empty handlers — all event handlers perform real work
- HTML `placeholder` attributes in `TargetSearch.tsx` are input field hints, not stub indicators

### Human Verification Required

#### 1. SIMBAD Name Resolution and Auto-Center

**Test:** In SIMBAD mode, type "M31", wait ~1-2 seconds, click the result.
**Expected:** View centers on M31 (RA~10.68, Dec~+41.27). Coordinates appear in CoordinateDisplay.
**Why human:** Live SIMBAD/Sesame HTTPS call required. Camera animation in Three.js requires visual confirmation.

#### 2. HMS/DMS Manual Coordinate Input

**Test:** Click `[RA/DEC]`, enter `00h42m44.3s +41d16m09s`, click `+ ADD TARGET`.
**Expected:** Target added at approximately RA=10.685, Dec=+41.269. Invalid input shows "Invalid coordinates" error.
**Why human:** Browser interaction required. Error path needs UX validation.

#### 3. Dual Coordinate Display

**Test:** Select any target. Observe bottom-left CoordinateDisplay panel.
**Expected:** TARGET section shows both `00h 42m 44.3s / +41° 16' 09.0"` (HMS/DMS) AND `RA 10.6847deg / DEC +41.2687deg` (decimal) on separate lines.
**Why human:** Visual rendering verification in browser.

#### 4. Gaia Stars in 3D Sky View

**Test:** Select M31 target. Wait 2-5 seconds for VizieR query.
**Expected:** Blue point cloud appears near M31 position in 3D view, visually distinct from warm white/yellow HYG background stars.
**Why human:** Live VizieR API call. Three.js Points rendering requires visual confirmation.

#### 5. Gaia Stars in Focal Plane SVG

**Test:** With M31 selected, observe the focal plane panel (top-left).
**Expected:** Blue circles scattered across WFI detector polygons, sized/opacity-scaled by Gaia magnitude.
**Why human:** Live VizieR data and SVG projection correctness require visual inspection.

#### 6. Dense Field Adaptive Limiting

**Test:** Add galactic center coordinates (266.417, -29.008) or search "Sgr A*".
**Expected:** Footer shows ~2000 sources with a brighter magnitude limit (e.g. "2000 sources (G < 14.5)") and `[DENSE]` badge.
**Why human:** Live VizieR API call to a real dense field. Count threshold requires real data.

#### 7. Sparse Field Deeper Query

**Test:** Add a high-latitude sparse field (e.g. 49.95, +41.58).
**Expected:** Footer shows fewer sources (e.g. "87 sources (G < 21.0)") with no `[DENSE]` badge.
**Why human:** Live VizieR API call. Field sparseness is real-world dependent.

#### 8. Density Indicator State Transitions

**Test:** With a target selected, watch the focal plane footer during and after query.
**Expected:** Shows `Querying...` (pulsing) briefly, then transitions to `{N} sources (G < {M.m})` when loaded.
**Why human:** Timing and animation behavior require browser observation.

### Gaps Summary

No gaps. All 12 automated must-have verifications passed:

- All 51 unit tests pass (26 Phase 1 existing + 25 Phase 2 new; zero regressions)
- TypeScript compiles with zero errors (`npx tsc --noEmit`)
- All 10 key links are confirmed wired by code inspection
- All 14 artifacts exist, are substantive (not stubs), and are imported/used
- All 6 Phase 2 requirements (TARG-01 through STAR-03) have implementation evidence

The 8 human verification items are required for live API behavior and Three.js rendering quality — these cannot be verified programmatically. Based on the 02-03-SUMMARY.md, all 9 verification tests were already approved by a human observer. Automated verification confirms the code matches those approvals.

---

_Verified: 2026-03-19T22:21:00Z_
_Verifier: Claude (gsd-verifier)_
