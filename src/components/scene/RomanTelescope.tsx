import { useRef, useMemo } from 'react';
import { useLoader, useFrame, useThree } from '@react-three/fiber';
import { STLLoader } from 'three-stdlib';
import * as THREE from 'three';


interface RomanTelescopeProps {
  targetRa?: number;
  targetDec?: number;
}

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

  // Center and scale geometry once
  const geometry = useMemo(() => {
    const geo = rawGeometry.clone();
    geo.center();
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    // Scale so longest axis is ~0.3 scene units
    const scaleFactor = 0.3 / maxDim;
    geo.scale(scaleFactor, scaleFactor, scaleFactor);
    // The STL model's barrel axis is along X. The aperture (where the
    // telescope looks) is at +X; the sun shield/structure is at -X.
    // Ry(+90°) maps +X to -Z. lookAt() aims -Z toward the target,
    // so the aperture naturally faces the target — no extra flip needed.
    const rotMatrix = new THREE.Matrix4().makeRotationY(Math.PI / 2);
    geo.applyMatrix4(rotMatrix);
    return geo;
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
    // lookAt aims -Z toward `_dir`, which is the aperture axis after Ry(+90°).
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
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#b8bcc4"
          metalness={0.9}
          roughness={0.2}
          emissive="#1a1a2e"
          emissiveIntensity={0.1}
        />
      </mesh>
      <pointLight intensity={0.5} distance={2} position={[0.3, 0.3, 0.3]} />
    </group>
  );
}
