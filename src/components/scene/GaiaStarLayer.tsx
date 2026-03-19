import { useMemo } from 'react';
import { AdditiveBlending } from 'three';
import { raDecToCartesian } from '../../lib/coordinates';
import type { GaiaSource } from '../../lib/vizier';

interface GaiaStarLayerProps {
  stars: GaiaSource[];
  visible: boolean;
}

/**
 * Three.js Points layer for Gaia DR3 stars in the 3D sky view.
 * Renders as blue overlay points at radius 99 (inside HYG StarField at 100).
 * Uses additive blending for a subtle glow effect.
 */
export function GaiaStarLayer({ stars, visible }: GaiaStarLayerProps) {
  const geometry = useMemo(() => {
    if (stars.length === 0) return null;

    const positions = new Float32Array(stars.length * 3);
    const sizes = new Float32Array(stars.length);

    for (let i = 0; i < stars.length; i++) {
      const pos = raDecToCartesian(stars[i].ra, stars[i].dec, 99);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      sizes[i] = Math.max(0.3, 2.5 - (stars[i].mag - 8) * 0.15);
    }

    return { positions, sizes };
  }, [stars]);

  if (!visible || !geometry) return null;

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={geometry.positions}
          count={stars.length}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          array={geometry.sizes}
          count={stars.length}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#88bbff"
        size={0.4}
        sizeAttenuation
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
