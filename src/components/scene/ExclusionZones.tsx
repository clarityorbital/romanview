import { useMemo } from 'react';
import * as THREE from 'three';
import { raDecToCartesian } from '../../lib/coordinates';
import { SUN_EXCLUSION_ANGLE, ANTI_SUN_EXCLUSION_ANGLE, type SunPosition } from '../../lib/constraints';

interface ExclusionZonesProps {
  sunPosition: SunPosition;
  visible: boolean;
}

function createConeMesh(
  _centerRa: number,
  _centerDec: number,
  angleDeg: number,
  _color: string,
  _opacity: number,
  radius: number
): THREE.BufferGeometry {
  const segments = 64;
  const rings = 16;
  const positions: number[] = [];
  const indices: number[] = [];

  // Generate vertices for a spherical cap
  for (let r = 0; r <= rings; r++) {
    const ringAngle = (r / rings) * angleDeg * (Math.PI / 180);
    for (let s = 0; s <= segments; s++) {
      const segAngle = (s / segments) * 2 * Math.PI;

      // Point on a cap centered at north pole
      const x = Math.sin(ringAngle) * Math.cos(segAngle);
      const y = Math.cos(ringAngle);
      const z = Math.sin(ringAngle) * Math.sin(segAngle);

      positions.push(x * radius, y * radius, z * radius);
    }
  }

  // Generate indices
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * (segments + 1) + s;
      const b = a + segments + 1;
      indices.push(a, b, a + 1);
      indices.push(a + 1, b, b + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function ExclusionZones({ sunPosition, visible }: ExclusionZonesProps) {
  const { sunRotation, antiSunRotation } = useMemo(() => {
    // Rotation to align cap from north pole to sun position
    const sunDir = raDecToCartesian(sunPosition.ra, sunPosition.dec, 1).normalize();
    const northPole = new THREE.Vector3(0, 1, 0);

    const sunQuat = new THREE.Quaternion();
    sunQuat.setFromUnitVectors(northPole, sunDir);
    const sunEuler = new THREE.Euler().setFromQuaternion(sunQuat);

    const antiSunRa = (sunPosition.ra + 180) % 360;
    const antiSunDec = -sunPosition.dec;
    const antiSunDir = raDecToCartesian(antiSunRa, antiSunDec, 1).normalize();
    const antiSunQuat = new THREE.Quaternion();
    antiSunQuat.setFromUnitVectors(northPole, antiSunDir);
    const antiSunEuler = new THREE.Euler().setFromQuaternion(antiSunQuat);

    return {
      sunRotation: sunEuler,
      antiSunRotation: antiSunEuler,
    };
  }, [sunPosition]);

  const sunGeo = useMemo(
    () => createConeMesh(sunPosition.ra, sunPosition.dec, SUN_EXCLUSION_ANGLE, '#ef4444', 0.12, 98),
    [sunPosition]
  );

  const antiSunGeo = useMemo(
    () => createConeMesh(0, 0, ANTI_SUN_EXCLUSION_ANGLE, '#f59e0b', 0.1, 98),
    []
  );

  if (!visible) return null;

  return (
    <group>
      {/* Sun exclusion zone */}
      <mesh geometry={sunGeo} rotation={sunRotation}>
        <meshBasicMaterial
          color="#ef4444"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Anti-sun exclusion zone */}
      <mesh geometry={antiSunGeo} rotation={antiSunRotation}>
        <meshBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Sun marker */}
      <SunMarker position={sunPosition} />
    </group>
  );
}

function SunMarker({ position }: { position: SunPosition }) {
  const pos = useMemo(
    () => raDecToCartesian(position.ra, position.dec, 97),
    [position]
  );

  return (
    <mesh position={pos}>
      <sphereGeometry args={[0.8, 16, 16]} />
      <meshBasicMaterial color="#fbbf24" />
    </mesh>
  );
}
