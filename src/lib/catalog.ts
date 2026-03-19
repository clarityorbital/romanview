import starsRaw from '../data/hyg_bright.json';
import { colorIndexToColor, raDecToCartesian } from './coordinates';
import * as THREE from 'three';

/** Raw catalog: each entry is [ra_deg, dec_deg, magnitude, color_index] */
export function getRawStars(): number[][] {
  return starsRaw as number[][];
}

export interface StarData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  count: number;
}

/** Pre-process star catalog into typed arrays for instanced rendering */
export function loadStarCatalog(): StarData {
  const stars = starsRaw as number[][];
  const count = stars.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  const tempColor = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const [ra, dec, mag, ci] = stars[i];
    const pos = raDecToCartesian(ra, dec, 100); // stars on sphere of radius 100

    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;

    // Star size: brighter = larger. mag ranges from ~-1 to 8
    // Map to size 0.3 to 3.0
    const size = Math.max(0.3, 3.0 - (mag + 1) * 0.3);
    sizes[i] = size;

    // Color from color index
    const color = colorIndexToColor(ci);
    tempColor.copy(color);

    // Boost brightness for bright stars
    if (mag < 2) {
      const boost = 1 + (2 - mag) * 0.3;
      tempColor.multiplyScalar(boost);
    }

    colors[i * 3] = tempColor.r;
    colors[i * 3 + 1] = tempColor.g;
    colors[i * 3 + 2] = tempColor.b;
  }

  return { positions, colors, sizes, count };
}
