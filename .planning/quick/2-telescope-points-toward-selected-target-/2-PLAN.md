---
phase: quick-2
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/scene/RomanTelescope.tsx
  - src/components/scene/CelestialScene.tsx
  - src/components/ui/TargetSearch.tsx
  - src/lib/simbad.ts
autonomous: true
requirements: [QUICK-2]

must_haves:
  truths:
    - "3D telescope barrel rotates to point toward the selected target's RA/Dec on the sky sphere"
    - "Telescope smoothly slerps to new orientation when target changes"
    - "When no target is selected, telescope falls back to tracking camera look direction"
    - "After typing 3+ characters in the search input, a filtered dropdown of matching SIMBAD results appears"
    - "Clicking a suggestion adds it as a target and closes the dropdown"
  artifacts:
    - path: "src/components/scene/RomanTelescope.tsx"
      provides: "Telescope orientation from target RA/Dec with camera-direction fallback"
      contains: "raDecToCartesian"
    - path: "src/components/ui/TargetSearch.tsx"
      provides: "Autocomplete dropdown with filtered SIMBAD results"
      contains: "resolveName"
    - path: "src/lib/simbad.ts"
      provides: "TAP query returning multiple matching targets"
      contains: "resolveName"
  key_links:
    - from: "src/components/scene/CelestialScene.tsx"
      to: "src/components/scene/RomanTelescope.tsx"
      via: "targetRa and targetDec props"
      pattern: "targetRa=.*targetDec="
    - from: "src/components/ui/TargetSearch.tsx"
      to: "src/lib/simbad.ts"
      via: "resolveName import for autocomplete"
      pattern: "resolveName"
---

<objective>
Make the 3D Roman Space Telescope barrel point toward the user's selected observation target on the celestial sphere, and add autocomplete/suggestion functionality to the target search input so users see matching SIMBAD results after typing 3 characters.

Purpose: Enhance observation planning by giving visual feedback of telescope pointing direction and making target discovery faster with autocomplete suggestions.
Output: Updated RomanTelescope component with target-aware pointing, updated TargetSearch with autocomplete dropdown.
</objective>

<execution_context>
@/home/vscode/.claude/get-shit-done/workflows/execute-plan.md
@/home/vscode/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/scene/RomanTelescope.tsx
@src/components/scene/CelestialScene.tsx
@src/components/ui/TargetSearch.tsx
@src/lib/simbad.ts
@src/lib/coordinates.ts
@src/hooks/useTargets.ts

<interfaces>
<!-- Key types and contracts the executor needs -->

From src/hooks/useTargets.ts:
```typescript
export interface Target {
  id: string;
  name: string;
  ra: number;  // degrees
  dec: number; // degrees
  addedAt: number;
}
```

From src/lib/coordinates.ts:
```typescript
export function raDecToCartesian(raDeg: number, decDeg: number, radius?: number): THREE.Vector3;
```

From src/lib/simbad.ts:
```typescript
export interface SimbadResult {
  name: string;
  ra: number;  // degrees
  dec: number; // degrees
}
// Already exists - TAP query returning up to 10 matching results:
export async function resolveName(name: string): Promise<SimbadResult[]>;
// Currently used by TargetSearch - single exact match:
export async function sesameResolve(name: string): Promise<SimbadResult | null>;
```

From src/components/scene/CelestialScene.tsx:
```typescript
interface CelestialSceneProps {
  sunPosition: SunPosition;
  selectedTarget: Target | null;
  v3pa: number | null;
  showGrid: boolean;
  showConstraints: boolean;
  showGalactic: boolean;
  gaiaStars: GaiaSource[];
}
// CelestialScene already receives selectedTarget -- pass RA/Dec to RomanTelescope
```

Current RomanTelescope behavior (from quick-1 SUMMARY):
- Tracks camera look direction every frame via useThree + useFrame
- Uses quaternion slerp (factor 0.12) for smooth rotation
- 180-degree Y flip corrects Three.js lookAt convention
- STL geometry base rotation maps model +Y to world +Z
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Telescope barrel points toward selected target RA/Dec</name>
  <files>src/components/scene/RomanTelescope.tsx, src/components/scene/CelestialScene.tsx</files>
  <action>
**RomanTelescope.tsx** -- Add optional props `targetRa?: number` and `targetDec?: number`. When both are provided, compute the telescope's target direction from `raDecToCartesian(targetRa, targetDec, 1).normalize()` instead of reading `camera.getWorldDirection()`. When neither prop is set (no target selected), fall back to the current behavior of tracking camera look direction. Import `raDecToCartesian` from `../../lib/coordinates`.

