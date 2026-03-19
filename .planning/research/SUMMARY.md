# Research Summary: RomanView Observation Planning Tool

**Domain:** Browser-based Roman Space Telescope WFI observation planner
**Researched:** 2026-03-19
**Overall confidence:** HIGH

## Executive Summary

RomanView occupies a valuable niche in the Roman Space Telescope observation planning ecosystem. The official tool (APT) is a heavyweight Java desktop application that requires installation, program creation, and significant onboarding. The STScI Jupyter notebooks are accurate but require a Python environment. Aladin Lite and ESASky are general-purpose sky viewers with no Roman-specific awareness. RomanView's value proposition is immediate, browser-based access to WFI footprint visualization with real star fields and constraint awareness -- the quick-look tool that feeds into the APT workflow.

The timing is exceptional. Roman Cycle 1 proposals closed March 17, 2026, with launch scheduled for September 2026. The community is actively preparing proposals and observations. A lightweight planning tool serves both current proposers and future cycle planners. No equivalent browser-based Roman-specific tool exists in the ecosystem.

The existing codebase has strong foundations: a working 3D celestial sphere with star rendering, constraint visualization (Sun exclusion, observability windows), detector layout, and focal plane view. The critical gap is scientific accuracy -- the current detector geometry uses an approximate regular grid that does not match the real SIAF-derived detector positions (60-degree FPA rotation, 0.496-degree boresight offset, non-uniform gaps). Closing this accuracy gap is the highest-priority work. The second priority is connecting the existing Sesame/Gaia API stubs to the UI so users get real star fields and name resolution.

The stack requires zero new npm dependencies. The existing React + Three.js + astronomy-engine stack handles everything needed. External API access (CDS Sesame for names, VizieR TAP for Gaia stars) is already stubbed and CORS-verified. The main data work is extracting accurate detector geometry from pysiaf into a static JSON file.

## Key Findings

**Stack:** No new dependencies needed. Custom TAN projection (~40 LOC) replaces any WCS library. SIAF data extracted from pysiaf into static JSON. VizieR TAP (CORS-friendly) for Gaia DR3 queries.

**Architecture:** Layered approach -- SIAF geometry engine (static JSON) + async catalog query layer (Gaia TAP with IndexedDB cache) + dual rendering (Three.js for stars, SVG for detector annotations). All coordinate math centralized in a new WCS engine module.

**Critical pitfall:** The TAPVizieR Gaia table uses VizieR column names (RAJ2000, DEJ2000, Gmag) NOT ESA Gaia column names (ra, dec, phot_g_mean_mag). The existing `vizier.ts` code uses the wrong column names and will fail silently. Must be fixed before any Gaia integration work.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **SIAF Foundation + WCS Engine** - Build the accurate geometry layer first
   - Addresses: Accurate 18-SCA footprint (table stakes), SCA identification, PA convention
   - Avoids: Wrong detector layout (Pitfall 4), wrong PA convention (Pitfall 6), wrong SCA numbering (Pitfall 5)

2. **Live Catalog Integration** - Connect Gaia and SIMBAD APIs to the UI
   - Addresses: Target name resolution (table stakes), real star field backdrop (table stakes)
   - Avoids: Wrong column names (Pitfall 1), CORS failures (Pitfall 3), unbounded queries (Pitfall 16), galactic plane density (Pitfall 10)

3. **Star Rendering + Focal Plane Evolution** - Show queried stars in both views
   - Addresses: Focal plane detail view with star projections (differentiator)
   - Avoids: SVG performance with 2000+ stars (Pitfall 10), RA wrap-around (Pitfall 8), projection near poles (Pitfall 11)

4. **Planning Workflow Features** - PA slider, shareable URLs, DS9 export
   - Addresses: Interactive PA slider (differentiator), shareable URL (differentiator), DS9 export (differentiator)
   - Avoids: URL encoding issues (Pitfall 8 in FEATURES), timezone issues (Pitfall 12 in FEATURES)

5. **Advanced Features** - Dither preview, bright star warnings, ecliptic overlay
   - Addresses: Dither pattern preview, bright star avoidance, ecliptic grid
   - Avoids: Scope creep into ETC/simulation territory (anti-features)

**Phase ordering rationale:**
- Phase 1 must come first because every other phase depends on correct coordinate transforms and detector geometry. Building features on top of the current approximate geometry would create technical debt that requires rework.
- Phase 2 (catalog integration) is independent of Phase 1's geometry work and could run in parallel, but sequencing them avoids integration headaches.
- Phase 3 connects Phases 1 and 2 -- it requires both correct geometry (for focal plane projection) and catalog data (for star sources).
- Phase 4 features are user-facing polish that builds on the foundation of Phases 1-3.
- Phase 5 is pure value-add that can be deferred or de-scoped without affecting the core tool.

