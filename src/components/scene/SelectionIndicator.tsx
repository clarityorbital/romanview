import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { raDecToCartesian } from '../../lib/coordinates';

interface SelectionIndicatorProps {
  ra: number;
  dec: number;
  visible: boolean;
}

export function SelectionIndicator({ ra, dec, visible }: SelectionIndicatorProps) {
  const groupRef = useRef<THREE.Group>(null);

  const position = useMemo(() => raDecToCartesian(ra, dec, 98.5), [ra, dec]);
  const normal = useMemo(() => position.clone().normalize(), [position]);

  // Build a rotation quaternion that orients the ring to face outward
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return q;
  }, [normal]);

  useFrame(({ clock }) => {
    if (groupRef.current && visible) {
      // Slowly rotate the ring around its normal
      const baseQ = quaternion.clone();
      const spinQ = new THREE.Quaternion().setFromAxisAngle(normal, clock.elapsedTime * 0.3);
      groupRef.current.quaternion.copy(spinQ.multiply(baseQ));

      // Pulse scale
      const scale = 1 + Math.sin(clock.elapsedTime * 2) * 0.05;
      groupRef.current.scale.setScalar(scale);
    }
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} position={position}>
      {/* Outer selection ring */}
      <mesh>
        <ringGeometry args={[1.2, 1.5, 64]} />
        <meshBasicMaterial
          color="#06b6d4"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Inner dot */}
      <mesh>
        <ringGeometry args={[0.05, 0.15, 16]} />
        <meshBasicMaterial
          color="#06b6d4"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
