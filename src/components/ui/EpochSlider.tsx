import { useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface EpochSliderProps {
  epoch: Date;
  onChange: (date: Date) => void;
}

export function EpochSlider({ epoch, onChange }: EpochSliderProps) {
  const { min, max, value } = useMemo(() => {
    const now = new Date();
    const min = new Date(now);
    min.setFullYear(min.getFullYear() - 1);
    const max = new Date(now);
    max.setFullYear(max.getFullYear() + 1);
    const value = epoch.getTime();
    return { min: min.getTime(), max: max.getTime(), value };
  }, [epoch]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(new Date(parseInt(e.target.value)));
    },
    [onChange]
  );

  const stepDays = useCallback(
    (days: number) => {
      const next = new Date(epoch);
      next.setDate(next.getDate() + days);
      if (next.getTime() >= min && next.getTime() <= max) {
        onChange(next);
      }
    },
    [epoch, min, max, onChange]
  );

  const formatDateShort = (d: Date) =>
    d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const formatDateISO = (d: Date) => d.toISOString().split('T')[0];

  const progress = ((value - min) / (max - min)) * 100;

  // Generate month tick marks
  const ticks = useMemo(() => {
    const t: { pos: number; label: string }[] = [];
    const d = new Date(min);
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    while (d.getTime() < max) {
      const pos = ((d.getTime() - min) / (max - min)) * 100;
      t.push({ pos, label: d.toLocaleDateString('en-US', { month: 'short' }) });
      d.setMonth(d.getMonth() + 1);
    }
    return t;
  }, [min, max]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="hud-label">Epoch</span>
        <span className="text-[11px] font-mono text-roman-accent tracking-tight">
          {formatDateISO(epoch)}
        </span>
      </div>

      {/* Timeline scrubber */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => stepDays(-1)}
          className="p-0.5 rounded-sm text-roman-text-muted hover:text-roman-accent transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 relative h-6">
          {/* Track background */}
          <div className="absolute top-[11px] left-0 right-0 h-[2px] bg-white/[0.04]" />

          {/* Progress fill */}
          <div
            className="absolute top-[11px] left-0 h-[2px] bg-roman-accent/30"
            style={{ width: `${progress}%` }}
          />

          {/* Tick marks */}
          <div className="absolute top-0 left-0 right-0 h-full">
            {ticks.map((tick, i) => (
              <div
                key={i}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: `${tick.pos}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-px h-2 bg-white/[0.08]" />
                <span className="text-[7px] font-mono text-roman-text-muted mt-0.5 select-none">
                  {tick.label}
                </span>
              </div>
            ))}
          </div>

          {/* Epoch marker */}
          <div
            className="absolute top-[7px] w-[2px] h-[10px] bg-roman-accent shadow-[0_0_6px_rgba(6,182,212,0.5)]"
            style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
          />

          {/* Invisible range input */}
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={handleSliderChange}
            step={86400000}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </div>

        <button
          onClick={() => stepDays(1)}
          className="p-0.5 rounded-sm text-roman-text-muted hover:text-roman-accent transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Range labels + today button */}
      <div className="flex justify-between items-center text-[8px] font-mono text-roman-text-muted">
        <span>{formatDateShort(new Date(min))}</span>
        <button
          onClick={() => onChange(new Date())}
          className="px-1.5 py-0.5 text-roman-accent/50 hover:text-roman-accent border border-transparent hover:border-roman-accent/20 rounded-sm transition-all"
        >
          NOW
        </button>
        <span>{formatDateShort(new Date(max))}</span>
      </div>
    </div>
  );
}
