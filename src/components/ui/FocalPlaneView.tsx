import { useMemo } from 'react';
import { WFI_DETECTORS, WFI_BORESIGHT } from '../../lib/roman';
import { positionAngle } from '../../lib/coordinates';
import { skyToFocalPlane, rotateByPA } from '../../lib/wcs';
import { FPA_ROTATION_DEG } from '../../lib/siaf';
import type { GaiaSource } from '../../lib/vizier';
import type { QueryStatus } from '../../hooks/useGaiaStars';
import type { SunPosition } from '../../lib/constraints';

interface FocalPlaneViewProps {
  targetRa: number;
  targetDec: number;
  sunPosition: SunPosition;
  gaiaStars: GaiaSource[];
  gaiaStatus: QueryStatus;
}

interface FocalPlaneStar {
  x: number; // arcmin in focal plane (V2 direction)
  y: number; // arcmin in focal plane (V3 direction, SVG-inverted)
  mag: number;
}

/**
 * Compute SVG viewBox bounds from SIAF detector corners.
 * Returns bounds in arcminutes relative to boresight, with padding.
 */
function computeViewBounds() {
  const allCorners = WFI_DETECTORS.flatMap(d =>
    d.corners_v2v3.map(([v2, v3]) => ({
      x: (v2 - WFI_BORESIGHT.v2) / 60,  // arcmin, V2 direction
      y: -(v3 - WFI_BORESIGHT.v3) / 60,  // arcmin, SVG Y inverted from V3
    }))
  );
  const padFactor = 1.15;
  const minX = Math.min(...allCorners.map(c => c.x));
  const maxX = Math.max(...allCorners.map(c => c.x));
  const minY = Math.min(...allCorners.map(c => c.y));
  const maxY = Math.max(...allCorners.map(c => c.y));

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const halfW = ((maxX - minX) / 2) * padFactor;
  const halfH = ((maxY - minY) / 2) * padFactor;

  return {
    vbX: cx - halfW,
    vbY: cy - halfH,
    vbW: halfW * 2,
    vbH: halfH * 2,
    halfW,
    halfH,
  };
}

const VIEW_BOUNDS = computeViewBounds();

