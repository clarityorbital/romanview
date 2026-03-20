import { useRef, useState, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { StarField } from './StarField';
import { GaiaStarLayer } from './GaiaStarLayer';
import { WFIFootprint } from './WFIFootprint';
import { ExclusionZones } from './ExclusionZones';
import { FieldOfRegard } from './FieldOfRegard';
import { SelectionIndicator } from './SelectionIndicator';
import { CoordinateGrid } from './CoordinateGrid';
import { GalacticPlane } from './GalacticPlane';
import { RomanTelescope } from './RomanTelescope';
import { raDecToCartesian } from '../../lib/coordinates';
import type { SunPosition } from '../../lib/constraints';
import type { Target } from '../../hooks/useTargets';
import type { GaiaSource } from '../../lib/vizier';

interface CelestialSceneProps {
  sunPosition: SunPosition;
  selectedTarget: Target | null;
  v3pa: number | null;
  showGrid: boolean;
  showConstraints: boolean;
  showGalactic: boolean;
  gaiaStars: GaiaSource[];
}

function CameraController({
  target,
  onAnimatingChange,
  goalLookAtRef,
}: {
  target: Target | null;
  onAnimatingChange: (animating: boolean) => void;
  goalLookAtRef: React.RefObject<THREE.Vector3>;
}) {
  const { camera } = useThree();
  const lastTargetId = useRef<string | null>(null);
  const isAnimating = useRef(false);
  const goalPosition = useRef(new THREE.Vector3(0, 0, 3));
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 100));

  useFrame(() => {
    // Detect target change
    const currentId = target?.id ?? null;
    if (currentId !== lastTargetId.current) {
      lastTargetId.current = currentId;

      if (target) {
        // Compute direction toward the target on the sky sphere
        const targetDir = raDecToCartesian(target.ra, target.dec, 1).normalize();

        // Camera goes behind the telescope (opposite of target direction),
        // slightly elevated for a "looking over the shoulder" composition
        goalPosition.current
          .copy(targetDir)
          .multiplyScalar(-2.5)
          .add(new THREE.Vector3(0, 0.3, 0));

        // Look at target on the sky sphere -- write to shared ref
        goalLookAtRef.current.copy(targetDir).multiplyScalar(100);

        // Initialize currentLookAt from where the camera is currently looking
        const currentDir = new THREE.Vector3();
        camera.getWorldDirection(currentDir);
        currentLookAt.current
          .copy(camera.position)
          .add(currentDir.multiplyScalar(100));
      } else {
        // No target: return to default position
        goalPosition.current.set(0, 0, 3);
        goalLookAtRef.current.set(0, 0, 100);

        const currentDir = new THREE.Vector3();
        camera.getWorldDirection(currentDir);
        currentLookAt.current
          .copy(camera.position)
          .add(currentDir.multiplyScalar(100));
      }

      isAnimating.current = true;
      onAnimatingChange(true);
    }

    // Smooth animation each frame
    if (isAnimating.current) {
      camera.position.lerp(goalPosition.current, 0.03);
      currentLookAt.current.lerp(goalLookAtRef.current, 0.03);
      camera.lookAt(currentLookAt.current);

      // Check if close enough to goal
      const posDist = camera.position.distanceTo(goalPosition.current);
      const lookDist = currentLookAt.current.distanceTo(goalLookAtRef.current);

      if (posDist < 0.01 && lookDist < 0.5) {
        isAnimating.current = false;
        onAnimatingChange(false);
        camera.position.copy(goalPosition.current);
        currentLookAt.current.copy(goalLookAtRef.current);
        camera.lookAt(currentLookAt.current);
      }
    }
  });

  return null;
}

function SceneOrbitControls({
  animating,
  goalLookAtRef,
}: {
  animating: boolean;
  goalLookAtRef: React.RefObject<THREE.Vector3>;
}) {
  const orbitRef = useRef(null);

  useFrame(() => {
    // After animation completes, update orbit target so user orbits around
    // the telescope/target axis rather than pure origin
    if (!animating && orbitRef.current && goalLookAtRef.current) {
      const orbitControls = orbitRef.current as { target: THREE.Vector3 };
      const idealTarget = goalLookAtRef.current
        .clone()
        .normalize()
        .multiplyScalar(2);
      orbitControls.target.lerp(idealTarget, 0.05);
    }
  });

  return (
    <OrbitControls
      ref={orbitRef}
      enabled={!animating}
      enablePan={false}
      minDistance={0.5}
      maxDistance={200}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      enableDamping
      dampingFactor={0.05}
    />
  );
}

export function CelestialScene({
  sunPosition,
  selectedTarget,
  v3pa,
  showGrid,
  showConstraints,
  showGalactic,
  gaiaStars,
}: CelestialSceneProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const goalLookAtRef = useRef(new THREE.Vector3(0, 0, 100));

  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 60, near: 0.1, far: 500 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0a0a0f' }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#0a0a0f']} />
      <ambientLight intensity={0.1} />

      {/* Directional light simulating sunlight for the telescope mesh */}
      <directionalLight intensity={0.6} position={[5, 3, 5]} />
      <pointLight intensity={0.3} position={[0, 0.5, 0.5]} />

      {/* 3D Roman Space Telescope at origin */}
      <Suspense fallback={null}>
        <RomanTelescope
          targetRa={selectedTarget?.ra ?? null}
          targetDec={selectedTarget?.dec ?? null}
        />
      </Suspense>

      <StarField />
      <GaiaStarLayer stars={gaiaStars} visible={selectedTarget !== null} />
      <CoordinateGrid visible={showGrid} />
      <GalacticPlane visible={showGalactic} />

      {showConstraints && (
        <>
          <FieldOfRegard sunPosition={sunPosition} visible={showConstraints} />
          <ExclusionZones sunPosition={sunPosition} visible={showConstraints} />
        </>
      )}

      {selectedTarget && v3pa !== null && (
        <>
          <SelectionIndicator
            ra={selectedTarget.ra}
            dec={selectedTarget.dec}
            visible={true}
          />
          <WFIFootprint
            targetRa={selectedTarget.ra}
            targetDec={selectedTarget.dec}
            v3pa={v3pa}
            visible={true}
          />
        </>
      )}

      <CameraController
        target={selectedTarget}
        onAnimatingChange={setIsAnimating}
        goalLookAtRef={goalLookAtRef}
      />

      <SceneOrbitControls
        animating={isAnimating}
        goalLookAtRef={goalLookAtRef}
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
