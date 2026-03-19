# Coding Conventions

**Analysis Date:** 2026-03-19

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `TargetSearch.tsx`, `CelestialScene.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useTargets.ts`, `useEphemeris.ts`)
- Utility modules: camelCase (e.g., `coordinates.ts`, `constraints.ts`, `roman.ts`)
- Layout components: PascalCase in `layout/` subdirectory (e.g., `AppLayout.tsx`)
- Scene components: PascalCase in `scene/` subdirectory (e.g., `StarField.tsx`, `CoordinateGrid.tsx`)
- UI components: PascalCase in `ui/` subdirectory (e.g., `Header.tsx`, `TargetList.tsx`)

**Functions:**
- Public API functions: camelCase (e.g., `getSunPosition`, `checkObservability`, `raDecToCartesian`)
- Private/utility functions: camelCase, optionally with leading underscore for truly internal helpers
- React component functions: PascalCase (always)
- Hook functions: camelCase with `use` prefix (e.g., `useTargets()`, `useEphemeris()`)
- Constants that are functions: SCREAMING_SNAKE_CASE for true constants, camelCase for utility functions

**Variables:**
- State variables: camelCase (e.g., `selectedTarget`, `sunPosition`, `showGrid`)
- React state from hooks: camelCase (e.g., `[targets, setTargets]`)
- Interface/type instances: camelCase (e.g., `sunPosition: SunPosition`, `result: ObservabilityResult`)
- Configuration objects: SCREAMING_SNAKE_CASE (e.g., `STORAGE_KEY = 'roman-view-targets'`, `SUN_EXCLUSION_ANGLE = 54`)

**Types:**
- Interfaces: PascalCase (e.g., `Target`, `SunPosition`, `ObservabilityResult`, `CelestialSceneProps`)
- Type aliases: PascalCase (e.g., `DetectorInfo`)
- Interface properties: camelCase (e.g., `selectedTarget`, `sunSeparation`)
- Props interfaces: Component name + `Props` suffix (e.g., `CelestialSceneProps`, `TargetSearchProps`, `HeaderProps`)

## Code Style

**Formatting:**
- Prettier not explicitly configured, but code follows consistent style:
  - 2-space indentation
  - Semicolons at end of statements
  - Single/double quotes: double quotes preferred for JSX attributes and strings
  - Line length: implicit max around 120-140 characters (observed in code)
  - Trailing commas in multiline objects/arrays

**Linting:**
- ESLint with TypeScript support (`typescript-eslint`)
- ESLint plugins active:
  - `@eslint/js` - base JavaScript rules
  - `typescript-eslint` - TypeScript-specific rules
  - `eslint-plugin-react-hooks` - React hooks rules (enforces hooks linter)
  - `eslint-plugin-react-refresh` - Vite React refresh rules
- Config: `eslint.config.js` (flat config format)
- Run: `npm run lint` executes `eslint .`

**TypeScript Strict Mode:**
- `strict: true` enabled in `tsconfig.app.json`
- `noUnusedLocals: true` - unused variables cause error
- `noUnusedParameters: true` - unused parameters cause error
- `noFallthroughCasesInSwitch: true` - switch statements must not fall through
- `noUncheckedSideEffectImports: true` - prevents accidental side effects
- Target: ES2023 with ESNext module output

## Import Organization

**Order:**
1. React/library imports from `react` (e.g., `import { useState, useCallback } from 'react'`)
2. Third-party library imports (e.g., `@react-three/fiber`, `three`, `lucide-react`, `astronomy-engine`)
3. Local relative imports from parent directories using `../` (e.g., `import { useTargets } from '../../hooks/useTargets'`)
4. Local relative imports from same or child directories (e.g., `import { StarField } from './StarField'`)
5. Type imports (implicit with `import type` when importing TypeScript-only declarations)

**Path Aliases:**
- Vite config defines `@` alias to `/src` (though not heavily used in current codebase)
- Prefer relative paths for same-directory and near-relative imports
- Absolute paths not observed in current usage

**Examples:**
```typescript
// Hooks file
import { useState, useCallback, useEffect } from 'react';

// Component with multiple imports
import { useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { StarField } from './StarField';
import { WFIFootprint } from './WFIFootprint';
import type { SunPosition } from '../../lib/constraints';
import type { Target } from '../../hooks/useTargets';
```

## Error Handling

