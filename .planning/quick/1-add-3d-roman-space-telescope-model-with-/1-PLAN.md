---
phase: quick-1
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - public/models/Nancy Grace Roman Space Telescope.stl
  - src/components/scene/RomanTelescope.tsx
  - src/components/scene/CelestialScene.tsx
autonomous: false
requirements: [QUICK-1]
must_haves:
  truths:
    - "3D Roman Space Telescope model is visible in the scene at the origin"
    - "Telescope has a realistic metallic silver/gold material finish"
    - "When user selects a target, camera smoothly pans to show telescope pointing at it"
    - "Telescope rotates to point toward the selected target on the celestial sphere"
    - "Scene remains performant despite the large STL model (lazy-loaded, no blocking)"
  artifacts:
    - path: "public/models/Nancy Grace Roman Space Telescope.stl"
      provides: "NASA STL model file for static serving"
    - path: "src/components/scene/RomanTelescope.tsx"
      provides: "R3F component that loads and renders the telescope model"
      exports: ["RomanTelescope"]
    - path: "src/components/scene/CelestialScene.tsx"
      provides: "Updated scene with telescope and cinematic camera behavior"
  key_links:
    - from: "src/components/scene/RomanTelescope.tsx"
      to: "public/models/Nancy Grace Roman Space Telescope.stl"
      via: "useLoader(STLLoader, url) lazy load"
      pattern: "useLoader.*STLLoader"
    - from: "src/components/scene/CelestialScene.tsx"
      to: "src/components/scene/RomanTelescope.tsx"
      via: "RomanTelescope component in scene graph"
      pattern: "<RomanTelescope"
    - from: "CameraController in CelestialScene.tsx"
      to: "selectedTarget RA/Dec"
      via: "useFrame animation loop computing offset camera position"
      pattern: "useFrame.*lerp|slerp"
---

<objective>
Add the NASA Nancy Grace Roman Space Telescope 3D model to the Three.js celestial scene. The telescope sits at the scene origin and rotates to point at the selected target. The camera pans cinematically on target selection to show the telescope in the foreground with the target starfield behind it.

Purpose: Transform the app from a flat sky map into an immersive 3D observation planning tool where the user sees the telescope as the physical observer.
Output: RomanTelescope.tsx component, updated CelestialScene.tsx with cinematic camera, downloaded STL model in public/models/
</objective>

<execution_context>
@/home/vscode/.claude/get-shit-done/workflows/execute-plan.md
@/home/vscode/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/scene/CelestialScene.tsx
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
// Convention: x = cos(dec)*cos(ra), y = sin(dec), z = -cos(dec)*sin(ra)
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
// CameraController is defined inline in this file
// Canvas camera: position [0,0,3], fov 60, near 0.1, far 500
// OrbitControls: no pan, minDistance 0.5, maxDistance 200
// Stars/footprint render on sphere at radius ~99-100
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Download STL model and create RomanTelescope component</name>
  <files>public/models/Nancy Grace Roman Space Telescope.stl, src/components/scene/RomanTelescope.tsx</files>
  <action>
    1. Create `public/models/` directory and download the NASA STL file:
       ```
       curl -L -o "public/models/Nancy Grace Roman Space Telescope.stl" \
         "https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/printable/nancy-grace-roman-space-telescope/Nancy%20Grace%20Roman%20Space%20Telescope.stl"
       ```
       The file is ~26 MB. This is acceptable for a specialized astronomy tool (not a consumer landing page). It will be lazy-loaded with a Suspense fallback.

    2. Create `src/components/scene/RomanTelescope.tsx`:
       - Use `useLoader(STLLoader, '/models/Nancy Grace Roman Space Telescope.stl')` from `@react-three/fiber` with `STLLoader` from `three/examples/jsm/loaders/STLLoader.js` to load the geometry.
       - Wrap the export in `React.Suspense` — the parent (CelestialScene) will provide the fallback.
       - Center the geometry after loading using `geometry.center()` and `geometry.computeBoundingBox()`. Scale the model so its bounding box longest axis maps to approximately 0.3 scene units (small relative to the sky sphere at r=100, but visible when camera is close).
       - Apply a `meshStandardMaterial` with:
         - `color: '#c0c0c0'` (silver base)
         - `metalness: 0.85`
         - `roughness: 0.25`
         - Gold accent: Create a second mesh clone or use vertex coloring for the sunshield portion. Simpler approach: apply a single metallic silver/titanium look (`color: '#b8bcc4'`, `metalness: 0.9`, `roughness: 0.2`) since the real telescope is mostly silver/metallic. A subtle `emissive: '#1a1a2e'` with `emissiveIntensity: 0.1` helps it read against the dark background.
       - Add a `pointLight` near the telescope (intensity ~0.5, distance ~2) so the metallic material has specular highlights. Also add a subtle `directionalLight` to simulate sunlight hitting the spacecraft.
       - Props: `{ targetRa: number | null, targetDec: number | null }`. When targetRa/Dec are provided, compute the direction vector using the same `raDecToCartesian` convention (but at radius=1 for direction), and use `group.lookAt(direction)` to orient the telescope. The STL model's default forward axis may need adjustment — determine which local axis points "forward" (the optical axis/aperture end) after loading, and apply a base rotation offset so `lookAt` aligns the aperture toward the target direction.
       - Use `useFrame` for smooth rotation: store the target quaternion and `slerp` the group's current quaternion toward it each frame (`slerp(targetQuat, 0.05)`) for a smooth reorientation animation.
       - When no target is selected, point along +Z (default forward).
  </action>
  <verify>
    <automated>cd /workspace/RomanView && ls -la "public/models/Nancy Grace Roman Space Telescope.stl" && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>STL file exists in public/models/ (~26 MB), RomanTelescope.tsx compiles without type errors, component exports RomanTelescope accepting targetRa/targetDec props</done>
