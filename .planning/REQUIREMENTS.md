# Requirements: RomanView

**Defined:** 2026-03-19
**Core Value:** Scientifically accurate WFI footprint placement on the sky with real coordinate transforms, so observers can plan which detectors cover their targets and when Roman can observe them.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Footprint Accuracy

- [x] **FOOT-01**: WFI footprint uses SIAF-derived 18-SCA positions with correct inter-detector gaps, 60° FPA rotation, and 0.496° boresight offset
- [x] **FOOT-02**: Each SCA is labeled (WFI01-WFI18) on the sky view so observers can identify which detector covers their target
- [x] **FOOT-03**: Position angle follows correct convention: V3PA measured East of North, with 60° FPA rotation applied to detector orientation
- [x] **FOOT-04**: WCS coordinate transforms use gnomonic (TAN) projection for accurate sky-to-focal-plane mapping

### Target Input

- [x] **TARG-01**: User can resolve target names to RA/Dec via SIMBAD/Sesame (e.g., "M31" → 10.6847° +41.2687°)
- [x] **TARG-02**: User can enter coordinates manually in both HMS/DMS (e.g., 00h42m44s +41°16'09") and decimal degrees
- [x] **TARG-03**: Current pointing coordinates displayed in both RA/Dec formats (HMS/DMS and decimal)

### Star Field

- [x] **STAR-01**: User sees real Gaia DR3 stars at the target pointing via VizieR TAP cone search (~0.5° radius, magnitude-limited)
- [x] **STAR-02**: Star query adapts to field density — tighter magnitude cut in galactic plane, deeper in sparse fields — to keep rendering performant (<2000 stars)
- [x] **STAR-03**: Star density indicator shows source count and effective magnitude limit for the current field

### Planning Workflow

- [x] **PLAN-01**: Interactive PA slider shows the Sun-constrained ±15° roll range for the selected target and date, with footprint rotating in real-time
- [x] **PLAN-02**: Observation state (target, PA, date, filter) encoded in shareable URL — observers can send a link to collaborators
- [x] **PLAN-03**: User can export WFI footprint as DS9 region file (.reg) with polygon regions for each SCA in FK5 coordinates

### Advanced Features

- [ ] **ADV-01**: User can preview dither patterns (LINEGAP, BOXGAP) showing multiple footprint positions overlaid to visualize gap coverage
- [ ] **ADV-02**: Bright star warning flags when stars G < 8-10 fall on or near detector edges, risking scattered light or saturation
- [ ] **ADV-03**: Ecliptic coordinate grid overlay showing ecliptic plane, poles, and continuous viewing zones

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Coverage & Survey Planning

- **COV-01**: Coverage depth map showing exposure count per sky position for multi-tile observations
- **COV-02**: Survey tiling planner for mosaicking large sky regions

### Guide Stars

- **GUID-01**: Guide star candidate identification within WFI FOV based on magnitude constraints
- **GUID-02**: Guide star magnitude range display per filter

### Multi-instrument

- **INST-01**: Coronagraph instrument FOV overlay (separate from WFI)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Simulated detector images (noise, PSF, cosmic rays) | Domain of STIPS/Roman I-Sim; enormous complexity for no unique value |
| Exposure time calculator | Pandeia/RIST are official tools; reimplementing would be inaccurate |
| Sky survey image tiles (DSS/2MASS backdrop) | Bandwidth-heavy, Aladin Lite already does this; use point-source catalogs instead |
| Grism/prism spectroscopy planning | Complex dispersed-source overlap analysis; separate tool domain |
| User accounts / server-side state | Destroys static Netlify advantage; use localStorage + URL sharing |
| Mobile-native optimization | Small screens make footprint visualization useless; responsive CSS sufficient |
| Precise scheduling / conflict detection | APT handles scheduling; replicating mission logic would be perpetually wrong |
| Airmass / ground-based metrics | Roman is at L2; no airmass, horizon, or weather |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOOT-01 | Phase 1 | Complete |
| FOOT-02 | Phase 1 | Complete |
| FOOT-03 | Phase 1 | Complete |
| FOOT-04 | Phase 1 | Complete |
| TARG-01 | Phase 2 | Complete |
| TARG-02 | Phase 2 | Complete |
| TARG-03 | Phase 2 | Complete |
| STAR-01 | Phase 2 | Complete |
| STAR-02 | Phase 2 | Complete |
| STAR-03 | Phase 2 | Complete |
| PLAN-01 | Phase 3 | Complete |
| PLAN-02 | Phase 3 | Complete |
| PLAN-03 | Phase 3 | Complete |
| ADV-01 | Phase 4 | Pending |
| ADV-02 | Phase 4 | Pending |
| ADV-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after roadmap creation*
