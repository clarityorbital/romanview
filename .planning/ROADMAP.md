# Roadmap: RomanView

## Overview

RomanView transforms from a visually impressive but geometrically approximate observation planner into a scientifically accurate tool that astronomers can trust for real Roman Space Telescope WFI planning. The journey starts with getting the detector geometry right (SIAF foundation), then brings in real sky data (Gaia stars, SIMBAD names), then adds the workflow features that make the tool useful for collaboration and proposal preparation (PA slider, URL sharing, DS9 export), and finishes with advanced features that differentiate RomanView from alternatives (dither preview, bright star warnings, ecliptic grid).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: SIAF Geometry and WCS Engine** - Replace approximate detector layout with SIAF-derived positions and accurate coordinate transforms
- [x] **Phase 2: Live Sky Data** - Connect Gaia star catalog and SIMBAD name resolution to show real stars at any target pointing (completed 2026-03-19)
- [ ] **Phase 3: Planning Workflow** - Add interactive PA control, shareable URLs, and DS9 export for collaborative observation planning
- [ ] **Phase 4: Advanced Features** - Dither pattern preview, bright star warnings, and ecliptic coordinate overlay

## Phase Details

### Phase 1: SIAF Geometry and WCS Engine
**Goal**: Users see the WFI footprint with scientifically accurate detector positions, gaps, rotation, and labeling -- trustworthy enough to base proposal decisions on
**Depends on**: Nothing (first phase)
**Requirements**: FOOT-01, FOOT-02, FOOT-03, FOOT-04
**Success Criteria** (what must be TRUE):
  1. WFI footprint on the sky shows 18 labeled SCAs (WFI01-WFI18) with correct inter-detector gaps and the 60-degree FPA rotation visible in the layout
  2. Hovering or clicking a detector identifies it by SCA name and shows its approximate sky coverage in RA/Dec
  3. Rotating the position angle visually rotates the entire footprint around the boresight with the correct V3PA East-of-North convention
  4. Focal plane view projects sky coordinates onto detector pixels using gnomonic (TAN) projection that matches the real 0.11"/px plate scale
**Plans:** 3 plans

Plans:
- [ ] 01-01-PLAN.md — SIAF data foundation, WCS engine, and test infrastructure
- [ ] 01-02-PLAN.md — Rewire WFIFootprint and FocalPlaneView to use SIAF+WCS
- [ ] 01-03-PLAN.md — Visual verification of footprint accuracy

### Phase 2: Live Sky Data
**Goal**: Users see real Gaia stars at their target pointing and can resolve target names, turning the tool from a geometry visualizer into a sky-aware planner
**Depends on**: Phase 1
**Requirements**: TARG-01, TARG-02, TARG-03, STAR-01, STAR-02, STAR-03
**Success Criteria** (what must be TRUE):
  1. User can type a target name (e.g., "M31", "NGC 6397") and the view centers on the resolved coordinates with RA/Dec displayed in both HMS/DMS and decimal degrees
  2. User can enter coordinates manually in HMS/DMS or decimal degrees and the view updates to that pointing
  3. Real Gaia DR3 stars appear at the target pointing within a few seconds, with point sizes reflecting relative brightness
  4. In dense fields (galactic plane), the query automatically limits magnitude to keep star count under ~2000 and a density indicator shows the source count and effective magnitude limit
  5. Stars render in both the sky view and the focal plane detector view at their correct projected positions
**Plans:** 3/3 plans complete

Plans:
- [ ] 02-01-PLAN.md — Data layer: coordinate parser, fixed VizieR queries, adaptive density, useGaiaStars hook
- [ ] 02-02-PLAN.md — UI wiring: HMS/DMS input, decimal display, GaiaStarLayer, focal plane Gaia rendering
- [ ] 02-03-PLAN.md — Visual verification of all Phase 2 requirements

### Phase 3: Planning Workflow
**Goal**: Users can interactively plan observations with PA constraints, share their setup with collaborators via URL, and export detector footprints for use in DS9
**Depends on**: Phase 2
**Requirements**: PLAN-01, PLAN-02, PLAN-03
**Success Criteria** (what must be TRUE):
  1. User can drag a PA slider that shows the Sun-constrained roll range for the current target and date, and the footprint rotates in real-time as the slider moves
  2. User can copy the current URL (which encodes target, PA, date) and send it to a collaborator who sees the identical view when they open it
  3. User can click "Export DS9 Regions" and download a .reg file with FK5 polygon regions for all 18 SCAs that loads correctly in SAOImage DS9
**Plans:** 2/3 plans executed

Plans:
- [ ] 03-01-PLAN.md — Core library modules (roll range, URL state, DS9 export) with TDD
- [ ] 03-02-PLAN.md — UI components (PA slider, share button, export button) and App wiring
- [ ] 03-03-PLAN.md — Visual verification of all Phase 3 requirements

### Phase 4: Advanced Features
**Goal**: Users get additional planning capabilities that differentiate RomanView from simpler footprint viewers -- dither visualization, bright star hazard warnings, and ecliptic context
**Depends on**: Phase 3
**Requirements**: ADV-01, ADV-02, ADV-03
**Success Criteria** (what must be TRUE):
  1. User can select a dither pattern (LINEGAP or BOXGAP) and see multiple overlaid footprint positions showing how gaps are filled
  2. When a Gaia star brighter than G~8-10 falls on or near a detector, a warning indicator appears flagging potential scattered light or saturation risk
  3. User can toggle an ecliptic coordinate grid overlay showing the ecliptic plane, poles, and continuous viewing zones relative to the current pointing
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. SIAF Geometry and WCS Engine | 3/3 | Complete | 2026-03-19 |
| 2. Live Sky Data | 3/3 | Complete   | 2026-03-19 |
| 3. Planning Workflow | 2/3 | In Progress|  |
| 4. Advanced Features | 0/2 | Not started | - |
