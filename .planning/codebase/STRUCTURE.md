# Codebase Structure

**Analysis Date:** 2026-03-19

## Directory Layout

```
/workspace/RomanView/
├── public/                    # Static assets (if any)
├── src/                       # TypeScript source
│   ├── components/
│   │   ├── layout/            # Layout wrappers and containers
│   │   ├── scene/             # Three.js / React Three Fiber scene components
│   │   └── ui/                # Interactive UI controls and displays
│   ├── hooks/                 # React hooks (state, side effects)
│   ├── lib/                   # Pure utility functions and astronomy logic
│   ├── data/                  # Static JSON data (star catalog, geometry)
│   ├── App.tsx                # Root component composition
│   ├── main.tsx               # React DOM entry point
│   └── index.css              # Global styles + Tailwind
├── index.html                 # HTML entry point
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite build configuration
└── .eslintrc.cjs              # ESLint rules
```

## Directory Purposes

**src/components/layout/:**
- Purpose: Page layout structure and component composition helpers
- Contains: Only `AppLayout.tsx` — defines the multi-panel HUD layout
- Key files: `AppLayout.tsx` (flexbox/positioning for viewport, sidebar, header, footer bars)

**src/components/scene/:**
- Purpose: 3D celestial visualization components using React Three Fiber
- Contains: Individual celestial elements and constraint visualizations
- Key files:
  - `CelestialScene.tsx` (Canvas setup, camera, lighting, scene graph)
  - `StarField.tsx` (instanced star rendering)
  - `WFIFootprint.tsx` (detector rectangles on celestial sphere)
  - `FieldOfRegard.tsx` (GLSL shader for Sun exclusion zones)
  - `ExclusionZones.tsx` (visual constraint boundaries)
  - `CoordinateGrid.tsx` (RA/Dec grid overlay)
  - `SelectionIndicator.tsx` (crosshair on selected target)
  - `GalacticPlane.tsx` (milky way visualization)

**src/components/ui/:**
- Purpose: Interactive controls and information displays
- Contains: User-facing panels and widgets
- Key files:
  - `Header.tsx` (top bar with visibility toggles)
  - `TargetSearch.tsx` (name input + SIMBAD resolution)
  - `TargetList.tsx` (scrollable list of added targets)
  - `EpochSlider.tsx` (date/time picker)
  - `InstrumentPanel.tsx` (WFI filter/dither options)
  - `ObservabilityTimeline.tsx` (calendar view of observable/excluded dates)
  - `CoordinateDisplay.tsx` (bottom-left coordinate readout)
  - `FocalPlaneView.tsx` (SVG detector layout with projected stars)

**src/hooks/:**
- Purpose: Encapsulated React state and side effects
- Contains: Custom hooks for shared logic
- Key files:
  - `useTargets.ts` (target CRUD + selection, localStorage persistence)
  - `useEphemeris.ts` (Sun position computation with memoization)

**src/lib/:**
- Purpose: Pure, testable computation and utility functions
- Contains: Astronomy math, coordinate transforms, data loading
- Key files:
  - `constraints.ts` (Sun position, observability checks, exclusion angle math)
  - `coordinates.ts` (RA/Dec ↔ Cartesian, position angles, formatting, color mapping)
  - `roman.ts` (WFI detector grid constants, filter/dither definitions)
  - `catalog.ts` (star catalog loading, instanced rendering data prep)
  - `simbad.ts` (SIMBAD TAP + Sesame API queries)
  - `vizier.ts` (Vizier catalog queries, not yet used)

**src/data/:**
- Purpose: Static reference data assets
- Contains: Pre-processed JSON files
- Key files:
  - `hyg_bright.json` (star catalog: [RA, Dec, magnitude, color_index] tuples)
  - `wfi_geometry.json` (detector positions, spacing, pixel scale)

## Key File Locations

**Entry Points:**
- `index.html`: DOM root (`<div id="root">`) + script loader
- `src/main.tsx`: React DOM mount point (StrictMode + App)
- `src/App.tsx`: Root component; composes all layout sections and state management

**Configuration:**
- `package.json`: npm dependencies, build/dev scripts
- `tsconfig.json`: TypeScript compiler options (module ES2020, target ES2020)
- `tsconfig.app.json`: App-specific TS settings (include src/)
- `tsconfig.node.json`: Build tool TS settings (Vite, ESLint)
- `vite.config.ts`: Vite build pipeline (React plugin, Tailwind plugin, path alias `@`)
- `.eslintrc.cjs`: ESLint rules (react-hooks, react-refresh)

**Core Logic:**
- `src/lib/constraints.ts`: Observability calculations, Sun position via astronomy-engine
- `src/lib/coordinates.ts`: Coordinate system transformations (spherical ↔ Cartesian, position angle)
- `src/lib/roman.ts`: WFI detector grid and filter/dither metadata
- `src/hooks/useEphemeris.ts`: Ephemeris state with memoized Sun position
- `src/hooks/useTargets.ts`: Target management with localStorage sync

