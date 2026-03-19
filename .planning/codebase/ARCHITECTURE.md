# Architecture

**Analysis Date:** 2026-03-19

## Pattern Overview

**Overall:** Component-driven React + Three.js with layered separation of computation (constraints/coordinates), visualization (scene components), and state management (hooks).

**Key Characteristics:**
- Three.js 3D celestial sphere with immersive visualization using WebGL post-processing (bloom, vignette)
- React hooks for state management with localStorage persistence
- Astronomy computation isolated in pure library functions
- Real-time constraint visualization via custom GLSL shaders
- Canvas-based focal plane projection with coordinate transformations

## Layers

**Presentation Layer (UI Components):**
- Purpose: Interactive controls, displays, and layout containers
- Location: `src/components/ui/`
- Contains: React functional components for controls (sliders, search, lists), displays (coordinates, timeline, instrument panel)
- Depends on: Hooks (state), lib/coordinates (formatting), lib/roman (instrument metadata)
- Used by: `src/App.tsx` (main composition)

**Visualization Layer (3D Scene):**
- Purpose: Three.js scene rendering, celestial objects, and spatial visualizations
- Location: `src/components/scene/`
- Contains: React Three Fiber components for stars, grids, constraints, footprints, detection indicators
- Depends on: lib/coordinates (position math), lib/constraints (exclusion zones), lib/roman (detector geometry)
- Used by: `src/App.tsx` via CelestialScene

**Layout Layer:**
- Purpose: Spatial arrangement of viewport, sidebar, HUD elements
- Location: `src/components/layout/AppLayout.tsx`
- Contains: CSS Grid/absolute positioning for multi-panel aerospace mission-control UI
- Depends on: React types
- Used by: `src/App.tsx`

**State Management (Hooks):**
- Purpose: Target list persistence, ephemeris computation, selection state
- Location: `src/hooks/`
- Contains: `useTargets()` (localStorage-backed target CRUD), `useEphemeris()` (Sun position memoization)
- Depends on: lib/constraints (ephemeris calc)
- Used by: `src/App.tsx`

**Computation Library (Pure Functions):**
- Purpose: Astronomical math, constraint checks, coordinate transformations
- Location: `src/lib/`
- Contains:
  - `constraints.ts`: Sun position via astronomy-engine, observability windows, angular separation
  - `coordinates.ts`: RA/Dec ↔ Cartesian conversions, position angles, ecliptic transforms, color mapping
  - `roman.ts`: WFI detector layout, filter definitions, dither patterns
  - `catalog.ts`: Star catalog loading, instanced rendering data prep
  - `simbad.ts`, `vizier.ts`: External API queries (not yet integrated)
- Depends on: astronomy-engine, Three.js math utilities, JSON data
- Used by: All layers above

**Data Layer:**
- Purpose: Static reference data
- Location: `src/data/`
- Contains: `hyg_bright.json` (star catalog, 1000+ bright stars), `wfi_geometry.json` (detector positions/spacing)
- Depends on: None
- Used by: lib/catalog, lib/roman

## Data Flow

**Target Selection → 3D Render:**

1. User clicks star name → `TargetSearch` calls `App.handleAddTarget()`
2. `handleAddTarget()` calls `useTargets().addTarget()` → updates state + localStorage
3. State change propagates to `App.selectedTarget` → `CelestialScene` props update
4. `CelestialScene` calls `CameraController` to animate camera toward target RA/Dec
5. `WFIFootprint` and `SelectionIndicator` render at target position
6. `FocalPlaneView` projects bright stars onto detector grid via gnomonic projection

**Epoch Change → Constraint Visualization:**

1. User drags `EpochSlider` → `App.setEpoch()`
2. `useEphemeris()` recomputes Sun position via `constraints.getSunPosition()`
3. Sun position passed as prop to `FieldOfRegard` and exclusion zone renderers
4. GLSL shaders in `FieldOfRegard` recompute exclusion zones in real-time
5. `ObservabilityTimeline` component calls `constraints.computeObservabilityWindows()` to compute observability windows
6. Timeline re-renders with updated colors/status