In the `useFrame` callback:
- If `targetRa` and `targetDec` are defined, set `_dir` to `raDecToCartesian(targetRa, targetDec, 1).normalize()` and proceed with the existing lookAt + FLIP_Y_180 quaternion math
- If not defined, use the existing `camera.getWorldDirection(_dir)` code path
- Keep the same slerp factor (0.12) and initialization logic
- Keep all existing pre-allocated reusable objects pattern

**CelestialScene.tsx** -- Pass `selectedTarget?.ra` and `selectedTarget?.dec` to `<RomanTelescope>`:
```tsx
<RomanTelescope
  targetRa={selectedTarget?.ra}
  targetDec={selectedTarget?.dec}
/>
```
No changes to CelestialScene's props interface -- it already receives `selectedTarget`.
  </action>
  <verify>
    <automated>cd /workspace/RomanView && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>Telescope barrel smoothly rotates to point toward the selected target's celestial coordinates. When no target is selected, telescope tracks camera direction as before. TypeScript compiles with no errors.</done>
</task>

<task type="auto">
  <name>Task 2: Add autocomplete suggestions to target search input</name>
  <files>src/components/ui/TargetSearch.tsx, src/lib/simbad.ts</files>
  <action>
**simbad.ts** -- The existing `resolveName` function uses SQL string interpolation which is fragile. Update it to properly sanitize the query and ensure it returns useful autocomplete results. Keep the `TOP 10` limit. No changes to the `SimbadResult` interface or `sesameResolve`.

**TargetSearch.tsx** -- Replace the current single-result SIMBAD sesame lookup with autocomplete using `resolveName`:

1. **Import** `resolveName` from `../../lib/simbad` (add to existing import alongside `sesameResolve` and `SimbadResult`).

2. **Change trigger threshold** from 2 to 3 characters: `if (query.length >= 3)` in the debounce effect.

3. **Switch the search callback** to use `resolveName` instead of `sesameResolve`. `resolveName` returns `SimbadResult[]` directly (array of up to 10 results), so set `setResults(results)` when results.length > 0, or `setError('No results found')` when empty.

4. **Style the dropdown** as a scrollable list with max-height. Wrap the results list in a container with:
   - `max-h-48 overflow-y-auto` for scroll when many results
   - Each result row shows the target name prominently and RA/Dec below in monospace
   - Keep the existing button/click handler that calls `onAddTarget(r.name, r.ra, r.dec)` then clears query and results
   - Add a subtle "N results" count label above the list

5. **Keyboard accessibility**: Add `onKeyDown` handler to the input -- when Enter is pressed and there is exactly 1 result, auto-select it. When Escape is pressed, clear results.

6. **Click-outside dismiss**: Add a ref-based click-outside listener using `useEffect` with a `mousedown` event on `document`. When clicking outside the search container, clear results. Wrap the entire search section (input + results) in a `div` with a ref for the boundary check.

Keep the existing manual RA/DEC mode toggle and its handler unchanged. Keep `sesameResolve` as a fallback -- it is not used in the autocomplete path but remains available.
  </action>
  <verify>
    <automated>cd /workspace/RomanView && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>Typing 3+ characters in the target search shows a filtered dropdown of matching SIMBAD targets. Clicking a result adds it as a target and closes the dropdown. Pressing Escape or clicking outside dismisses the list. Enter auto-selects when exactly 1 result. Manual RA/DEC mode still works.</done>
</task>

</tasks>

<verification>
- `cd /workspace/RomanView && npx tsc --noEmit` compiles with no errors
- `cd /workspace/RomanView && npm run build` produces a successful production build
- Telescope component accepts targetRa/targetDec props and uses raDecToCartesian for orientation
- TargetSearch imports and calls resolveName for autocomplete
- Results dropdown has max-height scrollable container
</verification>

<success_criteria>
1. 3D telescope barrel points toward selected target's RA/Dec on the celestial sphere with smooth slerp transition
2. When no target is selected, telescope falls back to tracking camera look direction
3. Target search shows autocomplete suggestions from SIMBAD after 3 characters typed
4. Clicking a suggestion adds it as a target and closes the dropdown
5. TypeScript compiles and production build succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/2-telescope-points-toward-selected-target-/2-SUMMARY.md`
</output>
