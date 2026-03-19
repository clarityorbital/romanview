import { useMemo, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

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

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const progress = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-roman-text-dim flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          Epoch
        </h2>
        <span className="text-xs font-mono text-roman-accent">
          {formatDate(epoch)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => stepDays(-1)}
          className="p-1 rounded hover:bg-roman-accent/20 text-roman-text-dim hover:text-roman-accent transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 relative">
          <div className="h-1.5 bg-roman-bg/80 rounded-full border border-roman-border overflow-hidden">
            <div
              className="h-full bg-roman-accent/40 rounded-full transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={handleSliderChange}
            step={86400000} // 1 day in ms
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <button
          onClick={() => stepDays(1)}
          className="p-1 rounded hover:bg-roman-accent/20 text-roman-text-dim hover:text-roman-accent transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex justify-between text-[9px] text-roman-text-dim/50 font-mono">
        <span>{formatDate(new Date(min))}</span>
        <button
          onClick={() => onChange(new Date())}
          className="text-roman-accent/60 hover:text-roman-accent transition-colors"
        >
          TODAY
        </button>
        <span>{formatDate(new Date(max))}</span>
      </div>
    </div>
  );
}