**Focal Plane Projection:**

1. User selects target with epoch
2. `FocalPlaneView` receives `targetRa`, `targetDec`, `sunPosition`
3. Computes position angle via `coordinates.positionAngle()` (target→Sun bearing)
4. Projects catalog stars via `projectToFocalPlane()` (gnomonic projection + PA rotation)
5. SVG renders detector rectangles and star positions in focal plane coordinates

**State Management:**

- Target persistence: `useTargets()` syncs to localStorage on every change
- Ephemeris caching: `useEphemeris()` memoizes Sun position based on epoch (prevents recompute on every render)
- Selection: `selectedTargetId` in state, resolved to full `Target` object when needed

## Key Abstractions

**SunPosition:**
- Purpose: Represents Sun's celestial location as (RA, Dec) in degrees
- Examples: `src/lib/constraints.ts`, `src/hooks/useEphemeris.ts`
- Pattern: Plain interface, computed once per epoch via astronomy-engine, memoized in hook

**Target:**
- Purpose: User-tracked observation candidate with metadata
- Examples: `src/hooks/useTargets.ts`
- Pattern: ID-based with timestamp; persisted to localStorage; used for selection and filtering

**DetectorInfo:**
- Purpose: Focal plane grid cell with position and identity
- Examples: `src/lib/roman.ts` (WFI_DETECTORS array)
- Pattern: Static array initialized from JSON geometry; used for rendering footprints and focal plane grids

**StarData:**
- Purpose: Pre-processed star catalog as typed arrays for efficient GPU upload
- Examples: `src/lib/catalog.ts` (loadStarCatalog)
- Pattern: Memoized once; positions/colors/sizes as Float32Array; passed to Three.js instanced rendering

**ObservabilityResult:**
- Purpose: Constraint check outcome with detailed margins
- Examples: `src/lib/constraints.ts`
- Pattern: Contains boolean flag + numeric margins; used to classify timeline cells as observable/excluded/near-constraint

## Entry Points

**Main React Entry:**
- Location: `src/main.tsx`
- Triggers: App startup (index.html loads bundle)
- Responsibilities: Mounts `<App />` to DOM root

**App Root Component:**
- Location: `src/App.tsx`
- Triggers: React render tree
- Responsibilities: Composes layout, manages top-level state (targets, epoch, visibility toggles), distributes props to children

**Canvas/Viewport:**
- Location: `src/components/scene/CelestialScene.tsx`
- Triggers: `App.viewport` prop
- Responsibilities: WebGL initialization, camera setup, lighting, scene graph construction, post-processing

**Data Initialization:**
- Location: `src/lib/catalog.ts` and `src/hooks/useEphemeris.ts`
- Triggers: Component mounts (lazy load on first use via memoization)
- Responsibilities: Load star catalog, compute initial Sun position

## Error Handling

**Strategy:** Graceful fallback for external API failures; client-side errors logged but don't crash

**Patterns:**
- SIMBAD/Sesame queries wrapped in try-catch with null returns
- localStorage read failures return empty array (safe fallback)
- Target searches show "No results" rather than error dialogs
- Missing coordinate data defaults to null/undefined (components handle with `?.` operators)

## Cross-Cutting Concerns

**Logging:** Console only (no external service); astronomy-engine and Three.js warnings pass through

**Validation:**
- RA/Dec bounded to [0, 360] and [-90, 90] where used
- Magnitude filters applied in star projection (e.g., V < 10 for focal plane)
- Epoch picker constrains range (e.g., within valid mission window if added)

**Authentication:** None (all external APIs are public: SIMBAD, Vizier, astronomy-engine)

**Coordinate Systems:**
- Celestial sphere: RA/Dec in degrees (0–360 / -90–+90)
- 3D world: Unit sphere at origin; stars at radius 100; celestial sphere at radius 97.5
- Focal plane: Arcseconds/arcminutes; origin at boresight; PA-rotated to align with Sun constraint
- Canvas SVG: focal plane arcmin; origin at center; Y inverted (SVG convention)

---

*Architecture analysis: 2026-03-19*