export function FocalPlaneView({ targetRa, targetDec, sunPosition, gaiaStars, gaiaStatus }: FocalPlaneViewProps) {
  const v3pa = useMemo(
    () => positionAngle(targetRa, targetDec, sunPosition.ra, sunPosition.dec),
    [targetRa, targetDec, sunPosition.ra, sunPosition.dec]
  );

  // Aperture PA = V3PA - V3IdlYAngle = V3PA - (-60) = V3PA + 60
  const apa = v3pa - FPA_ROTATION_DEG; // V3PA + 60

  const { vbX, vbY, vbW, vbH, halfW, halfH } = VIEW_BOUNDS;

  // Detector polygons in V2V3 space (static in instrument frame)
  const detectorPolygons = useMemo(() => {
    return WFI_DETECTORS.map(det => {
      // Corner positions relative to boresight, in arcminutes
      const corners = det.corners_v2v3.map(([v2, v3]) => ({
        x: (v2 - WFI_BORESIGHT.v2) / 60,
        y: -(v3 - WFI_BORESIGHT.v3) / 60, // SVG Y is inverted from V3
      }));

      // Detector center relative to boresight
      const cx = (det.v2Ref - WFI_BORESIGHT.v2) / 60;
      const cy = -(det.v3Ref - WFI_BORESIGHT.v3) / 60;

      // Build SVG polygon points string
      const pointsStr = corners.map(c => `${c.x},${c.y}`).join(' ');

      return { id: det.id, corners, cx, cy, pointsStr };
    });
  }, []);

  // Project Gaia stars onto focal plane using wcs.ts
  const stars = useMemo<FocalPlaneStar[]>(() => {
    const result: FocalPlaneStar[] = [];

    for (const star of gaiaStars) {
      const fp = skyToFocalPlane(star.ra, star.dec, targetRa, targetDec, v3pa);
      if (!fp) continue;

      // skyToFocalPlane returns {x, y} in arcminutes where:
      //   x = xi direction (= -V2 direction), y = eta direction (= V3 direction)
      // To match detector V2V3 coordinates: starX = -fp.x (flip to V2), starY = -fp.y (SVG invert V3)
      const starX = -fp.x;
      const starY = -fp.y;

      // Check within padded FOV bounds
      if (Math.abs(starX) > halfW || Math.abs(starY) > halfH) continue;

      result.push({ x: starX, y: starY, mag: star.mag });
    }

    return result;
  }, [gaiaStars, targetRa, targetDec, v3pa, halfW, halfH]);

  // N/E compass: rotate sky North/East vectors into focal plane frame
  // In the focal plane (V2V3 frame), sky North is rotated by -V3PA from the +eta direction.
  // Using rotateByPA with -V3PA: North in sky = (xi=0, eta=1) -> focal plane
  const northFP = rotateByPA(0, 1, -v3pa);
  const eastFP = rotateByPA(1, 0, -v3pa);
  // Convert to SVG coords: x maps to V2 (flip xi sign), y maps to -V3 (flip eta sign)
  const compassLen = 2;
  const labelDist = 2.8;
  const northX = -northFP.xi * compassLen;
  const northY = -northFP.eta * compassLen;
  const eastX = -eastFP.xi * compassLen;
  const eastY = -eastFP.eta * compassLen;

  return (
    <div className="absolute top-11 left-2 z-10 pointer-events-none">
      <div className="hud-panel relative rounded-sm p-2 pointer-events-auto" style={{ width: 220 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="hud-label">Focal Plane</span>
          <span className="text-[8px] font-mono text-roman-text-muted">
            PA {apa.toFixed(1)}&deg;
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

          {/* Detector polygons from SIAF V2V3 corners */}
          {detectorPolygons.map((det) => (
            <g key={det.id}>
              <polygon
                points={det.pointsStr}
                fill="rgba(6,182,212,0.04)"
                stroke="rgba(6,182,212,0.25)"
                strokeWidth={0.12}
              />
              <text
                x={det.cx}
                y={det.cy}
                textAnchor="middle"
                dominantBaseline="central"
                fill="rgba(6,182,212,0.2)"
                fontSize={1.8}
                fontFamily="'JetBrains Mono', monospace"
              >
                {det.id.replace('WFI', '')}
              </text>
            </g>
          ))}

          {/* Projected Gaia stars */}
          {stars.map((star, i) => {
            // Size: brighter = larger. Gaia mags range ~8-21
            const r = Math.max(0.08, 0.5 - (star.mag - 8) * 0.04);
            return (
              <circle
                key={i}
                cx={star.x}
                cy={star.y}
                r={r}
                fill="#88bbff"
                opacity={Math.max(0.2, 1.0 - (star.mag - 8) * 0.07)}
              />
            );
          })}

          {/* Boresight crosshair */}
          <line x1={-1} y1={0} x2={1} y2={0} stroke="rgba(6,182,212,0.4)" strokeWidth={0.08} />
          <line x1={0} y1={-1} x2={0} y2={1} stroke="rgba(6,182,212,0.4)" strokeWidth={0.08} />
          <circle cx={0} cy={0} r={0.3} fill="none" stroke="rgba(6,182,212,0.3)" strokeWidth={0.06} />

          {/* N/E compass */}
          <g transform={`translate(${vbX + 2.5}, ${vbY + 2.5})`}>
            {/* North arrow */}
            <line
              x1={0} y1={0}
              x2={northX}
              y2={northY}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={0.1}
            />
            <text
              x={northX * (labelDist / compassLen)}
              y={northY * (labelDist / compassLen)}
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
              x2={eastX}
              y2={eastY}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={0.1}
            />
            <text
              x={eastX * (labelDist / compassLen)}
              y={eastY * (labelDist / compassLen)}
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

        {/* Star count / density indicator and FOV info */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-[8px] font-mono text-roman-text-muted">
            {gaiaStatus.state === 'loading' && (
              <span className="animate-pulse">Querying...</span>
            )}
            {gaiaStatus.state === 'loaded' && (
              <>
                {gaiaStatus.count} sources (G &lt; {gaiaStatus.magLimit?.toFixed(1)})
                {gaiaStatus.isDense && (
                  <span className="text-roman-warning ml-1">[DENSE]</span>
                )}
              </>
            )}
            {gaiaStatus.state === 'error' && (
              <span className="text-roman-danger">Query failed</span>
            )}
            {gaiaStatus.state === 'idle' && 'No target selected'}
          </span>
          <span className="text-[8px] font-mono text-roman-text-muted">
            {(vbW / 1.15).toFixed(0)}&apos; x {(vbH / 1.15).toFixed(0)}&apos;
          </span>
        </div>
      </div>
    </div>
  );
}
