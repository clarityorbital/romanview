import { useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { StarField } from './StarField';
import { WFIFootprint } from './WFIFootprint';
import { ExclusionZones } from './ExclusionZones';
import { FieldOfRegard } from './FieldOfRegard';
import { SelectionIndicator } from './SelectionIndicator';
import { CoordinateGrid } from './CoordinateGrid';
import { GalacticPlane } from './GalacticPlane';
import type { SunPosition } from '../../lib/constraints';
import type { Target } from '../../hooks/useTargets';

interface CelestialSceneProps {
  sunPosition: SunPosition;
  selectedTarget: Target | null;
  showGrid: boolean;
  showConstraints: boolean;
  showGalactic: boolean;
}

function CameraController({ target }: { target: Target | null }) {
  const { camera } = useThree();
  const lastTarget = useRef<string | null>(null);

  // Animate camera to look at target position
  if (target && target.id !== lastTarget.current) {
    lastTarget.current = target.id;
    const ra = (target.ra * Math.PI) / 180;
    const dec = (target.dec * Math.PI) / 180;
    const distance = camera.position.length() || 2;

    // Camera looks inward from outside the sphere
    camera.position.set(
      distance * Math.cos(dec) * Math.cos(ra),
      distance * Math.sin(dec),
      -distance * Math.cos(dec) * Math.sin(ra)
    );
  }

  return null;
}

export function CelestialScene({
  sunPosition,
  selectedTarget,
  showGrid,
  showConstraints,
  showGalactic,
}: CelestialSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 60, near: 0.1, far: 500 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0a0a0f' }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#0a0a0f']} />
      <ambientLight intensity={0.1} />

      <StarField />
      <CoordinateGrid visible={showGrid} />
      <GalacticPlane visible={showGalactic} />

      {showConstraints && (
        <>
          <FieldOfRegard sunPosition={sunPosition} visible={showConstraints} />
          <ExclusionZones sunPosition={sunPosition} visible={showConstraints} />
        </>
      )}

      {selectedTarget && (
        <>
          <SelectionIndicator
            ra={selectedTarget.ra}
            dec={selectedTarget.dec}
            visible={true}
          />
          <WFIFootprint
            targetRa={selectedTarget.ra}
            targetDec={selectedTarget.dec}
            visible={true}
          />
        </>
      )}

      <CameraController target={selectedTarget} />

      <OrbitControls
        enablePan={false}
        minDistance={0.5}
        maxDistance={200}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        enableDamping
        dampingFactor={0.05}
      />

      <EffectComposer>
        <Bloom
          intensity={1.2}
          luminanceThreshold={0.4}
          luminanceSmoothing={0.7}
          radius={0.9}
          mipmapBlur
        />
        <Vignette offset={0.2} darkness={0.6} />
      </EffectComposer>
    </Canvas>
  );
}