**Visualization:**
- `src/components/scene/CelestialScene.tsx`: Three.js Canvas container
- `src/components/scene/StarField.tsx`: Instanced star rendering
- `src/components/scene/WFIFootprint.tsx`: Detector footprint visualization
- `src/components/scene/FieldOfRegard.tsx`: Constraint shading (GLSL shaders)

**Testing:**
- No test files present (no Jest/Vitest config)

## Naming Conventions

**Files:**
- `camelCase.tsx` for React components (`CelestialScene.tsx`, `useTargets.ts`)
- `UPPERCASE.json` for static data assets (`wfi_geometry.json`, `hyg_bright.json`)
- Hooks use `use` prefix: `useTargets.ts`, `useEphemeris.ts`
- Scene components reflect visual element: `StarField.tsx`, `WFIFootprint.tsx`, `ExclusionZones.tsx`

**Directories:**
- `lowercase/` for category grouping: `components/`, `hooks/`, `lib/`, `data/`
- `camelCase/` for domain grouping within components: `scene/`, `ui/`, `layout/`

**Components & Hooks:**
- PascalCase for exported React components: `function CelestialScene() {}`
- camelCase for hook functions: `function useTargets() {}`
- PascalCase for exported interfaces: `interface Target {}`

**Types & Constants:**
- PascalCase for types: `Target`, `SunPosition`, `DetectorInfo`, `ObservabilityResult`
- UPPER_SNAKE_CASE for constants: `SUN_EXCLUSION_ANGLE`, `DETECTOR_SIZE_ARCMIN`, `TOTAL_FOV_DEG`
- `WFI_*` prefix for WFI-specific constants and arrays: `WFI_DETECTORS`, `WFI_FILTERS`, `WFI_GEOMETRY`

**Functions:**
- camelCase: `raDecToCartesian()`, `checkObservability()`, `resolveName()`
- Prefix utility patterns: `is*()` for booleans, `get*()` for queries, `compute*()` for derived values

## Where to Add New Code

**New Feature (e.g., target filtering, new constraint type):**
- Primary code: `src/lib/` (pure logic first), then `src/components/` (UI wrapper)
- Tests: Not present; create `src/lib/*.test.ts` if adding
- Examples:
  - New observability rule → add function to `src/lib/constraints.ts`
  - New constraint visualization → add scene component to `src/components/scene/`
  - New control panel → add component to `src/components/ui/`

**New Component/Module:**
- Scene element: Create `src/components/scene/MyElement.tsx`
- UI control: Create `src/components/ui/MyControl.tsx`
- State hook: Create `src/hooks/useMyState.ts`
- Pure utility: Create `src/lib/myutil.ts`

**New Data/Catalog:**
- Place JSON in `src/data/mydata.json`
- Load via `import myData from '../data/mydata.json'` (Vite auto-handles)
- Add loader function to `src/lib/catalog.ts` if complex processing needed

**Utilities/Helpers:**
- Shared coordinate math: `src/lib/coordinates.ts`
- Shared astronomy logic: `src/lib/constraints.ts`
- Shared React utilities: Create new hook in `src/hooks/` (not yet needed)
- DOM utilities: Avoid; use Tailwind classes instead

## Special Directories

**src/data/:**
- Purpose: Static assets (JSON catalogs, geometry definitions)
- Generated: No (all hand-crafted or prepared offline)
- Committed: Yes
- Notes: `hyg_bright.json` is ~1000 bright stars from Hipparcos catalog; `wfi_geometry.json` defines WFI detector grid (18 SCA units in 3×6 layout)

**dist/:**
- Purpose: Build output (production bundle)
- Generated: Yes (by `npm run build`)
- Committed: No (in .gitignore)
- Contents: Minified JS, CSS, sourcemaps

**node_modules/:**
- Purpose: Installed npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (in .gitignore)
- Key packages: `react`, `three`, `@react-three/fiber`, `astronomy-engine`, `tailwindcss`

## Build & Configuration

**Entry Points & Outputs:**
- Vite config: `vite.config.ts` (development dev server, production build to dist/)
- HTML entry: `index.html` references `src/main.tsx`
- CSS: `src/index.css` (Tailwind directives + global styles)
- Build output: `dist/index.html` + `dist/assets/` (minified JS/CSS/sourcemaps)

**Path Aliases:**
- `@` → `/src` (defined in vite.config.ts, though not heavily used in current codebase)
- Prefer relative imports for same-directory imports, absolute for cross-domain

**Style System:**
- Tailwind CSS 4 with custom theme (see `src/index.css` for dark aerospace aesthetic)
- Custom classes: `.hud-panel`, `.hud-label`, `bg-roman-bg`, `text-roman-text-muted` (defined in index.css or tailwind config)
- No CSS modules; all utility-first

---

*Structure analysis: 2026-03-19*