**Research flags for phases:**
- Phase 1: Needs pysiaf SIAF extraction (one-time Python script, well-documented). The V2V3 to sky transform chain needs careful validation against APT or pysiaf ground truth.
- Phase 2: The TAPVizieR column name issue (RAJ2000 not ra) is the most critical finding. Must be verified empirically during implementation.
- Phase 4: DS9 region file format is simple text but polygon vertex ordering matters. Test with actual DS9.
- Phase 5: Dither pattern offsets would need to be researched from WFI dithering documentation (LINEGAP and BOXGAP geometries).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new dependencies. All APIs tested for CORS. Existing codebase verified. |
| Features | HIGH | Mapped against APT, Aladin Lite, ESASky, STScI notebooks. Competitive landscape well-understood. |
| Architecture | HIGH | Data flow validated against existing codebase. Rendering strategy proven (Three.js + SVG). |
| Pitfalls | HIGH | Most critical pitfalls verified empirically (CORS headers, column names, coordinate offsets). Geometry issues confirmed against official documentation. |
| WFI Geometry (SIAF) | HIGH | V2V3 reference positions extracted from pysiaf XML. 60-deg rotation and 0.496-deg offset confirmed from multiple sources. |
| Gaia TAP Integration | HIGH | Endpoint verified, CORS confirmed, column names identified (but must be fixed in code). |
| PA Conventions | MEDIUM | V3PA vs aperture PA vs FPA PA distinction is documented but the exact implementation needs validation against pysiaf or APT output. |
| Dither Patterns | LOW | Documented at concept level (LINEGAP, BOXGAP) but exact offset values not extracted. Would need deeper research for Phase 5. |

## Gaps to Address

- **Exact dither pattern offsets:** The LINEGAP and BOXGAP dither geometries are described qualitatively in WFI documentation but exact step sizes in arcseconds need to be extracted from APT or WFI dithering documentation for Phase 5.
- **Guide star requirements:** Roman guide star magnitude range and position constraints are not yet fully documented in public documentation. Deferred as a feature.
- **Inter-detector gap sizes:** The exact gap dimensions in arcseconds are not stated in any public document we found. They are implicitly encoded in the SIAF corner coordinates, which is why extracting SIAF data is the correct approach (rather than trying to parameterize gap sizes separately).
- **PA validation ground truth:** Need to compare at least one known pointing/date configuration against pysiaf or APT output to validate the V3PA implementation end-to-end.
- **TAPVizieR column name verification:** The parallel pitfalls researcher identified that the existing code uses wrong column names. This should be verified with an actual browser fetch test early in implementation.
- **Roman mission timeline updates:** Launch is September 2026 but could shift. Operations timeline and Cycle 2 proposal dates will affect tool relevance window.

## Sources

### Official Documentation (HIGH confidence)
- [Roman APT Documentation](https://roman-docs.stsci.edu/raug/astronomers-proposal-tool-apt)
- [Roman WFI Technical (NASA GSFC)](https://roman.gsfc.nasa.gov/science/WFI_technical.html)
- [Roman Observatory Technical (NASA GSFC)](https://roman.gsfc.nasa.gov/science/observatory_technical.html)
- [Roman Coordinate Systems](https://roman-docs.stsci.edu/data-handbook-home/wfi-data-format/coordinate-systems)
- [PySIAF for Roman](https://roman-docs.stsci.edu/simulation-tools-handbook-home/simulation-development-utilities/pysiaf-for-roman)
- [WFI Quick Reference](https://roman-docs.stsci.edu/roman-instruments/the-wide-field-instrument/observing-with-the-wfi/wfi-quick-reference)
- [WFI Dithering](https://roman-docs.stsci.edu/roman-instruments/the-wide-field-instrument/observing-with-the-wfi/wfi-dithering)
- [Description of the WFI](https://roman-docs.stsci.edu/roman-instruments-home/wfi-imaging-mode-user-guide/wfi-design/description-of-the-wfi)
- [Roman Science Planning Toolbox (STScI)](https://www.stsci.edu/roman/science-planning-toolbox)
- [Roman Cycle 1 Call for Proposals](https://roman-docs.ipac.caltech.edu/roman-proposals-home/cycle-1-call-for-proposals)
- [Roman Field, Slew, and Roll](https://roman.gsfc.nasa.gov/science/field_slew_and_roll.html)

### Tool References (HIGH confidence)
- [Aladin Lite Documentation](https://aladin.cds.unistra.fr/AladinLite/doc/)
- [JWST APT Aladin Viewer](https://jwst-docs.stsci.edu/jwst-astronomer-s-proposal-tool-overview/additional-jwst-apt-functionality/apt-aladin-viewer)
- [ESASky Interface](https://www.cosmos.esa.int/web/esdc/esasky-interface)
- [pysiaf GitHub](https://github.com/spacetelescope/pysiaf)
- [VizieR TAP for Gaia DR3](https://vizier.cds.unistra.fr/viz-bin/VizieR-3?-source=I/355/gaiadr3)

### Verified API Endpoints (HIGH confidence)
- CDS Sesame: `https://cdsweb.u-strasbg.fr/cgi-bin/nph-sesame/` (CORS: *)
- CDS SIMBAD TAP: `https://simbad.cds.unistra.fr/simbad/sim-tap/sync` (CORS: *)
- CDS VizieR TAP: `https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync` (CORS: *)
- ESA Gaia Archive: `https://gea.esac.esa.int/tap-server/tap/sync` (NO CORS -- do not use from browser)
