import { useMemo } from 'react';
import { WFI_DETECTORS, DETECTOR_SIZE_ARCMIN, TOTAL_FOV_ARCMIN } from '../../lib/roman';
import { positionAngle } from '../../lib/coordinates';
import { getRawStars } from '../../lib/catalog';
import type { SunPosition } from '../../lib/constraints';

interface FocalPlaneViewProps {
  targetRa: number;
  targetDec: number;
  sunPosition: SunPosition;
}

interface FocalPlaneStar {
  x: number; // arcmin in focal plane
  y: number;
  mag: number;
  ci: number;
}

/**
 * Project sky coordinates onto the WFI focal plane.
 * Returns (x, y) in arcminutes from boresight, rotated by PA.
 */
function projectToFocalPlane(
  starRa: number, starDec: number,
  boresightRa: number, boresightDec: number,
  paDeg: number
): [number, number] | null {
  const toRad = Math.PI / 180;
  const ra = starRa * toRad;
  const dec = starDec * toRad;
  const ra0 = boresightRa * toRad;
  const dec0 = boresightDec * toRad;

  const cosDec = Math.cos(dec);
  const sinDec = Math.sin(dec);
  const cosDec0 = Math.cos(dec0);
  const sinDec0 = Math.sin(dec0);
  const dRa = ra - ra0;
  const cosDRa = Math.cos(dRa);

  // Gnomonic (tangent-plane) projection
  const cosC = sinDec0 * sinDec + cosDec0 * cosDec * cosDRa;
  if (cosC <= 0) return null; // behind the tangent point

  const xi = (cosDec * Math.sin(dRa)) / cosC;   // radians, east direction
  const eta = (cosDec0 * sinDec - sinDec0 * cosDec * cosDRa) / cosC; // radians, north direction

  // Convert to arcmin
  const xArcmin = (xi / toRad) * 60;
  const yArcmin = (eta / toRad) * 60;

  // Rotate by -PA to go from sky coords to focal plane coords
  // (PA rotates focal plane relative to sky, so we undo it)
  const pa = paDeg * toRad;
  const cosPA = Math.cos(pa);
  const sinPA = Math.sin(pa);
  const fpX = xArcmin * cosPA + yArcmin * sinPA;
  const fpY = -xArcmin * sinPA + yArcmin * cosPA;

  return [fpX, fpY];
}

/**
 * Map color index to a CSS color string.
 */
function ciToColor(ci: number): string {
  // Simplified: blue stars (ci < 0) → blue, white (0-0.5) → white, yellow (0.5-1.2) → warm, red (>1.2) → orange
  if (ci < 0) return '#aaccff';
  if (ci < 0.3) return '#ddeeff';
  if (ci < 0.6) return '#ffffee';
  if (ci < 1.0) return '#ffddaa';
  return '#ffbb77';
}

