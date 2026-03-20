import { useRef, useMemo } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { STLLoader } from 'three-stdlib';
import * as THREE from 'three';
import { raDecToCartesian } from '../../lib/coordinates';

interface RomanTelescopeProps {
  targetRa: number | null;
  targetDec: number | null;
}

/** Default forward direction when no target is selected (+Z) */
const DEFAULT_DIRECTION = new THREE.Vector3(0, 0, 1);

/**
 * Correction quaternion: 180 degrees around Y.
 * Three.js lookAt() points the object's -Z axis toward the target.
 * After the geometry base rotation, the telescope's optical axis is +Z.
 * This 180-degree Y flip maps -Z -> +Z so the aperture faces the target.
 */
const FLIP_Y_180 = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0),
  Math.PI
);

export function RomanTelescope({ targetRa, targetDec }: RomanTelescopeProps) {
  const rawGeometry = useLoader(
    STLLoader,
    '/models/Nancy Grace Roman Space Telescope.stl'
  );

  const groupRef = useRef<THREE.Group>(null);
  const targetQuatRef = useRef(new THREE.Quaternion());
  const currentQuatRef = useRef(new THREE.Quaternion());
  const initialized = useRef(false);

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
    // Determine the model's natural forward axis after loading.
    // The STL model's aperture (optical axis) faces along its local +Y.
    // Apply a base rotation so +Z becomes the "forward" direction for lookAt.
    // Rotate -90 degrees around X to map model +Y -> world +Z.
    const rotMatrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    geo.applyMatrix4(rotMatrix);
    return geo;
  }, [rawGeometry]);

  // Compute target quaternion when ra/dec change
  useMemo(() => {
    let dir: THREE.Vector3;
    if (targetRa !== null && targetDec !== null) {
      dir = raDecToCartesian(targetRa, targetDec, 1).normalize();
    } else {
      dir = DEFAULT_DIRECTION.clone();
    }

    // lookAt builds a rotation that aims -Z toward `dir`.
    // Then we multiply by FLIP_Y_180 so the optical axis (+Z) faces the target.
    const mat = new THREE.Matrix4().lookAt(
      new THREE.Vector3(0, 0, 0),
      dir,
      new THREE.Vector3(0, 1, 0)
    );
    targetQuatRef.current.setFromRotationMatrix(mat).multiply(FLIP_Y_180);
  }, [targetRa, targetDec]);

  useFrame(() => {
    if (!groupRef.current) return;

    if (!initialized.current) {
      // Snap to initial orientation on first frame
      currentQuatRef.current.copy(targetQuatRef.current);
      groupRef.current.quaternion.copy(currentQuatRef.current);
      initialized.current = true;
      return;
    }

    // Smooth slerp toward target quaternion
    currentQuatRef.current.slerp(targetQuatRef.current, 0.05);
    groupRef.current.quaternion.copy(currentQuatRef.current);
  });

  return (
    <group ref={groupRef}>
      {/* Telescope mesh */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#b8bcc4"
          metalness={0.9}
          roughness={0.2}
          emissive="#1a1a2e"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Local lighting for specular highlights */}
      <pointLight intensity={0.5} distance={2} position={[0.3, 0.3, 0.3]} />
    </group>
  );
}
