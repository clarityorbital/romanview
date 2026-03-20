---
phase: quick-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/scene/RomanTelescope.tsx
autonomous: false
requirements: [QUICK-4]

must_haves:
  truths:
    - "Telescope renders with visually distinct colored regions: gold sun shield, blue solar panels, light gray barrel, dark metallic bus"
    - "Solar panels display a procedural grid pattern via custom ShaderMaterial"
    - "Telescope rotation/pointing behavior is unchanged from current implementation"
  artifacts:
    - path: "src/components/scene/RomanTelescope.tsx"
      provides: "Multi-material telescope with geometry segmentation and procedural solar panel shader"
      min_lines: 120
  key_links:
    - from: "src/components/scene/RomanTelescope.tsx"
      to: "/models/Nancy Grace Roman Space Telescope.stl"
      via: "useLoader(STLLoader, ...) with face-group segmentation"
      pattern: "useLoader.*STLLoader"
---

<objective>
Segment the existing single-geometry Roman telescope STL into distinct material zones by classifying triangle centroids in raw (pre-rotation) coordinate space, then render each zone with its own material -- gold emissive sun shield, procedural-shader blue solar panels, light gray barrel, and dark metallic spacecraft bus.

Purpose: Transform the flat gray telescope into a visually striking, NASA-inspired multi-material model that looks great in the dark space scene.
Output: Updated RomanTelescope.tsx with geometry segmentation and 4 distinct materials.
</objective>

<execution_context>
@/home/vscode/.claude/get-shit-done/workflows/execute-plan.md
@/home/vscode/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/scene/RomanTelescope.tsx

**Critical geometry reference (raw STL coordinates, BEFORE Ry(+90deg) rotation):**
- Bounding box: X=[-124, 124], Y=[-65.5, 65.5], Z=[-56.6, 56.6]
- Barrel axis along X. Aperture at +X, sun shield at -X.
- Sun shield: X < -60 (wide end, 260k+ vertices, max radius ~67)
- Solar panels: |Y| > 40 (thin wing structures, ~1200 verts each)
- Barrel/tube: main cylindrical body, radius < 40, centered along X
- Spacecraft bus: everything else (central structure that is not barrel, sun shield, or solar panels)

**After geometry processing (center + scale + Ry(+90deg)):**
- Barrel axis along Z. Aperture at -Z (faces lookAt target). Sun shield at +Z.
- The segmentation MUST happen on the raw centered geometry BEFORE the rotation matrix is applied.

**Existing behavior to preserve:**
- useFrame quaternion slerp for smooth pointing (targetRa/Dec or camera fallback)
- pointLight at [0.3, 0.3, 0.3]
- Scale factor: 0.3 / maxDim
- All refs and reusable vector objects
</context>

<tasks>

<task type="auto">
  <name>Task 1: Segment geometry and apply multi-material rendering</name>
  <files>src/components/scene/RomanTelescope.tsx</files>
  <action>
Rewrite the geometry processing in RomanTelescope.tsx to segment the single STL into four material zones and render each with its own material. Preserve ALL existing rotation/pointing logic unchanged.

**Step 1 - Segmentation function:**
Create a helper function `segmentGeometry(geo: THREE.BufferGeometry)` that:
1. Reads the `position` attribute from the centered (but NOT yet rotated or scaled) geometry
2. For each triangle (every 3 vertices if non-indexed, or via index buffer), computes the centroid
3. Classifies each triangle into one of four zones based on RAW centered coordinates:
   - `sunShield`: centroid.x < -60 (the wide end)
   - `solarPanel`: Math.abs(centroid.y) > 40 (wing structures)
   - `barrel`: triangle centroid is within radius < 40 from X axis (sqrt(y^2 + z^2) < 40) AND centroid.x >= -60
   - `bus`: everything else (central structure not matching above)
4. Returns four new `BufferGeometry` objects, each containing only the triangles for that zone
5. Each output geometry should have proper position and normal attributes copied from the source

**Step 2 - Apply scaling and rotation to each segment:**
After segmentation, apply the same transforms to each geometry:
- `geo.scale(scaleFactor, scaleFactor, scaleFactor)` (where scaleFactor = 0.3 / maxDim computed from original bounding box)
- `geo.applyMatrix4(rotMatrix)` with Ry(+90deg)

**Step 3 - Materials:**
Render four `<mesh>` elements inside the existing `<group ref={groupRef}>`, each with its own material:

- **Sun shield mesh:** `meshStandardMaterial` with color="#d4a843" (gold), metalness=0.7, roughness=0.3, emissive="#ff8800", emissiveIntensity=0.15
- **Solar panels mesh:** Custom `shaderMaterial` (see below)
- **Barrel mesh:** `meshStandardMaterial` with color="#e8e8ec" (light silver-white), metalness=0.6, roughness=0.35, emissive="#1a1a2e", emissiveIntensity=0.05
- **Bus mesh:** `meshStandardMaterial` with color="#3a3a4a" (dark metallic), metalness=0.85, roughness=0.25, emissive="#0a0a15", emissiveIntensity=0.08

**Step 4 - Solar panel procedural shader:**
Create a custom `THREE.ShaderMaterial` for the solar panels with:
- Vertex shader: Pass through position/normal, compute `vWorldPosition` and `vNormal` varyings
- Fragment shader:
  - Base color: deep blue (#1a3a8a)
  - Grid lines: Use `fract()` on world-space coordinates to create a rectangular cell pattern
  - Grid line color: slightly lighter blue (#2255bb) with thin lines (line width ~0.03-0.05 in normalized fract space)
  - Apply simple N dot L lighting using a uniform `lightDirection` (set to normalized [1, 1, 0.5])
  - Add slight emissive contribution (0.08) for visibility in shadow
- Use `useMemo` to create the shader material once, with `uniforms: { lightDirection: { value: new THREE.Vector3(1, 1, 0.5).normalize() } }`

**Step 5 - Preserve existing behavior:**
- Keep the `<group ref={groupRef}>` as the rotation target
- Keep ALL useFrame logic, refs (groupRef, currentQuatRef, initialized), and reusable vector objects (_dir, _mat, _targetQuat, _up, _origin) exactly as they are
- Keep the `<pointLight>` in the group
- Keep the RomanTelescopeProps interface and component signature

**Performance note:** The segmentation runs once in `useMemo` keyed on `rawGeometry`. The four geometries are stable references. This adds no per-frame cost.
  </action>
  <verify>
    <automated>cd /workspace/RomanView && npx tsc --noEmit src/components/scene/RomanTelescope.tsx 2>&1 | head -30</automated>
  </verify>
  <done>
- RomanTelescope.tsx compiles without TypeScript errors
- Component renders four mesh children inside the group, each with a distinct material
- Sun shield is gold with emissive glow
- Solar panels use a custom ShaderMaterial with procedural blue grid pattern
- Barrel is light silver-white metallic
- Bus is dark metallic
- Telescope rotation/pointing behavior is completely unchanged
- No per-frame performance regression (segmentation in useMemo only)
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Visual verification of multi-material telescope</name>
  <files>src/components/scene/RomanTelescope.tsx</files>
  <action>
Human verifies the multi-material telescope rendering in the browser.
  </action>
  <verify>User confirms visual quality and rotation behavior</verify>
  <done>User approves the multi-material telescope appearance</done>
  <what-built>Multi-material Roman telescope with gold sun shield, blue procedural solar panels, light gray barrel, and dark metallic bus. The telescope should look dramatically better than the previous flat gray model.</what-built>
  <how-to-verify>
    1. Run `cd /workspace/RomanView && npm run dev`
    2. Open the app in a browser
    3. Observe the telescope model -- it should show distinct colored regions:
       - Gold/amber sun shield (wider end, facing away from targets) with subtle glow
       - Blue solar panel wings with visible grid/cell pattern
       - Light silver barrel (main tube)
       - Dark metallic bus (central structure)
    4. Select a target and verify the telescope still smoothly rotates to point at it
    5. Orbit the camera around and verify all materials look good from different angles
    6. Check that the solar panel grid pattern is visible and resolution-independent (looks sharp at any zoom)
  </how-to-verify>
  <resume-signal>Type "approved" or describe any color/material adjustments needed</resume-signal>
</task>

</tasks>

<verification>
- TypeScript compilation passes without errors
- Visual inspection confirms four distinct material zones on the telescope
- Telescope rotation/pointing behavior unchanged (smooth slerp to target or camera direction)
- Solar panel shader shows procedural grid pattern
</verification>

<success_criteria>
The Roman telescope model renders with four visually distinct material zones matching the NASA-inspired color palette, with a procedural shader on the solar panels, and all existing rotation/pointing behavior preserved.
</success_criteria>

<output>
After completion, create `.planning/quick/4-realistic-multi-material-roman-telescope/4-SUMMARY.md`
</output>
