# Feature Landscape

**Domain:** Astronomy observation planning tool (space telescope WFI footprint visualization)
**Researched:** 2026-03-19

## Table Stakes

Features users expect from any WFI footprint planning tool. Missing = astronomers dismiss the tool and use APT/Aladin directly.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Target name resolution (SIMBAD/Sesame)** | Every planning tool resolves names. Typing "M31" must return coordinates. | Low | Already stubbed in `simbad.ts`. Sesame XML resolver is more reliable for exact names than TAP queries. Use Sesame first, fall back to TAP. |
| **RA/Dec coordinate entry** | Manual coordinate input is baseline for any pointing tool. Must accept HMS/DMS and decimal degrees. | Low | Parsing both formats is essential. Include J2000 epoch label. |
| **Accurate 18-SCA footprint overlay** | The entire purpose of this tool. Must show correct detector positions, sizes, and gaps relative to boresight. | High | Current geometry uses uniform 7.5' detectors + 0.5' gaps in a regular grid. Real layout from SIAF has non-uniform gaps (smaller between rows 2-3 due to alternating detector orientations) and a 60-degree rotation of the FPA relative to the V3 axis. Must be corrected using romancal SIAF data. |
| **Position angle display and rotation** | Observers need to know how the footprint is oriented on the sky. PA determines which SCAs cover which sources. | Medium | Already implemented with Sun-constrained PA. Must clearly show PA convention: angle of the +V3 axis measured East of North. Roman's PA is Sun-constrained with +/-15 deg roll freedom. |
| **Sun constraint visualization** | Roman has strict pointing constraints: 54-126 deg pitch from Sun line. Observers must see if/when their target is observable. | Medium | Already implemented (exclusion zones, observability timeline). Pitch range 54-126 deg from Sun = cannot point within 54 deg of Sun or within 36 deg of anti-Sun direction. |
| **Observability windows** | "When can Roman see my target?" is the first question proposers ask. Must show date ranges of visibility. | Medium | Already implemented as timeline. Should clearly show the ~72-degree wide annular field of regard that rotates with Earth's orbit. Targets near ecliptic poles have continuous visibility; targets near ecliptic plane have two ~2-month windows per year. |
| **SCA identification** | Must label which SCA (SCA01-SCA18) covers the target and surrounding field. Critical for proposal writing where specific detectors matter. | Low | Already partially done in focal plane view. Must be clear in sky-view overlay too. |
| **Real star field backdrop** | Observers need to see actual stars at the pointing to verify field context, identify guide stars, avoid bright stars on detector edges. | High | Requires Gaia DR3 cone search via VizieR TAP. WFI FOV is ~0.8 x 0.4 deg, so cone radius of ~0.5 deg captures the footprint. Query should be magnitude-limited (G < 18-20 depending on density) and row-limited (500-2000 stars max for browser performance). |
| **Coordinate display** | Show current pointing coordinates, mouse-hover coordinates, and target coordinates in both RA/Dec (HMS/DMS) and decimal degrees. | Low | Already implemented in `CoordinateDisplay.tsx`. |
| **Filter selection** | Show which WFI filter is being used. Eight imaging filters (F062-F213) plus F146 wide band. Affects sensitivity/planning context. | Low | Already implemented. Informational for planning context rather than affecting footprint geometry. |

## Differentiators

