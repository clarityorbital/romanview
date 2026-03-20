import { useMemo } from 'react';
import * as THREE from 'three';
import { Line, Text } from '@react-three/drei';
import { WFI_DETECTORS, WFI_BORESIGHT } from '../../lib/roman';
import { raDecToCartesian } from '../../lib/coordinates';
import { v2v3ToSky } from '../../lib/wcs';

interface WFIFootprintProps {
  targetRa: number;
  targetDec: number;
  v3pa: number;
  visible: boolean;
}

export function WFIFootprint({ targetRa, targetDec, v3pa, visible }: WFIFootprintProps) {

  const footprint = useMemo(() => {
    if (!visible) return null;

    return WFI_DETECTORS.map((det) => {
      // Project each detector's 4 V2V3 corners to sky RA/Dec via the WCS engine
      const skyCorners = det.corners_v2v3.map(([v2, v3]) =>
        v2v3ToSky(v2, v3, WFI_BORESIGHT.v2, WFI_BORESIGHT.v3, targetRa, targetDec, v3pa)
      );

      // Convert sky positions to 3D Cartesian for Three.js rendering
      const corners: [number, number, number][] = skyCorners.map(({ ra, dec }) =>
        raDecToCartesian(ra, dec, 99).toArray() as [number, number, number]
      );
      // Close the loop
      corners.push(corners[0]);

      // Detector center on sky from V2Ref/V3Ref
      const centerSky = v2v3ToSky(
        det.v2Ref, det.v3Ref,
        WFI_BORESIGHT.v2, WFI_BORESIGHT.v3,
        targetRa, targetDec, v3pa
      );
      const center = raDecToCartesian(centerSky.ra, centerSky.dec, 99);

      // Corner tick marks for visual emphasis
      const tickLen = 0.015;
      const cornerTicks: [number, number, number][][] = [];
      for (let c = 0; c < 4; c++) {
        const curr = new THREE.Vector3(...corners[c]);
        const next = new THREE.Vector3(...corners[(c + 1) % 4]);
        const prev = new THREE.Vector3(...corners[(c + 3) % 4]);

        const dirNext = next.clone().sub(curr).normalize().multiplyScalar(tickLen);
        const dirPrev = prev.clone().sub(curr).normalize().multiplyScalar(tickLen);

        cornerTicks.push([
          curr.clone().add(dirPrev).toArray() as [number, number, number],
          corners[c],
          curr.clone().add(dirNext).toArray() as [number, number, number],
        ]);
      }

      return { id: det.id, corners, center, cornerTicks };
    });
  }, [targetRa, targetDec, v3pa, visible]);

  if (!footprint) return null;

  return (
    <group>
      {footprint.map((det) => (
        <group key={det.id}>
          {/* Detector outline */}
          <Line
            points={det.corners}
            color="#06b6d4"
            transparent
            opacity={0.3}
            lineWidth={0.8}
          />

          {/* Corner tick marks */}
          {det.cornerTicks.map((tick, i) => (
            <Line
              key={i}
              points={tick}
              color="#06b6d4"
              transparent
              opacity={0.7}
              lineWidth={1.5}
            />
          ))}

          {/* Semi-transparent fill */}
          <mesh position={det.center}>
            <planeGeometry args={[0.18, 0.18]} />
            <meshBasicMaterial
              color="#06b6d4"
              transparent
              opacity={0.02}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* Detector ID label */}
          <Text
            position={det.center.clone().multiplyScalar(1.001)}
            fontSize={0.04}
            color="#06b6d4"
            anchorX="center"
            anchorY="middle"
            fillOpacity={0.4}
            font={undefined}
          >
            {det.id}
          </Text>
        </group>
      ))}
    </group>
  );
}
