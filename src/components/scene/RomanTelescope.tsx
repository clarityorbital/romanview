import { useRef, useMemo } from 'react';
import { useLoader, useFrame, useThree } from '@react-three/fiber';
import { STLLoader } from 'three-stdlib';
import * as THREE from 'three';


interface RomanTelescopeProps {
  targetRa?: number;
  targetDec?: number;
}

/**
 * Segment a centered (but un-rotated, un-scaled) geometry into four zones
 * based on triangle centroid positions in raw STL coordinate space.
 *
 * Zones (raw centered coords, barrel axis along X):
 *   sunShield  : centroid.x < -60
 *   solarPanel : |centroid.y| > 40
 *   barrel     : sqrt(y^2 + z^2) < 40 AND centroid.x >= -60
 *   bus        : everything else
 */
function segmentGeometry(source: THREE.BufferGeometry): {
  sunShield: THREE.BufferGeometry;
  solarPanel: THREE.BufferGeometry;
  barrel: THREE.BufferGeometry;
  bus: THREE.BufferGeometry;
} {
  const posAttr = source.getAttribute('position') as THREE.BufferAttribute;
  const normAttr = source.getAttribute('normal') as THREE.BufferAttribute;

  // Accumulate triangle vertex data per zone
  const zones: Record<string, { positions: number[]; normals: number[] }> = {
    sunShield: { positions: [], normals: [] },
    solarPanel: { positions: [], normals: [] },
    barrel: { positions: [], normals: [] },
    bus: { positions: [], normals: [] },
  };

  const isIndexed = source.index !== null;
  const triCount = isIndexed
    ? source.index!.count / 3
    : posAttr.count / 3;

  for (let t = 0; t < triCount; t++) {
    // Get the three vertex indices for this triangle
    const i0 = isIndexed ? source.index!.getX(t * 3) : t * 3;
    const i1 = isIndexed ? source.index!.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = isIndexed ? source.index!.getX(t * 3 + 2) : t * 3 + 2;

    // Compute centroid
    const cx = (posAttr.getX(i0) + posAttr.getX(i1) + posAttr.getX(i2)) / 3;
    const cy = (posAttr.getY(i0) + posAttr.getY(i1) + posAttr.getY(i2)) / 3;
    const cz = (posAttr.getZ(i0) + posAttr.getZ(i1) + posAttr.getZ(i2)) / 3;

    // Classify zone
    let zone: string;
    if (cx < -60) {
      zone = 'sunShield';
    } else if (Math.abs(cy) > 40) {
      zone = 'solarPanel';
    } else if (Math.sqrt(cy * cy + cz * cz) < 40) {
      zone = 'barrel';
    } else {
      zone = 'bus';
    }

    // Copy all three vertices' position and normal data
    for (const idx of [i0, i1, i2]) {
      zones[zone].positions.push(
        posAttr.getX(idx), posAttr.getY(idx), posAttr.getZ(idx)
      );
      zones[zone].normals.push(
        normAttr.getX(idx), normAttr.getY(idx), normAttr.getZ(idx)
      );
    }
  }

  // Build a BufferGeometry for each zone
  const result = {} as Record<string, THREE.BufferGeometry>;
  for (const key of Object.keys(zones)) {
    const geo = new THREE.BufferGeometry();
    const posArray = new Float32Array(zones[key].positions);
    const normArray = new Float32Array(zones[key].normals);
    geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normArray, 3));
    result[key] = geo;
  }

  return result as {
    sunShield: THREE.BufferGeometry;
    solarPanel: THREE.BufferGeometry;
    barrel: THREE.BufferGeometry;
    bus: THREE.BufferGeometry;
  };
}

// Solar panel procedural shader: deep blue base with rectangular grid lines
const solarPanelVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const solarPanelFragmentShader = /* glsl */ `
  uniform vec3 lightDirection;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;

  void main() {
    // Base deep blue color
    vec3 baseColor = vec3(0.102, 0.227, 0.541); // #1a3a8a

    // Grid pattern using fract on world-space coordinates
    // Scale factor to get reasonable cell size on the panels
    float scale = 80.0;
    vec3 scaledPos = vWorldPosition * scale;

    // Rectangular grid lines
    vec2 grid = abs(fract(scaledPos.xz - 0.5) - 0.5);
    float lineWidth = 0.04;
    float lineX = smoothstep(lineWidth, lineWidth + 0.01, grid.x);
    float lineZ = smoothstep(lineWidth, lineWidth + 0.01, grid.y);
    float gridMask = min(lineX, lineZ);

    // Grid line color: lighter blue/silver
    vec3 lineColor = vec3(0.133, 0.333, 0.733); // #2255bb

    // Mix base and line colors
    vec3 surfaceColor = mix(lineColor, baseColor, gridMask);

    // Simple N dot L lighting
    float NdotL = max(dot(vNormal, lightDirection), 0.0);
    float ambient = 0.15;
    float lighting = ambient + NdotL * 0.85;

    // Emissive contribution for visibility in shadow
    vec3 emissive = baseColor * 0.08;

    gl_FragColor = vec4(surfaceColor * lighting + emissive, 1.0);
  }
`;

