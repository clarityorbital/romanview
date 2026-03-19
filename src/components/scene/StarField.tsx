import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { loadStarCatalog } from '../../lib/catalog';

const starVertexShader = `
  attribute float size;
  attribute vec3 starColor;
  varying vec3 vColor;
  varying float vSize;

  void main() {
    vColor = starColor;
    vSize = size;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (200.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 0.5, 20.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const starFragmentShader = `
  varying vec3 vColor;
  varying float vSize;

  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);

    // Soft circular falloff with glow
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    float glow = exp(-dist * dist * 8.0) * 0.5;
    alpha = max(alpha, glow);

    if (alpha < 0.01) discard;

    // Brighter center, colored glow
    vec3 color = mix(vColor, vec3(1.0), smoothstep(0.15, 0.0, dist));
    gl_FragColor = vec4(color, alpha);
  }
`;

export function StarField() {
  const pointsRef = useRef<THREE.Points>(null);

  const starData = useMemo(() => loadStarCatalog(), []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(starData.positions, 3));
    geo.setAttribute('starColor', new THREE.Float32BufferAttribute(starData.colors, 3));
    geo.setAttribute('size', new THREE.Float32BufferAttribute(starData.sizes, 1));
    return geo;
  }, [starData]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  useFrame(() => {
    // Stars are static, but keeping the ref for potential animations
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}