Features that set RomanView apart from APT and generic tools. Not strictly expected, but make the tool genuinely useful for proposers.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Instant browser-based access (no install)** | APT is a heavy Java desktop app. RomanView loads in seconds with zero setup. Proposers can quickly check a pointing without downloading anything. | Low (already achieved) | This is the core differentiator. APT requires installation, Java runtime, program setup. RomanView is a URL. |
| **Dither pattern preview** | Show how gap-filling dithers (LINEGAP2-5, BOXGAP) shift the footprint to cover detector gaps. Proposers need to understand coverage before committing in APT. | High | Would need to show multiple footprint positions overlaid with transparency. LINEGAP3 is the most common pattern (3 diagonal offsets). Offsets are ~3 arcminutes to bridge detector gaps. |
| **Interactive PA slider with Sun constraint band** | APT shows orient ranges as a clock diagram. RomanView can show a continuous slider with the allowed +/-15 deg roll range highlighted and footprint rotating in real-time as user adjusts. | Medium | Already partially implemented. Enhance with clear visual indicator of the allowed roll range for the selected date. The default PA should be the Sun-optimal angle. |
| **Focal plane detail view with star projections** | Show a zoomed flat view of all 18 SCAs with queried stars projected onto detector pixel coordinates using gnomonic projection. Lets observers see exactly where sources fall on silicon. | High | Already exists as `FocalPlaneView.tsx`. Enhance with Gaia stars projected via WCS transforms. This is something APT does not do interactively in the browser. |
| **Coverage depth map for mosaics** | For multi-tile observations, show a heatmap of how many exposures cover each sky position. Essential for survey planning. | Very High | Deferred. This is what STScI's Jupyter footprint viewer does. Would be a significant differentiator but requires substantial implementation. |
| **Export footprint as DS9 region file** | Let observers export the WFI footprint corners as a SAOImage DS9 region file (.reg) for use in their analysis workflows. Standard format astronomers already use. | Medium | Generate polygon regions for each SCA in FK5 coordinates. Simple text format. Very useful for proposal figures and follow-up analysis. |
| **Shareable URL with encoded state** | Encode target, PA, date, and zoom in URL parameters so observers can share specific pointings with collaborators. | Medium | Standard web pattern. Encode RA, Dec, PA, epoch, filter in URL hash or query params. No backend needed. |
| **Multi-target comparison** | Allow loading multiple targets and quickly switching between them. Target list with observability status for each. | Medium | Already have `TargetList` with localStorage persistence. Enhance with visibility status badges per target. |
| **Bright star avoidance warning** | Flag when a bright star (G < 8-10) falls near a detector edge or in the field, which could cause scattered light or saturation artifacts. | Medium | Query bright stars separately. Roman WFI saturates around G~7-8 mag depending on filter and exposure time. Visual warning overlay. |
| **Ecliptic coordinate grid overlay** | Roman's field of regard is defined in ecliptic coordinates (pitch/yaw from Sun). Showing ecliptic grid helps observers understand visibility geometry. | Low | Already have galactic plane. Add ecliptic plane and poles as optional overlay. Ecliptic poles are the continuous viewing zones. |
| **Guide star assessment** | Indicate potential guide star candidates within the WFI FOV or adjacent guider FOV. Roman uses the WFI itself for guiding. | High | Would need Roman guide star requirements (magnitude range, position constraints). Useful but complex and requirements may not be fully public yet. Defer. |

## Anti-Features

Features to explicitly NOT build. Resist the temptation.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Simulated detector images** | Noise models, PSFs, cosmic rays, detector artifacts are the domain of STIPS/Roman I-Sim. Adds enormous complexity for no unique value. | Link to Roman I-Sim and STIPS documentation for users who need simulated images. |
| **Exposure time calculator** | Pandeia/RIST already provide this as official tools. Reimplementing would be inaccurate and unmaintained. | Link to the official Roman WFI ETC web interface. Show filter info for context only. |
| **Sky survey image tiles (DSS/2MASS backdrop)** | HiPS tile loading is bandwidth-heavy, requires tile math, and Aladin Lite already does this perfectly. Would make the app slow and complex. | Use point-source star catalogs (Gaia) for field context. Point users to Aladin Lite for survey image exploration. Optionally, consider embedding Aladin Lite in a future version rather than reimplementing. |
| **Grism/prism spectroscopy planning** | Grism mode has complex dispersed-source overlap analysis that requires specialized tools. Out of scope for imaging footprint planning. | Note that WFI has grism/prism modes but this tool focuses on imaging mode. Link to relevant STScI documentation. |
| **User accounts / server-side state** | Adds backend infrastructure, authentication complexity, GDPR concerns. Destroys the "static Netlify deploy" advantage. | localStorage for target persistence. URL encoding for sharing. Export/import JSON for backup. |
| **Coronagraph instrument planning** | Completely different instrument with different FOV, different constraints. Roman has a separate coronagraph instrument. | Clearly label this as "WFI observation planning" only. |
| **Precise scheduling / conflict detection** | APT handles scheduling. Attempting to replicate mission scheduling logic would be perpetually wrong. | Show observability windows and constraints. Defer actual scheduling to APT. |
| **Airmass / ground-based observing metrics** | Roman is a space telescope at L2. There is no airmass, no horizon, no weather. | Only show space-telescope-relevant constraints: Sun exclusion, anti-Sun exclusion, field of regard. |
| **Mobile-native app** | Small screen makes footprint visualization useless. Astronomy planning is a desktop activity. | Responsive CSS for tablet-ish sizes is fine. Do not optimize for phone screens. |

## Feature Dependencies