export function FocalPlaneView({ targetRa, targetDec, sunPosition }: FocalPlaneViewProps) {
  const pa = useMemo(
    () => positionAngle(targetRa, targetDec, sunPosition.ra, sunPosition.dec),
    [targetRa, targetDec, sunPosition.ra, sunPosition.dec]
  );

  // Half-extents of the full FOV in arcmin (with some padding)
  const padFactor = 1.15;
  const halfW = (TOTAL_FOV_ARCMIN.width / 2) * padFactor;
  const halfH = (TOTAL_FOV_ARCMIN.height / 2) * padFactor;

  // SVG viewBox: focal plane in arcmin, origin at boresight
  const vbX = -halfW;
  const vbY = -halfH;
  const vbW = halfW * 2;
  const vbH = halfH * 2;

  const halfDet = DETECTOR_SIZE_ARCMIN / 2;

  // Project catalog stars onto focal plane
  const stars = useMemo<FocalPlaneStar[]>(() => {
    const raw = getRawStars();
    const result: FocalPlaneStar[] = [];

    for (const [ra, dec, mag, ci] of raw) {
      // Quick angular distance pre-filter (half-degree ~ 30 arcmin)
      const dRa = Math.abs(ra - targetRa);
      const dDec = Math.abs(dec - targetDec);
      if (dRa > 1 && dRa < 359) continue;
      if (dDec > 1) continue;
      if (mag > 10) continue; // only brighter stars visible

      const fp = projectToFocalPlane(ra, dec, targetRa, targetDec, pa);
      if (!fp) continue;
      const [x, y] = fp;

      // Check within padded FOV bounds
      if (Math.abs(x) > halfW || Math.abs(y) > halfH) continue;

      result.push({ x, y, mag, ci });
    }

    return result;
  }, [targetRa, targetDec, pa, halfW, halfH]);

  return (
    <div className="absolute top-11 left-2 z-10 pointer-events-none">
      <div className="hud-panel relative rounded-sm p-2 pointer-events-auto" style={{ width: 220 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="hud-label">Focal Plane</span>
          <span className="text-[8px] font-mono text-roman-text-muted">
            PA {pa.toFixed(1)}°
          </span>
        </div>

        {/* Detector layout SVG */}
        <svg
          viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
          className="w-full bg-black/40 rounded-sm border border-roman-border"
          style={{ aspectRatio: `${vbW} / ${vbH}` }}
        >
          {/* Background grid reference */}
          <line x1={0} y1={vbY} x2={0} y2={vbY + vbH} stroke="rgba(255,255,255,0.04)" strokeWidth={0.15} />
          <line x1={vbX} y1={0} x2={vbX + vbW} y2={0} stroke="rgba(255,255,255,0.04)" strokeWidth={0.15} />

          {/* Detector rectangles */}
          {WFI_DETECTORS.map((det) => (
            <g key={det.id}>
              <rect
                x={det.centerX - halfDet}
                y={-(det.centerY + halfDet)} // SVG y is inverted
                width={DETECTOR_SIZE_ARCMIN}
                height={DETECTOR_SIZE_ARCMIN}
                fill="rgba(6,182,212,0.04)"
                stroke="rgba(6,182,212,0.25)"
                strokeWidth={0.12}
              />
              <text
                x={det.centerX}
                y={-det.centerY}
                textAnchor="middle"
                dominantBaseline="central"
                fill="rgba(6,182,212,0.2)"
                fontSize={1.8}
                fontFamily="'JetBrains Mono', monospace"
              >
                {det.id.replace('SCA', '')}
              </text>
            </g>
          ))}

          {/* Projected stars */}
          {stars.map((star, i) => {
            // Size: brighter = larger. mag 0 → r=0.6, mag 8 → r=0.1
            const r = Math.max(0.08, 0.7 - star.mag * 0.08);
            return (
              <circle
                key={i}
                cx={star.x}
                cy={-star.y} // SVG y is inverted
                r={r}
                fill={ciToColor(star.ci)}
                opacity={Math.max(0.3, 1.0 - star.mag * 0.1)}
              />
            );
          })}

          {/* Boresight crosshair */}
          <line x1={-1} y1={0} x2={1} y2={0} stroke="rgba(6,182,212,0.4)" strokeWidth={0.08} />
          <line x1={0} y1={-1} x2={0} y2={1} stroke="rgba(6,182,212,0.4)" strokeWidth={0.08} />
          <circle cx={0} cy={0} r={0.3} fill="none" stroke="rgba(6,182,212,0.3)" strokeWidth={0.06} />

          {/* N/E compass */}
          <g transform={`translate(${vbX + 2.5}, ${vbY + 2.5})`}>
            {/* North arrow (up in sky, rotated by PA in focal plane) */}
            <line
              x1={0} y1={0}
              x2={-2 * Math.sin(pa * Math.PI / 180)}
              y2={-2 * Math.cos(pa * Math.PI / 180)}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={0.1}
            />
            <text
              x={-2.8 * Math.sin(pa * Math.PI / 180)}
              y={-2.8 * Math.cos(pa * Math.PI / 180)}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.4)"
              fontSize={1.3}
              fontFamily="'JetBrains Mono', monospace"
            >
              N
            </text>
            {/* East arrow */}
            <line
              x1={0} y1={0}
              x2={2 * Math.cos(pa * Math.PI / 180)}
              y2={-2 * Math.sin(pa * Math.PI / 180)}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={0.1}
            />
            <text
              x={2.8 * Math.cos(pa * Math.PI / 180)}
              y={-2.8 * Math.sin(pa * Math.PI / 180)}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.25)"
              fontSize={1.3}
              fontFamily="'JetBrains Mono', monospace"
            >
              E
            </text>
          </g>
        </svg>

        {/* Star count */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-[8px] font-mono text-roman-text-muted">
            {stars.length} sources (V&lt;10)
          </span>
          <span className="text-[8px] font-mono text-roman-text-muted">
            {TOTAL_FOV_ARCMIN.width.toFixed(0)}' x {TOTAL_FOV_ARCMIN.height.toFixed(0)}'
          </span>
        </div>
      </div>
    </div>
  );
}
