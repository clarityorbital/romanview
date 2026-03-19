import { useMemo } from 'react';
import * as THREE from 'three';
import { type SunPosition, SUN_EXCLUSION_ANGLE, ANTI_SUN_EXCLUSION_ANGLE } from '../../lib/constraints';

interface FieldOfRegardProps {
  sunPosition: SunPosition;
  visible: boolean;
}

/** Visualize the observable band on the celestial sphere */
export function FieldOfRegard({ sunPosition, visible }: FieldOfRegardProps) {
  const shader = useMemo(() => {
    return {
      uniforms: {
        sunRa: { value: sunPosition.ra * (Math.PI / 180) },
        sunDec: { value: sunPosition.dec * (Math.PI / 180) },
        sunExclusion: { value: SUN_EXCLUSION_ANGLE * (Math.PI / 180) },
        antiSunExclusion: { value: ANTI_SUN_EXCLUSION_ANGLE * (Math.PI / 180) },
        opacity: { value: 0.06 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float sunRa;
        uniform float sunDec;
        uniform float sunExclusion;
        uniform float antiSunExclusion;
        uniform float opacity;
        varying vec3 vWorldPos;

        void main() {
          // Reconstruct RA/Dec from position
          vec3 p = normalize(vWorldPos);
          float dec = asin(p.y);
          float ra = atan(-p.z, p.x);

          // Sun direction
          vec3 sunDir = vec3(
            cos(sunDec) * cos(sunRa),
            sin(sunDec),
            -cos(sunDec) * sin(sunRa)
          );

          // Anti-sun
          vec3 antiSunDir = -sunDir;

          float sunAngle = acos(clamp(dot(p, sunDir), -1.0, 1.0));
          float antiSunAngle = acos(clamp(dot(p, antiSunDir), -1.0, 1.0));

          bool inSunZone = sunAngle < sunExclusion;
          bool inAntiSunZone = antiSunAngle < antiSunExclusion;

          if (inSunZone) {
            // Red for sun exclusion
            float edgeFade = smoothstep(sunExclusion, sunExclusion - 0.05, sunAngle);
            gl_FragColor = vec4(0.94, 0.27, 0.27, opacity * 1.5 * edgeFade);
          } else if (inAntiSunZone) {
            // Amber for anti-sun
            float edgeFade = smoothstep(antiSunExclusion, antiSunExclusion - 0.05, antiSunAngle);
            gl_FragColor = vec4(0.96, 0.62, 0.04, opacity * 1.2 * edgeFade);
          } else {
            // Green tint for observable zone
            gl_FragColor = vec4(0.06, 0.72, 0.51, opacity * 0.3);
          }
        }
      `,
    };
  }, [sunPosition]);

  if (!visible) return null;

  return (
    <mesh>
      <sphereGeometry args={[97.5, 128, 64]} />
      <shaderMaterial
        attach="material"
        uniforms={shader.uniforms}
        vertexShader={shader.vertexShader}
        fragmentShader={shader.fragmentShader}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
      />
    </mesh>
  );
}