</task>

<task type="auto">
  <name>Task 2: Integrate telescope into scene and add cinematic camera pan</name>
  <files>src/components/scene/CelestialScene.tsx</files>
  <action>
    Update `CelestialScene.tsx` to:

    1. **Add telescope to scene:**
       - Import `RomanTelescope` from `./RomanTelescope`.
       - Wrap in `<Suspense fallback={null}>` (telescope loads async; scene works without it while loading).
       - Place `<RomanTelescope targetRa={selectedTarget?.ra ?? null} targetDec={selectedTarget?.dec ?? null} />` in the scene graph, before the OrbitControls.
       - Add lighting for the telescope: a `directionalLight` with `intensity={0.6}` and `position={[5, 3, 5]}` and a `pointLight` with `intensity={0.3}` near origin. Keep the existing `ambientLight intensity={0.1}`. These lights primarily serve the telescope mesh — the stars are unlit point sprites unaffected by scene lights.

    2. **Rewrite CameraController for cinematic pan:**
       The current CameraController snaps the camera position instantly. Replace with smooth animated transition:
       - Use `useFrame` instead of one-shot position set.
       - When a new target is selected (target.id changes from lastTarget ref):
         a. Compute the target direction on the sky sphere: `raDecToCartesian(target.ra, target.dec, 1).normalize()`.
         b. Compute camera goal position: offset from origin along the target direction by a negative amount (behind the telescope) and slightly above/to the side so the telescope is in the foreground. Specifically: `goalPosition = targetDir.clone().multiplyScalar(-2.5).add(new Vector3(0, 0.3, 0))`. This places the camera 2.5 units behind the telescope (opposite the target direction) and slightly elevated, creating a "looking over the telescope's shoulder" view.
         c. Store `goalPosition` and `goalLookAt = targetDir.clone().multiplyScalar(100)` (a point on the sky sphere where the target is) in refs.
         d. Set an `isAnimating` ref to true with a duration timer.
       - Each frame in `useFrame`:
         - If `isAnimating`: lerp `camera.position` toward `goalPosition` (`lerpFactor = 0.03` for smooth ~2-second settle). Lerp a `currentLookAt` ref toward `goalLookAt` and call `camera.lookAt(currentLookAt)`.
         - When position is within 0.01 of goal, set `isAnimating = false`.
       - While `isAnimating`, the OrbitControls should be temporarily disabled to prevent user input conflicting with the animation. Pass `orbitEnabled` state down or use a ref. After animation completes, re-enable OrbitControls so user can freely orbit.
       - Import `raDecToCartesian` from `../../lib/coordinates`.

    3. **OrbitControls update:**
       - Add a ref to OrbitControls: `const orbitRef = useRef(null)`.
       - After camera animation completes, call `orbitRef.current?.target.copy(goalLookAt.normalize().multiplyScalar(2))` to update the orbit center so subsequent user orbiting revolves around the telescope/target axis rather than the origin.
       - Set `enabled={!isAnimating}` on OrbitControls (where `isAnimating` comes from CameraController via shared state or a ref).
       - Keep existing orbit constraints (no pan, minDistance, maxDistance, damping).
  </action>
  <verify>
    <automated>cd /workspace/RomanView && npx tsc --noEmit 2>&1 | head -20 && npm run build 2>&1 | tail -10</automated>
  </verify>
  <done>
    - Telescope model renders at scene origin with metallic material
    - Telescope rotates to point at selected target with smooth slerp animation
    - Camera smoothly pans on target selection to show telescope-in-foreground, target-behind composition
    - OrbitControls disabled during camera animation, re-enabled after
    - Build succeeds with no type errors
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Visual verification of telescope model and camera behavior</name>
  <files>none</files>
  <action>
    Human verifies the 3D telescope rendering and cinematic camera pan behavior.
  </action>
  <verify>User confirms visual quality and interaction behavior</verify>
  <done>User approves telescope appearance, camera animation, and overall scene integration</done>
  <what-built>3D Roman Space Telescope model at scene origin with cinematic camera pan on target selection</what-built>
  <how-to-verify>
    1. Run `npm run dev` and open the app in browser
    2. Verify the telescope model is visible at the scene center with metallic material
    3. Scroll/zoom to inspect the telescope up close — should have silver metallic finish with specular highlights
    4. Search for a target (e.g., "M31" or enter RA/Dec coordinates)
    5. Select the target — camera should smoothly pan to show the telescope pointing at the target with the starfield behind
    6. After animation completes, verify you can orbit freely with mouse drag
    7. Select a different target — camera should pan again to the new orientation
    8. Deselect target — telescope should return to default orientation
    9. Check performance: scene should remain responsive (no frame drops from the STL model)
  </how-to-verify>
  <resume-signal>Type "approved" or describe visual/behavioral issues to fix</resume-signal>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (no type errors)
- `npm run build` succeeds (production build works)
- STL file exists at `public/models/Nancy Grace Roman Space Telescope.stl`
- RomanTelescope component renders without console errors
- Camera animation triggers on target selection
</verification>

<success_criteria>
- NASA Roman Space Telescope 3D model loads and renders at scene origin
- Metallic silver/titanium material finish on the model
- Telescope rotates to point at selected target with smooth animation
- Camera pans cinematically to show telescope-foreground + target-background composition
- Orbit controls work normally after animation completes
- No build errors, no runtime crashes
- Scene performance acceptable (model lazy-loaded via Suspense)
</success_criteria>

<output>
After completion, create `.planning/quick/1-add-3d-roman-space-telescope-model-with-/1-SUMMARY.md`
</output>
