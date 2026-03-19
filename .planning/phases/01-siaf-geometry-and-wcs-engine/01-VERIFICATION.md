---
phase: 01-siaf-geometry-and-wcs-engine
verified: 2026-03-19T20:25:05Z
status: human_needed
score: 9/9 automated must-haves verified
human_verification:
  - test: "WFI footprint layout on celestial sphere"
    expected: "18 detectors in 3-row x 6-column layout with visible 60-degree FPA rotation and non-uniform inter-detector gaps, matching official WFI focal plane diagram at https://roman.gsfc.nasa.gov/science/WFI_technical.html"
    why_human: "Visual shape and rotation can only be confirmed by rendering the Three.js scene in a browser"
  - test: "Detector labels WFI01-WFI18 in correct column-major positions on sky view"
    expected: "WFI07/08/09 in bottom-left column, WFI16/17/18 in far-right column, consistent with official SCA numbering convention"
    why_human: "Spatial label arrangement requires rendering at sufficient zoom"
  - test: "PA rotation direction with epoch change"
    expected: "Moving epoch slider visibly rotates footprint counterclockwise (East of North) around boresight"
    why_human: "Real-time rotation direction is a behavioral/interactive property not verifiable from static code"
  - test: "Focal plane view detector layout and star projection"
    expected: "Focal plane SVG shows detectors as rotated polygons matching SIAF layout; star dots appear at plausible positions on detectors; PA header shows APA (V3PA + 60)"
    why_human: "Visual correctness of SVG polygon layout and star scatter require runtime rendering"
---

# Phase 1: SIAF Geometry and WCS Engine Verification Report

**Phase Goal:** Users see the WFI footprint with scientifically accurate detector positions, gaps, rotation, and labeling -- trustworthy enough to base proposal decisions on
**Verified:** 2026-03-19T20:25:05Z
**Status:** human_needed (all automated checks passed; visual correctness requires browser rendering)
**Re-verification:** No -- initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | SIAF JSON contains all 18 WFI detectors with V2/V3 reference positions and corner coordinates | VERIFIED | `wfi_siaf.json` (517 lines) has exactly 18 keys WFI01-WFI18, boresight V2=1546.38 V3=-892.79, each detector has v2Ref/v3Ref/corners_v2v3 with 4 pairs, source pysiaf v0.25.0 |
| 2  | Detectors are named WFI01 through WFI18 (not SCA01-SCA18) | VERIFIED | siaf.test.ts tests "all detectors named WFI01-WFI18" and "no detectors named SCA*" both pass; `wfi_geometry.json` (old SCA data) has zero imports in `src/` |
| 3  | Gnomonic forward+inverse projection round-trips within 0.001 arcsec | VERIFIED | wcs.test.ts passes 3 round-trip cases (mid-latitude, equator, near-pole) with `dRa/dDec < 0.001/3600` degrees; tolerance enforced via `ARCSEC_TOLERANCE = 0.001 / 3600` |
| 4  | V2V3-to-sky transform places detectors on correct side of boresight | VERIFIED | wcs.test.ts "at boresight V2/V3 returns target RA/Dec" passes; "with offset V2/V3 returns displaced position" passes (separation 0.01-0.1 deg for 100 arcsec offset) |
| 5  | PA rotation follows East-of-North convention | VERIFIED | wcs.test.ts "rotateByPA(1,0,90) rotates East vector to South" passes; identity at PA=0 passes; `v2v3ToSky` applies `rotateByPA(xiUnrotated, etaUnrotated, v3paDeg)` |
| 6  | WFI footprint on sky shows 18 detectors at SIAF-derived positions via v2v3ToSky | VERIFIED | `WFIFootprint.tsx` imports `v2v3ToSky` from `wcs.ts`, `WFI_DETECTORS`/`WFI_BORESIGHT` from `roman.ts`; projects each detector's `corners_v2v3` through `v2v3ToSky`; no local projection code present |
| 7  | Position angle includes FPA rotation offset (APA = V3PA + 60) | VERIFIED | `FocalPlaneView.tsx` line 74: `const apa = v3pa - FPA_ROTATION_DEG;` where `FPA_ROTATION_DEG = -60`, so `apa = v3pa + 60`; displayed in header as `PA {apa.toFixed(1)}°` |
| 8  | Focal plane view uses centralized wcs.ts projection (no local projection code) | VERIFIED | `FocalPlaneView.tsx` imports `skyToFocalPlane`, `rotateByPA` from `../../lib/wcs`; no `gnomonicForward`/`gnomonicInverse`/local trig projection anywhere in `src/components/`; `projectToFocalPlane` local function removed |
| 9  | N/E compass in focal plane view accounts for corrected aperture PA | VERIFIED | Lines 137-138: `rotateByPA(0,1,-v3pa)` and `rotateByPA(1,0,-v3pa)` from `wcs.ts` used to compute compass vectors in focal plane frame |

