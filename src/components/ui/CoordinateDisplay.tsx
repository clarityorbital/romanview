import { useMemo } from 'react';
import { formatRA, formatDec, formatRaDeg, formatDecDeg, positionAngle } from '../../lib/coordinates';
import type { SunPosition } from '../../lib/constraints';

interface CoordinateDisplayProps {
  sunPosition: SunPosition;
  epoch: Date;
  selectedRa?: number;
  selectedDec?: number;
}

export function CoordinateDisplay({ sunPosition, epoch, selectedRa, selectedDec }: CoordinateDisplayProps) {
  const pa = useMemo(() => {
    if (selectedRa === undefined || selectedDec === undefined) return null;
    return positionAngle(selectedRa, selectedDec, sunPosition.ra, sunPosition.dec);
  }, [selectedRa, selectedDec, sunPosition.ra, sunPosition.dec]);

  return (
    <div className="absolute bottom-16 left-2 z-10 pointer-events-none">
      <div className="hud-panel relative rounded-sm px-3 py-2">
        <div className="space-y-1.5">
          {/* Sun */}
          <div>
            <div className="text-[7px] font-mono text-roman-text-muted tracking-[0.15em] mb-0.5">SUN POSITION</div>
            <div className="grid grid-cols-2 gap-x-4 text-[10px] font-mono">
              <div>
                <span className="text-roman-text-muted mr-1">RA</span>
                <span className="text-roman-warning">{formatRA(sunPosition.ra)}</span>
              </div>
              <div>
                <span className="text-roman-text-muted mr-1">DEC</span>
                <span className="text-roman-warning">{formatDec(sunPosition.dec)}</span>
              </div>
            </div>
          </div>

          {/* Target */}
          {selectedRa !== undefined && selectedDec !== undefined && (
            <div>
              <div className="text-[7px] font-mono text-roman-text-muted tracking-[0.15em] mb-0.5">TARGET</div>
              <div className="grid grid-cols-2 gap-x-4 text-[10px] font-mono">
                <div>
                  <span className="text-roman-text-muted mr-1">RA</span>
                  <span className="text-roman-accent">{formatRA(selectedRa)}</span>
                </div>
                <div>
                  <span className="text-roman-text-muted mr-1">DEC</span>
                  <span className="text-roman-accent">{formatDec(selectedDec)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 text-[9px] font-mono mt-0.5">
                <div>
                  <span className="text-roman-text-dim">RA {formatRaDeg(selectedRa)}deg</span>
                </div>
                <div>
                  <span className="text-roman-text-dim">DEC {formatDecDeg(selectedDec)}deg</span>
                </div>
              </div>
            </div>
          )}

          {/* Position Angle */}
          {pa !== null && (
            <div>
              <div className="text-[7px] font-mono text-roman-text-muted tracking-[0.15em] mb-0.5">ORIENTATION</div>
              <div className="text-[10px] font-mono">
                <span className="text-roman-text-muted mr-1">PA</span>
                <span className="text-roman-accent">{pa.toFixed(1)}°</span>
                <span className="text-roman-text-muted ml-2 text-[9px]">V3 → Sun</span>
              </div>
            </div>
          )}

          {/* Epoch */}
          <div className="text-[9px] font-mono text-roman-text-muted pt-0.5 border-t border-roman-border">
            <span className="tracking-[0.1em]">EPOCH</span>{' '}
            <span className="text-roman-text">{epoch.toISOString().split('T')[0]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
