# RomanView — Observation Planning Tool

## What This Is

A lightweight, browser-based observation planning tool for the Nancy Grace Roman Space Telescope's Wide Field Instrument (WFI). Users enter a target (by name or RA/Dec), and the app shows the precise 18-detector WFI footprint on the sky with real stars from Gaia, correct position angle, and observability constraints — all running client-side on Netlify with no backend.

## Core Value

Scientifically accurate WFI footprint placement on the sky with real coordinate transforms, so observers can plan which detectors cover their targets and when Roman can observe them.

## Requirements

### Validated

<!-- Inferred from existing codebase — these capabilities already work. -->

- ✓ 3D celestial sphere with star rendering (Three.js + React Three Fiber) — existing
- ✓ WFI 18-detector footprint visualization with correct geometry — existing
- ✓ Sun position computation via astronomy-engine for any epoch — existing
- ✓ Solar exclusion zone / field of regard constraint visualization — existing
- ✓ Observability timeline showing when targets are observable — existing
- ✓ Target list with localStorage persistence and CRUD — existing
- ✓ Focal plane view with gnomonic projection of stars onto detectors — existing
- ✓ Position angle rotation constrained by Sun position — existing
- ✓ Dark aerospace mission-control UI aesthetic — existing
- ✓ Static deployment on Netlify (no backend) — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Precise WCS-accurate footprint: correct RA/Dec for each SCA corner, accurate inter-detector gaps, real pixel scale (0.11"/px)
- [ ] Client-side Gaia star catalog queries via TAP service for real sky backdrop at target pointing
- [ ] Target name resolution via SIMBAD/Sesame CDS service (already stubbed in `src/lib/simbad.ts`)
- [ ] Sky-view mode: evolve 3D visualization to show footprint overlaid on queried star field at target coordinates
- [ ] Adjustable position angle with Sun-constrained default
- [ ] Per-detector identification: show which SCAs cover the target and surrounding field
- [ ] WFI geometry sourced from romancal/official NASA documentation for accuracy

### Out of Scope

- Simulated detector images (noise models, PSF, sensitivity) — too heavy for a planning tool
- Real sky survey imagery backdrop (DSS/2MASS tiles) — bandwidth-heavy, complex tile management
- Exposure time calculator — separate tool domain
- Grism/prism mode planning — focus on imaging mode first
- Mobile-native app — web-first, responsive is fine
- User accounts / server-side persistence — keeping it static on Netlify
- Multi-instrument planning (coronagraph) — WFI only

## Context

- **Existing app:** React 19 + Vite 8 + Three.js + React Three Fiber. Already has 3D celestial sphere, detector layout, constraint visualization, and focal plane projection. Core astronomy math in `src/lib/`.
- **Key reference sources:**
  - romancal GitHub repo (spacetelescope/romancal) — WFI detector geometry, SIAF data, coordinate transforms
  - NASA WFI Technical page: https://science.nasa.gov/mission/roman-space-telescope/wfi-technical/
  - Roman SIAF (Science Instrument Aperture File) for precise detector positions
- **Existing stubs:** `src/lib/simbad.ts` and `src/lib/vizier.ts` exist but aren't yet integrated
- **Static data:** `src/data/wfi_geometry.json` has detector positions; may need updating from romancal SIAF

## Constraints

- **Deployment:** Must remain static-site deployable on Netlify — no server, no serverless functions
- **Bundle size:** Keep lightweight; prefer runtime API queries over large bundled datasets
- **API dependencies:** SIMBAD/Sesame and Gaia TAP are public, CORS-friendly services — but must handle failures gracefully
- **Browser:** Modern browsers only (ES2023+, WebGL2 required for Three.js)
- **Accuracy source:** WFI geometry must trace back to official documentation (romancal SIAF or NASA specs), not approximations

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Evolve existing 3D viz rather than replace | Preserves working constraint visualization, reduces throwaway work | — Pending |
| Client-side Gaia TAP queries for star catalog | Keeps bundle small, provides real stars at any pointing | — Pending |
| SIMBAD/Sesame for name resolution | Standard astronomy tool, CDS service is reliable and CORS-friendly | — Pending |
| Precise WCS from romancal SIAF | Single source of truth for detector positions, community-standard | — Pending |

---
*Last updated: 2026-03-19 after initialization*