**Score:** 9/9 automated truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/data/wfi_siaf.json` | Static SIAF data for 18 SCAs | VERIFIED | 517 lines; 18 WFI-named detectors; V2/V3 positions from pysiaf v0.25.0; 4 corners per detector; V3IdlYAngle=-60 for all |
| `src/lib/siaf.ts` | TypeScript types and accessor functions | VERIFIED | 64 lines; exports `SIAFDetector`, `SIAFBoresight`, `getAllDetectors`, `getDetector`, `getBoresight`, `FPA_ROTATION_DEG`; imports `wfi_siaf.json` |
| `src/lib/wcs.ts` | Centralized WCS engine | VERIFIED | 179 lines; exports `gnomonicForward`, `gnomonicInverse`, `rotateByPA`, `v2v3ToSky`, `skyToFocalPlane`; commented with Calabretta & Greisen 2002 reference; V2 sign flip documented |
| `src/lib/__tests__/siaf.test.ts` | SIAF data integrity tests | VERIFIED | 10 tests all passing: detector count, WFI naming, no-SCA, all 18 IDs, numeric fields, corners structure, no-overlap (SAT), boresight, getDetector valid/invalid |
| `src/lib/__tests__/wcs.test.ts` | WCS projection and transform tests | VERIFIED | 11 tests all passing: 3 round-trips, tangent-point identity, antipodal null, PA rotation 90deg, PA identity, v2v3 at boresight, v2v3 with offset, skyToFocalPlane north, skyToFocalPlane behind-tangent |
| `vitest.config.ts` | Vitest test configuration | VERIFIED | Exists; `include: ['src/**/__tests__/**/*.test.ts']`; `alias: { '@': '/src' }` |
| `scripts/extract-siaf.py` | Pysiaf extraction script | VERIFIED | File exists on disk |
| `src/lib/roman.ts` | SIAF-derived WFI_DETECTORS | VERIFIED | Imports `getAllDetectors`, `getBoresight` from `./siaf`; `WFI_DETECTORS` mapped from SIAF; `WFI_BORESIGHT` exported; `TOTAL_FOV_ARCMIN/DEG` computed from SIAF corners |
| `src/components/scene/WFIFootprint.tsx` | Sky view using SIAF corners via v2v3ToSky | VERIFIED | Imports `v2v3ToSky` from `../../lib/wcs`; projects all 4 corners of each detector; label uses `det.id` (WFI01-WFI18 natively); no local projection logic |
| `src/components/ui/FocalPlaneView.tsx` | Focal plane view using wcs.ts | VERIFIED | Imports `skyToFocalPlane`, `rotateByPA` from `../../lib/wcs`; `FPA_ROTATION_DEG` from `../../lib/siaf`; detectors rendered as SVG polygons from V2V3 corners; APA displayed; cos(dec) star pre-filter present |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/siaf.ts` | `src/data/wfi_siaf.json` | JSON import | WIRED | Line 14: `import siafData from '../data/wfi_siaf.json'`; data consumed in all three accessor functions |
| `src/lib/wcs.ts` | `src/lib/siaf.ts` | uses getBoresight | NOT WIRED (by design) | `wcs.ts` is a pure math engine with no SIAF dependency; it receives V2/V3 values as parameters. Callers pass boresight. This is correct design, not a gap. |
| `src/lib/roman.ts` | `src/lib/siaf.ts` | imports getAllDetectors, getBoresight | WIRED | Line 1: `import { getAllDetectors, getBoresight } from './siaf'`; both used in `WFI_DETECTORS` and `WFI_BORESIGHT` exports |
| `src/components/scene/WFIFootprint.tsx` | `src/lib/wcs.ts` | uses v2v3ToSky | WIRED | Line 6: `import { v2v3ToSky } from '../../lib/wcs'`; called in `useMemo` for each of 18 detectors' 4 corners + center |
| `src/components/ui/FocalPlaneView.tsx` | `src/lib/wcs.ts` | uses skyToFocalPlane | WIRED | Line 4: `import { skyToFocalPlane, rotateByPA } from '../../lib/wcs'`; `skyToFocalPlane` called in star projection loop; `rotateByPA` used for compass vectors |
| `src/components/scene/WFIFootprint.tsx` | `src/lib/siaf.ts` | uses getAllDetectors via roman.ts | WIRED | Uses `WFI_DETECTORS` from `roman.ts`, which delegates to `getAllDetectors()`. `corners_v2v3` accessed on every detector. |

**Note on plan key_link `wcs.ts -> siaf.ts via getBoresight`:** The plan listed this as a key link, but the implementation correctly passes boresight as a parameter through `roman.ts -> wcs.ts` rather than having `wcs.ts` import SIAF directly. This is a better architectural choice (pure math engine, no data dependency) and the boresight data flow is fully wired through `roman.ts`.

---

## Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| FOOT-01 | 01-01, 01-02, 01-03 | WFI footprint uses SIAF-derived 18-SCA positions with correct inter-detector gaps, 60° FPA rotation, and 0.496° boresight offset | VERIFIED (automated) + HUMAN_NEEDED (visual) | 18 detectors in JSON from pysiaf; V2V3 corners project through `v2v3ToSky`; 60° encoded in corner geometry; visual confirmation in 01-03-SUMMARY |
| FOOT-02 | 01-01, 01-02, 01-03 | Each SCA labeled WFI01-WFI18 on sky view | VERIFIED (automated) + HUMAN_NEEDED (visual) | siaf.test.ts naming tests pass; `WFIFootprint.tsx` renders `det.id` directly (WFI01 etc.); visual confirmation in 01-03-SUMMARY |
| FOOT-03 | 01-02, 01-03 | Position angle follows correct convention: V3PA East of North, with 60° FPA rotation applied | VERIFIED (automated) + HUMAN_NEEDED (visual) | wcs.test.ts PA tests pass; `FocalPlaneView.tsx` computes APA = V3PA + 60; visual rotation confirmed in 01-03-SUMMARY |
| FOOT-04 | 01-01, 01-02, 01-03 | WCS transforms use gnomonic (TAN) projection for accurate sky-to-focal-plane mapping | VERIFIED | `wcs.ts` implements Calabretta & Greisen 2002 TAN; round-trip accuracy <0.001 arcsec tested; `skyToFocalPlane` and `v2v3ToSky` both use gnomonic; no other projection code in components |

All 4 Phase 1 requirements (FOOT-01 through FOOT-04) are claimed across plans 01-01, 01-02, and 01-03. No orphaned requirements found -- REQUIREMENTS.md traceability table maps exactly FOOT-01 through FOOT-04 to Phase 1.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/data/wfi_geometry.json` | - | Old SCA-named data file still on disk | Info | Orphaned file (no imports in `src/`); cannot cause runtime errors; can be deleted in a cleanup pass |

No TODO/FIXME/placeholder comments found in any Phase 1 files. No stub implementations. No empty handlers. No `console.log`-only functions.

---

## Human Verification Required

Plan 01-03 is a human-gate checkpoint (`type: checkpoint:human-verify, gate: blocking`). The 01-03-SUMMARY.md records human approval on 2026-03-19 with all 4 success criteria marked `[x]`. For completeness, the items needing browser rendering are:

### 1. WFI Footprint Layout on Celestial Sphere (FOOT-01)

**Test:** Start `npm run dev`, select any target, examine the WFI footprint overlay on the 3D sphere view
**Expected:** 18 SCAs arranged in a 3-row x 6-column layout with visible ~60-degree rotation from a horizontal grid and non-uniform gaps between detectors; matches https://roman.gsfc.nasa.gov/science/WFI_technical.html
**Why human:** Three.js scene rendering and visual comparison with official diagram cannot be done programmatically

### 2. Detector Label Positions (FOOT-02)

**Test:** Zoom into the footprint on the sky view and read detector labels
**Expected:** Labels WFI01-WFI18 in column-major order (WFI07/08/09 leftmost column, WFI16/17/18 rightmost)
**Why human:** Spatial layout of text labels requires rendered view

### 3. PA Rotation Direction (FOOT-03)

**Test:** With a target selected, move the epoch slider and observe footprint rotation
**Expected:** Footprint rotates counterclockwise (East of North) around boresight as epoch changes; N/E compass in focal plane view updates
**Why human:** Real-time interactive rotation direction is a behavioral property

### 4. Focal Plane View Correctness (FOOT-04)

**Test:** Check the focal plane panel (top-left); verify detector polygon layout and PA display
**Expected:** Detectors appear as rotated polygons matching SIAF geometry; PA header shows APA value (should be ~60 degrees more than raw sun-based PA); star dots at plausible focal plane positions
**Why human:** SVG polygon visual shape and star scatter correctness requires runtime rendering

**Note:** Human approval of all 4 items is already recorded in `01-03-SUMMARY.md` (2026-03-19). These items are listed here for completeness and re-verification protocol.

---

## Gaps Summary

No gaps found. All 9 automated must-haves verified against the actual codebase:

- SIAF JSON exists and is substantive (517 lines, 18 WFI-named detectors, pysiaf-extracted data)
- `siaf.ts`, `wcs.ts`, `roman.ts` all exist and export the required symbols
- Test files exist, are substantive, and all 21 tests pass (11 WCS + 10 SIAF)
- All key links wired: `siaf.ts -> wfi_siaf.json`, `roman.ts -> siaf.ts`, `WFIFootprint.tsx -> wcs.ts`, `FocalPlaneView.tsx -> wcs.ts`
- No local projection code in any component (confirmed by grep across `src/components/`)
- No remaining imports of deprecated `wfi_geometry.json`
- APA = V3PA + 60 correctly implemented and displayed
- TypeScript compiles clean (`tsc --noEmit` produces no output)
- One orphaned data file (`wfi_geometry.json`) poses no functional risk

The one plan key_link that does not wire as specified (`wcs.ts` importing from `siaf.ts`) is by design: `wcs.ts` is a pure math engine that takes boresight as parameters. The boresight data flows correctly through `roman.ts` -> callers -> `wcs.ts`. This is an architectural improvement over the plan's expectation.

---

_Verified: 2026-03-19T20:25:05Z_
_Verifier: Claude (gsd-verifier)_
