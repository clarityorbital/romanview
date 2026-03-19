import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { raDecToCartesian } from '../../lib/coordinates';

interface CoordinateGridProps {
  visible: boolean;
}

export function CoordinateGrid({ visible }: CoordinateGridProps) {
  const lines = useMemo(() => {
    const lineData: { points: [number, number, number][]; isEquator: boolean }[] = [];
    const radius = 99.5;
    const segments = 180;

    // RA lines (every 30° = 2h)
    for (let ra = 0; ra < 360; ra += 30) {
      const points: [number, number, number][] = [];
      for (let d = -90; d <= 90; d += 180 / segments) {
        const p = raDecToCartesian(ra, d, radius);
        points.push([p.x, p.y, p.z]);
      }
      lineData.push({ points, isEquator: false });
    }

    // Dec lines (every 30°)
    for (let dec = -60; dec <= 60; dec += 30) {
      const points: [number, number, number][] = [];
      for (let r = 0; r <= 360; r += 360 / segments) {
        const p = raDecToCartesian(r, dec, radius);
        points.push([p.x, p.y, p.z]);
      }
      lineData.push({ points, isEquator: dec === 0 });
    }

    return lineData;
  }, []);

  if (!visible) return null;

  return (
    <group>
      {lines.map((line, i) => (
        <Line
          key={i}
          points={line.points}
          color={line.isEquator ? '#1e40af' : '#1e3a5f'}
          transparent
          opacity={line.isEquator ? 0.3 : 0.12}
          lineWidth={1}
        />
      ))}
    </group>
  );
}
