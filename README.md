# RomanView

Interactive 3D observation planning tool for the Nancy Grace Roman Space Telescope. Visualize the Wide Field Instrument (WFI) footprint on the sky, check observability constraints, and plan detector placement for your targets.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app runs at `http://localhost:5173` (Vite will pick the next available port if 5173 is in use).

## Other Commands

```bash
npm run build      # Production build (outputs to dist/)
npm run preview    # Preview production build locally
npm run lint       # Run ESLint
```

## Features

- **SIMBAD Target Search** -- Look up targets by name with autocomplete suggestions. Also supports manual RA/Dec coordinate entry.
- **3D Celestial Scene** -- Interactive Three.js sky sphere with background stars, Gaia catalog overlay, coordinate grid, and galactic plane.
- **WFI Footprint Overlay** -- 18-detector mosaic placed at the correct position angle on the sky using real SIAF geometry extracted from pysiaf.
- **Observability Constraints** -- Sun/Earth/Moon exclusion zones and field-of-regard visualization based on the selected epoch.
- **Observability Timeline** -- Shows when your target is observable across the year.
- **Position Angle Control** -- Slider to adjust the V3 position angle; nominal PA computed from spacecraft roll constraints.
- **Focal Plane View** -- 2D detector layout with Gaia star positions projected onto the focal plane.
- **DS9 Region Export** -- Export the WFI footprint as a SAOImage DS9 region file.
- **URL Sharing** -- Target, epoch, and PA state encoded in the URL hash for shareable links.
- **3D Telescope Model** -- Roman Space Telescope STL model that rotates to point toward the selected target.

## Tech Stack

- React 19 + TypeScript
- Vite 8
- Three.js / React Three Fiber / Drei
- Tailwind CSS 4
- astronomy-engine (ephemeris calculations)

## Project Structure

```
src/
  components/
    scene/    -- 3D scene: telescope, stars, footprint, grid, constraints
    ui/       -- Panels: search, target list, sliders, export, focal plane
    layout/   -- App shell layout
  hooks/      -- useTargets, useEphemeris, useGaiaStars
  lib/        -- Coordinate math, SIAF data, SIMBAD/VizieR clients,
                 DS9 export, URL state, roll range calculations
public/
  models/     -- Roman Space Telescope STL model
```