**Patterns:**
- Try-catch blocks in async functions (e.g., `TargetSearch.tsx` search function)
- Silent fallbacks with return values (e.g., in `simbad.ts`, `sesameResolve()` returns `null` on error)
- Optional chaining and nullish coalescing for defensive access:
  ```typescript
  const jradeg = doc.querySelector('jradeg');
  if (jradeg && jdedeg) { /* process */ }
  const name = oname?.textContent?.trim() || name;
  ```
- State-based error display (e.g., `error` state in component, conditionally rendered message)
- No explicit error throwing in library functions; prefer returning `null` or default values
- localStorage failures handled gracefully: `loadTargets()` catches parsing errors and returns `[]`

## Logging

**Framework:** `console` (browser's built-in)

**Patterns:**
- No explicit logging framework used
- Observability via React DevTools and browser DevTools
- No log statements observed in production code

## Comments

**When to Comment:**
- JSDoc-style comments for public API functions, especially scientific/astronomical functions
- Inline comments for non-obvious algorithm logic (e.g., coordinate transformations, color temperature calculations)
- Comments explaining "why" not "what" (code already shows what it does)
- Section comments for complex calculations or multiple related functions

**JSDoc/TSDoc:**
- Used for utility functions in `lib/` modules
- Two-line comment format for function documentation:
  ```typescript
  /** Convert RA (degrees) and Dec (degrees) to a unit-sphere Cartesian position */
  export function raDecToCartesian(raDeg: number, decDeg: number, radius = 1): THREE.Vector3
  ```
- Comments above interfaces and constants for clarity:
  ```typescript
  /** Angular separation between two sky positions in degrees */
  export function angularSeparation(...)

  /** Roman Sun exclusion angle in degrees (cannot point within 54° of Sun) */
  export const SUN_EXCLUSION_ANGLE = 54;
  ```
- No param/return JSDoc tags observed; signatures are self-documenting via TypeScript

## Function Design

**Size:**
- Prefer small, focused functions
- Hook functions generally 20-60 lines
- Utility functions 5-40 lines
- Component render functions kept under 100 lines by extracting helpers (e.g., `ToggleButton` extracted in `Header.tsx`)

**Parameters:**
- Use destructuring for props: `function TargetSearch({ onAddTarget }: TargetSearchProps)`
- Limit parameters to max 3-4; use object parameter for more
- Default parameters used sparingly (e.g., `radius = 1` in coordinate functions)

**Return Values:**
- Return early from functions to reduce nesting
- Conditional returns using ternary in JSX (e.g., `selectedTarget ? <Component /> : undefined`)
- Function composition with `useCallback` to memoize event handlers and prevent child re-renders
- Objects returned from hooks contain both data and handlers (e.g., `useTargets()` returns `{ targets, selectedTarget, addTarget, removeTarget, selectTarget }`)

## Module Design

**Exports:**
- Named exports for utility functions: `export function functionName()`
- Named exports for interfaces: `export interface InterfaceName {}`
- Default exports for React components: `export default function ComponentName()`
- Hook functions use named exports: `export function useHookName()`

**Barrel Files:**
- Not used; imports reference specific files directly
- Prefer explicit paths over index.ts aggregation

**Component Structure:**
- Props interface defined above component function
- Nested helper components inline for UI layout (e.g., `ToggleButton` defined in Header.tsx)
- Scene/3D components may use helper functions (e.g., `CameraController` in CelestialScene.tsx)

## Styling

**Tailwind CSS:**
- Classes organized: layout → sizing → spacing → colors → effects
- Responsive utilities (e.g., `absolute`, `relative`, `flex`, `grid`)
- Color tokens via custom theme:
  - `bg-roman-bg` - dark background
  - `text-roman-text` - main text color
  - `text-roman-text-dim` - dimmed text
  - `text-roman-text-muted` - muted text
  - `border-roman-border` - border color
  - `bg-roman-accent` - accent color (cyan)
  - `text-roman-danger` - error state color
  - `bg-roman-success` - success state color
- Custom CSS classes via `index.css` for HUD aesthetic (`.hud-panel`, `.hud-input`, `.hud-label`)
- Classes combined with `clsx` utility for conditional styling (when dynamic logic needed)

**Example:**
```tsx
<button
  className={`px-2.5 py-1 text-[10px] font-mono font-medium rounded-sm border transition-all duration-150 ${
    active
      ? 'bg-roman-accent/12 border-roman-accent/30 text-roman-accent shadow-[0_0_8px_rgba(6,182,212,0.12)]'
      : 'bg-transparent border-roman-border text-roman-text-dim hover:text-roman-text-muted hover:border-roman-border-accent'
  }`}
>
```

---

*Convention analysis: 2026-03-19*
