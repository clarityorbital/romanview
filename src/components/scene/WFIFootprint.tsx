import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
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
      return { id: det.id, corners, center };
    });
  }, [targetRa, targetDec, visible]);

  if (!footprint) return null;

  return (
    <group>
      {footprint.map((det) => (
        <group key={det.id}>
          <Line
            points={det.corners}
            color="#06b6d4"
            transparent
            opacity={0.7}
            lineWidth={1.5}
          />
          <mesh position={det.center}>
            <planeGeometry args={[0.2, 0.2]} />
            <meshBasicMaterial
              color="#06b6d4"
              transparent
              opacity={0.05}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