export function RomanTelescope({ targetRa, targetDec }: RomanTelescopeProps) {
  const rawGeometry = useLoader(
    STLLoader,
    '/models/Nancy Grace Roman Space Telescope.stl'
  );

  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const currentQuatRef = useRef(new THREE.Quaternion());
  const initialized = useRef(false);

  // Reusable objects to avoid per-frame allocations
  const _dir = useMemo(() => new THREE.Vector3(), []);
  const _mat = useMemo(() => new THREE.Matrix4(), []);
  const _targetQuat = useMemo(() => new THREE.Quaternion(), []);
  const _up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const _origin = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  // Solar panel procedural shader material (created once)
  const solarPanelMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: solarPanelVertexShader,
      fragmentShader: solarPanelFragmentShader,
      uniforms: {
        lightDirection: {
          value: new THREE.Vector3(1, 1, 0.5).normalize(),
        },
      },
    });
  }, []);

  // Segment, scale, and rotate geometry into four material zones
  const { sunShield, solarPanel, barrel, bus } = useMemo(() => {
    const geo = rawGeometry.clone();
    geo.center();
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    // Scale so longest axis is ~0.3 scene units
    const scaleFactor = 0.3 / maxDim;

    // Segment on centered (un-scaled, un-rotated) geometry
    const segments = segmentGeometry(geo);

    // Apply same scale + rotation to each segment
    const rotMatrix = new THREE.Matrix4().makeRotationY(Math.PI / 2);
    for (const key of Object.keys(segments) as Array<keyof typeof segments>) {
      segments[key].scale(scaleFactor, scaleFactor, scaleFactor);
      segments[key].applyMatrix4(rotMatrix);
    }

    return segments;
  }, [rawGeometry]);

  // R3F v9 updates the useFrame callback ref via useLayoutEffect (synchronous),
  // so reading targetRa/targetDec from props directly always gives current values.
  // Do NOT use useEffect + refs — the async delay causes flickering.
  useFrame(() => {
    if (!groupRef.current) return;

    // When a target RA/Dec is provided, point toward that sky position;
    // otherwise fall back to tracking the camera look direction.
    if (targetRa !== undefined && targetDec !== undefined) {
      // Inline raDecToCartesian to avoid per-frame Vector3 allocation
      const ra = THREE.MathUtils.degToRad(targetRa);
      const dec = THREE.MathUtils.degToRad(targetDec);
      _dir.set(
        Math.cos(dec) * Math.cos(ra),
        Math.sin(dec),
        -Math.cos(dec) * Math.sin(ra)
      );
    } else {
      camera.getWorldDirection(_dir);
    }

    // Build a quaternion that points the telescope along the direction.
    // lookAt aims -Z toward `_dir`, which is the aperture axis after Ry(+90deg).
    _mat.lookAt(_origin, _dir, _up);
    _targetQuat.setFromRotationMatrix(_mat);

    if (!initialized.current) {
      // Snap to initial orientation on first frame
      currentQuatRef.current.copy(_targetQuat);
      groupRef.current.quaternion.copy(currentQuatRef.current);
      initialized.current = true;
      return;
    }

    // Smooth slerp toward target quaternion
    currentQuatRef.current.slerp(_targetQuat, 0.12);
    groupRef.current.quaternion.copy(currentQuatRef.current);
  });

  return (
    <group ref={groupRef}>
      {/* Sun shield: gold with emissive amber glow */}
      <mesh geometry={sunShield}>
        <meshStandardMaterial
          color="#d4a843"
          metalness={0.7}
          roughness={0.3}
          emissive="#ff8800"
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Solar panels: procedural blue grid shader */}
      <mesh geometry={solarPanel} material={solarPanelMaterial} />

      {/* Barrel: light silver-white metallic */}
      <mesh geometry={barrel}>
        <meshStandardMaterial
          color="#e8e8ec"
          metalness={0.6}
          roughness={0.35}
          emissive="#1a1a2e"
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* Bus/structure: dark metallic */}
      <mesh geometry={bus}>
        <meshStandardMaterial
          color="#3a3a4a"
          metalness={0.85}
          roughness={0.25}
          emissive="#0a0a15"
          emissiveIntensity={0.08}
        />
      </mesh>

      <pointLight intensity={0.5} distance={2} position={[0.3, 0.3, 0.3]} />
    </group>
  );
}
