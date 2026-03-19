import { useMemo } from 'react';
import * as THREE from 'three';

/** Render a subtle band for the galactic plane */
export function GalacticPlane({ visible }: { visible: boolean }) {
  const geometry = useMemo(() => {
    // The galactic plane is tilted ~62.87° from the celestial equator
    // Galactic north pole is at RA=192.86°, Dec=27.13° (J2000)
    const segments = 256;
    const radius = 99;
    const width = 0.15; // radians half-width of the band

    const positions: number[] = [];
    const indices: number[] = [];

    // Galactic pole in equatorial coords
    const gnpRa = (192.86 * Math.PI) / 180;
    const gnpDec = (27.13 * Math.PI) / 180;

    // Normal to galactic plane
    const normal = new THREE.Vector3(
      Math.cos(gnpDec) * Math.cos(gnpRa),
      Math.sin(gnpDec),
      -Math.cos(gnpDec) * Math.sin(gnpRa)
    ).normalize();

    // Two perpendicular vectors in the galactic plane
    const up = new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(normal, up).normalize();
    const v = new THREE.Vector3().crossVectors(normal, u).normalize();

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      const center = new THREE.Vector3()
        .addScaledVector(u, Math.cos(angle))
        .addScaledVector(v, Math.sin(angle))
        .normalize();

      // Inner and outer edge
      const inner = center.clone().addScaledVector(normal, -width).normalize().multiplyScalar(radius);
      const outer = center.clone().addScaledVector(normal, width).normalize().multiplyScalar(radius);

      positions.push(inner.x, inner.y, inner.z);
      positions.push(outer.x, outer.y, outer.z);

      if (i < segments) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    return geo;
  }, []);

  if (!visible) return null;

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        color="#7c3aed"
        transparent
        opacity={0.06}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