```
Target Name Resolution (SIMBAD/Sesame)
  |
  v
RA/Dec Coordinate Entry  -----> Accurate 18-SCA Footprint Overlay
                                   |            |
                                   v            v
                         Position Angle    SCA Identification
                         Display/Rotation       |
                              |                 v
                              v          Focal Plane Detail View
                    Sun Constraint           with Star Projections
                    Visualization               |
                         |                      v
                         v              Bright Star Avoidance
                    Observability            Warning
                    Windows
                         |
                         v
                    Interactive PA Slider
                    with Sun Constraint Band

Real Star Field Backdrop (Gaia TAP)
  |
  +---> Focal Plane Detail View with Star Projections
  |
  +---> Bright Star Avoidance Warning

Shareable URL (independent, can be added anytime)

Export DS9 Region File (depends on accurate footprint)

Dither Pattern Preview (depends on accurate footprint + PA)

Multi-target Comparison (depends on target name resolution + observability)
```

## MVP Recommendation

### Phase 1: Accurate Footprint Foundation

Prioritize these first -- they are the core value proposition:

1. **Target name resolution** (SIMBAD Sesame) -- already stubbed, quick win
2. **Accurate 18-SCA footprint from SIAF data** -- corrects the current approximate geometry with real detector positions including the 60-degree FPA rotation and non-uniform gaps
3. **Real star field via Gaia TAP** -- transforms the tool from abstract to scientifically useful
4. **SCA identification on sky view** -- "which detector is my target on?"

### Phase 2: Planning Workflow

These make the tool genuinely useful for Cycle 1 proposers:

5. **Interactive PA slider with roll constraint band** -- enhance existing PA control
6. **Shareable URL with encoded state** -- critical for collaboration, zero backend cost
7. **Export DS9 region file** -- bridges to existing astronomer workflows

### Phase 3: Advanced Planning

Differentiating features for power users:

8. **Dither pattern preview** -- gap coverage visualization
9. **Bright star avoidance warnings** -- prevents proposal errors
10. **Ecliptic coordinate overlay** -- helps visualize field of regard geometry

### Defer Indefinitely

- Coverage depth map (too complex, Jupyter notebooks serve this need)
- Guide star assessment (requirements not fully public)
- Aladin Lite embedding (consider only after core features are solid)

## Gaia Catalog Query Recommendations

Based on research into TAP services and browser performance:

| Parameter | Recommended Value | Rationale |
|-----------|-------------------|-----------|
| **Cone search radius** | 0.5 degrees | WFI FOV is ~0.8 x 0.4 deg. A 0.5 deg radius captures the full footprint with some margin. Larger radii return too many sources. |
| **Magnitude limit** | G < 20 (default), G < 17 (dense fields) | Roman WFI detects to ~28 mag but we only need catalog stars for visual context. G < 20 gives good field representation. In the galactic plane (dense fields), tighten to G < 17 to avoid overwhelming the browser. |
| **Row limit** | TOP 2000 (max), TOP 500 (default display) | Browser can render ~2000 point sprites smoothly via Three.js instancing. ORDER BY phot_g_mean_mag ASC ensures brightest stars are always included. |
| **Service endpoint** | `https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync` | VizieR TAP is CORS-friendly for browser fetch. ESA Gaia archive (gea.esac.esa.int) may have CORS restrictions. CDS/VizieR is the standard for client-side astronomy web apps. |
| **Catalog table** | `"I/355/gaiadr3"` | Gaia DR3 via VizieR. Stable table identifier. |
| **Adaptive density** | Detect source count, adjust magnitude limit | If initial query returns > 1500 sources, re-query with tighter magnitude cut. Provides smooth experience for both sparse high-latitude fields and dense galactic plane fields. |

## Roman Position Angle / Roll Angle Conventions

Based on official documentation research:

| Parameter | Value | Source |
|-----------|-------|--------|
| **PA convention** | Position angle of +V3 axis, measured East of North on sky | Roman coordinate systems documentation |
| **FPA rotation** | WFI FPA is rotated 60 degrees from -V3 axis | Roman coordinate systems doc (roman-docs.stsci.edu) |
| **FPA offset** | WFI center (WFI_CEN) offset 0.496 deg from telescope boresight (V1) | Roman coordinate systems doc |
| **Roll range** | +/- 15 degrees from solar-power-optimal orientation | Observatory technical specs (roman.gsfc.nasa.gov) |
| **Pitch range** | 54-126 degrees from Sun line | Observatory technical (54 deg Sun exclusion, 36 deg anti-Sun exclusion) |
| **Field of regard** | ~59% of sky accessible on any given day | 72-deg pitch range x 360-deg yaw |
| **Continuous viewing zone** | Near ecliptic poles (within ~36 deg of poles) | Geometry of pitch constraint + annual Earth orbit |

**Critical implementation detail:** The PA that controls footprint orientation on the sky is not a free parameter -- it is constrained by the Sun position. For a given target and date, the optimal PA places the solar array perpendicular to the Sun. The +/-15 deg roll freedom around this optimal angle is the only user-adjustable range. The existing `positionAngle()` function in `coordinates.ts` computes the bearing from target to Sun, which approximates the Sun-optimal PA correctly.

