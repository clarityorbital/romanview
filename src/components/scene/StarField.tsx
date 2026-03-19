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
    gl_PointSize = size * (250.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 0.5, 28.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const starFragmentShader = `
  varying vec3 vColor;
  varying float vSize;

  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);

    // Hard bright core
    float core = 1.0 - smoothstep(0.0, 0.12, dist);

    // Soft inner glow
    float inner = exp(-dist * dist * 12.0) * 0.7;

    // Wide outer glow for bloom pickup (brighter stars get wider halos)
    float outer = exp(-dist * dist * 3.0) * 0.15 * smoothstep(1.0, 4.0, vSize);

    float alpha = core + inner + outer;

    if (alpha < 0.005) discard;

    // White-hot center blending into star color
    vec3 color = mix(vColor, vec3(1.0), core * 0.9);
    // Boost brightness for bloom to pick up
    color *= 1.0 + core * 0.5;

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
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
