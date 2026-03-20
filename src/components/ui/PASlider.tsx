import { useMemo, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { FPA_ROTATION_DEG } from '../../lib/siaf';

interface PASliderProps {
  nominalPA: number;
  minPA: number;
  maxPA: number;
  currentPA: number;
  onPAChange: (pa: number) => void;
  observable: boolean;
}

/**
 * Interactive PA slider showing Sun-constrained roll range.
 *
 * Operates in offset space internally ([-15, +15] around nominal) to avoid
 * 0/360 wrap-around issues. Displays both V3PA and APA values.
 */
export function PASlider({
  nominalPA,
  minPA,
  maxPA,
  currentPA,
  onPAChange,
  observable,
}: PASliderProps) {
  // Compute offset range and current offset from nominal
  const offsetMin = minPA - nominalPA; // typically -15
  const offsetMax = maxPA - nominalPA; // typically +15
  const currentOffset = currentPA - nominalPA;

  // APA = V3PA - FPA_ROTATION_DEG (which is -60, so APA = V3PA + 60)
  const apa = ((currentPA - FPA_ROTATION_DEG) % 360 + 360) % 360;

  // Displayed V3PA wrapped to [0, 360)
  const displayV3PA = ((currentPA % 360) + 360) % 360;

  // Progress percentage for the slider fill
  const progress = useMemo(() => {
    const range = offsetMax - offsetMin;
    if (range === 0) return 50;
    return ((currentOffset - offsetMin) / range) * 100;
  }, [currentOffset, offsetMin, offsetMax]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const offset = parseFloat(e.target.value);
      onPAChange(nominalPA + offset);
    },
    [nominalPA, onPAChange],
  );

  const handleReset = useCallback(() => {
    onPAChange(nominalPA);
  }, [nominalPA, onPAChange]);

  if (!observable) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="hud-label">Position Angle</span>
        </div>
        <div className="text-[10px] font-mono text-roman-text-muted py-2 text-center border border-dashed border-roman-border rounded-sm">
          Target not observable at this epoch
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {/* Header with V3PA and APA readouts */}
      <div className="flex items-center justify-between">
        <span className="hud-label">Position Angle</span>
        <button
          onClick={handleReset}
          className="p-0.5 rounded-sm text-roman-text-muted hover:text-roman-accent transition-colors cursor-pointer"
          title="Reset to nominal PA"
          aria-label="Reset to nominal PA"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* PA value readouts */}
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="text-roman-accent tracking-tight">
          V3PA {displayV3PA.toFixed(1)}&deg;
        </span>
        <span className="text-roman-text-muted tracking-tight">
          APA {apa.toFixed(1)}&deg;
        </span>
      </div>

      {/* Slider track */}
      <div className="relative h-6">
        {/* Track background */}
        <div className="absolute top-[11px] left-0 right-0 h-[2px] bg-white/[0.04]" />

        {/* Filled range */}
        <div
          className="absolute top-[11px] h-[2px] bg-roman-accent/30"
          style={{
            left: `${Math.min(progress, 50)}%`,
            width: `${Math.abs(progress - 50)}%`,
          }}
        />

        {/* Nominal center tick */}
        <div
          className="absolute top-[7px] w-[2px] h-[10px] bg-roman-accent/40"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        />

        {/* Min tick */}
        <div
          className="absolute top-[8px] w-px h-[8px] bg-white/[0.08]"
          style={{ left: '0%' }}
        />

        {/* Max tick */}
        <div
          className="absolute top-[8px] w-px h-[8px] bg-white/[0.08]"
          style={{ left: '100%', transform: 'translateX(-1px)' }}
        />

        {/* Current position marker */}
        <div
          className="absolute top-[7px] w-[2px] h-[10px] bg-roman-accent shadow-[0_0_6px_rgba(6,182,212,0.5)]"
          style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
        />

        {/* Invisible range input */}
        <input
          type="range"
          min={offsetMin}
          max={offsetMax}
          value={currentOffset}
          onChange={handleSliderChange}
          step={0.1}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          aria-label={`V3 Position Angle offset from nominal, currently ${displayV3PA.toFixed(1)} degrees`}
        />
      </div>

      {/* Range labels */}
      <div className="flex justify-between items-center text-[8px] font-mono text-roman-text-muted">
        <span>{((minPA % 360 + 360) % 360).toFixed(1)}&deg;</span>
        <span className="text-roman-accent/50">
          nom {((nominalPA % 360 + 360) % 360).toFixed(1)}&deg;
        </span>
        <span>{((maxPA % 360 + 360) % 360).toFixed(1)}&deg;</span>
      </div>

      {/* Disclaimer */}
      <p className="text-[8px] font-mono text-roman-text-muted/60 leading-tight">
        Roll range approximate; verify with APT
      </p>
    </div>
  );
}
