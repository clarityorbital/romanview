import { useMemo } from 'react';
import * as THREE from 'three';
import { Line, Text } from '@react-three/drei';
import { WFI_DETECTORS, DETECTOR_SIZE_ARCMIN } from '../../lib/roman';
import { raDecToCartesian } from '../../lib/coordinates';

interface WFIFootprintProps {
  targetRa: number;
  targetDec: number;
  visible: boolean;
}

export function WFIFootprint({ targetRa, targetDec, visible }: WFIFootprintProps) {
  const footprint = useMemo(() => {
    if (!visible) return null;

    const halfSize = (DETECTOR_SIZE_ARCMIN / 2) / 60;

    return WFI_DETECTORS.map((det) => {
      const dRa = det.centerX / 60;
      const dDec = det.centerY / 60;

      const cosDec = Math.cos((targetDec * Math.PI) / 180);
      const raOffset = cosDec > 0.01 ? dRa / cosDec : dRa;

      const centerRa = targetRa + raOffset;
      const centerDec = targetDec + dDec;

      const raHalf = cosDec > 0.01 ? halfSize / cosDec : halfSize;
      const corners: [number, number, number][] = [
        raDecToCartesian(centerRa - raHalf, centerDec - halfSize, 99).toArray() as [number, number, number],
        raDecToCartesian(centerRa + raHalf, centerDec - halfSize, 99).toArray() as [number, number, number],
        raDecToCartesian(centerRa + raHalf, centerDec + halfSize, 99).toArray() as [number, number, number],
        raDecToCartesian(centerRa - raHalf, centerDec + halfSize, 99).toArray() as [number, number, number],
        raDecToCartesian(centerRa - raHalf, centerDec - halfSize, 99).toArray() as [number, number, number],
      ];

      const center = raDecToCartesian(centerRa, centerDec, 99);

      // Corner tick marks (short lines at each corner for technical schematic look)
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

      // Normal direction for label orientation
      const normal = center.clone().normalize();

      return { id: det.id, corners, center, cornerTicks, normal };
    });
  }, [targetRa, targetDec, visible]);

  if (!footprint) return null;

  return (
    <group>
      {footprint.map((det) => (
        <group key={det.id}>
          {/* Full detector outline — thin dashed style */}
          <Line
            points={det.corners}
            color="#06b6d4"
            transparent
            opacity={0.3}
            lineWidth={0.8}
          />

          {/* Corner tick marks — brighter, thicker */}
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

          {/* Semi-transparent detector fill */}
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
