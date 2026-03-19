import { formatRA, formatDec } from '../../lib/coordinates';
import type { SunPosition } from '../../lib/constraints';

interface CoordinateDisplayProps {
  sunPosition: SunPosition;
  epoch: Date;
  selectedRa?: number;
  selectedDec?: number;
}

export function CoordinateDisplay({ sunPosition, epoch, selectedRa, selectedDec }: CoordinateDisplayProps) {
  return (
    <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
      <div className="px-3 py-2 rounded-lg bg-roman-surface/80 backdrop-blur-md border border-roman-border">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[10px] font-mono">
          <div>
            <span className="text-roman-text-dim">Sun RA:</span>{' '}
            <span className="text-roman-warning">{formatRA(sunPosition.ra)}</span>
          </div>
          <div>
            <span className="text-roman-text-dim">Sun Dec:</span>{' '}
            <span className="text-roman-warning">{formatDec(sunPosition.dec)}</span>
          </div>
          {selectedRa !== undefined && selectedDec !== undefined && (
            <>
              <div>
                <span className="text-roman-text-dim">Target RA:</span>{' '}
                <span className="text-roman-accent">{formatRA(selectedRa)}</span>
              </div>
              <div>
                <span className="text-roman-text-dim">Target Dec:</span>{' '}
                <span className="text-roman-accent">{formatDec(selectedDec)}</span>
              </div>
            </>
          )}
          <div className="col-span-2">
            <span className="text-roman-text-dim">Epoch:</span>{' '}
            <span className="text-roman-text">
              {epoch.toISOString().split('T')[0]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