## Observation Planning Workflow (How Proposers Actually Use These Tools)

Based on Roman Cycle 1 Call for Proposals and APT documentation:

1. **Science target selection** -- Proposer identifies targets from their science case
2. **Visibility check** -- "Can Roman see this target? When?" Check field of regard constraints
3. **Footprint placement** -- "Which detectors cover my target at what PA?" Place WFI footprint on sky
4. **PA optimization** -- "What PA gives best detector coverage?" Rotate within allowed roll range
5. **Dither strategy** -- "How do I fill detector gaps?" Select dither pattern
6. **Survey tiling** -- (For surveys) "How do I mosaic a large region?" Tile planning
7. **ETC verification** -- "Can I detect my sources?" Run exposure time calculator
8. **APT entry** -- Encode the designed observation into APT for formal proposal submission

**RomanView serves steps 2-4 directly** and provides context for step 5. Steps 7-8 are handled by official tools. This is the sweet spot: quick, visual, interactive planning that feeds into the formal APT workflow.

## Competitive Landscape

| Tool | Strengths | Weaknesses | RomanView Opportunity |
|------|-----------|------------|----------------------|
| **Roman APT** | Official, complete, validated | Heavy Java app, complex UI, requires installation and program setup | Instant browser access for quick checks |
| **Aladin Lite** | Beautiful sky imagery, catalog overlays, embeddable | Generic (not Roman-specific), no WFI footprint, no Sun constraints | Roman-specific footprint + constraints in one view |
| **ESASky** | Multi-mission, planning tool for JWST | No Roman support yet, server-dependent | First-mover for Roman-specific web planning |
| **STScI Jupyter Notebooks** | Accurate (uses pysiaf), flexible | Requires Python environment, not interactive real-time | Real-time interactive version of notebook analysis |
| **WorldWide Telescope** | Immersive 3D sky, WebGL | No instrument-specific planning features | Focused tool vs general sky viewer |

## Sources

- [Roman APT Documentation](https://roman-docs.stsci.edu/raug/astronomers-proposal-tool-apt) - HIGH confidence
- [Roman WFI Technical (NASA GSFC)](https://roman.gsfc.nasa.gov/science/WFI_technical.html) - HIGH confidence
- [Roman Observatory Technical](https://roman.gsfc.nasa.gov/science/observatory_technical.html) - HIGH confidence
- [Roman Coordinate Systems](https://roman-docs.stsci.edu/data-handbook-home/wfi-data-format/coordinate-systems) - HIGH confidence
- [PySIAF for Roman](https://roman-docs.stsci.edu/simulation-tools-handbook-home/simulation-development-utilities/pysiaf-for-roman) - HIGH confidence
- [WFI Quick Reference](https://roman-docs.stsci.edu/roman-instruments/the-wide-field-instrument/observing-with-the-wfi/wfi-quick-reference) - HIGH confidence
- [WFI Dithering](https://roman-docs.stsci.edu/roman-instruments/the-wide-field-instrument/observing-with-the-wfi/wfi-dithering) - HIGH confidence
- [Roman Field, Slew, and Roll](https://roman.gsfc.nasa.gov/science/field_slew_and_roll.html) - HIGH confidence
- [Description of the WFI](https://roman-docs.stsci.edu/roman-instruments-home/wfi-imaging-mode-user-guide/wfi-design/description-of-the-wfi) - HIGH confidence
- [JWST APT Aladin Viewer](https://jwst-docs.stsci.edu/jwst-astronomer-s-proposal-tool-overview/additional-jwst-apt-functionality/apt-aladin-viewer) - HIGH confidence (JWST reference)
- [Aladin Lite Documentation](https://aladin.cds.unistra.fr/AladinLite/doc/) - HIGH confidence
- [Roman Science Planning Toolbox (STScI)](https://www.stsci.edu/roman/science-planning-toolbox) - HIGH confidence
- [Roman Cycle 1 Call for Proposals](https://roman-docs.ipac.caltech.edu/roman-proposals-home/cycle-1-call-for-proposals) - HIGH confidence
- [GalSim Roman Module](https://galsim-developers.github.io/GalSim/_build/html/roman.html) - MEDIUM confidence (simulation-focused)
- [VizieR TAP for Gaia DR3](https://vizier.cds.unistra.fr/viz-bin/VizieR-3?-source=I/355/gaiadr3) - HIGH confidence
- [Gaia DR3 Data Extraction (ESA)](https://www.cosmos.esa.int/web/gaia-users/archive/extract-data) - HIGH confidence
