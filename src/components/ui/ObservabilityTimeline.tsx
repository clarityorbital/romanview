import { useMemo, useState } from 'react';
import { computeObservabilityWindows } from '../../lib/constraints';
import type { Target } from '../../hooks/useTargets';

interface ObservabilityTimelineProps {
  targets: Target[];
  epoch: Date;
  onEpochChange: (date: Date) => void;
  onSelectTarget: (id: string) => void;
}

export function ObservabilityTimeline({
  targets,
  epoch,
  onEpochChange,
  onSelectTarget,
}: ObservabilityTimelineProps) {
  const [hoveredInfo, setHoveredInfo] = useState<{ name: string; date: string; status: string } | null>(null);

  const startDate = useMemo(() => {
    const d = new Date(epoch);
    d.setMonth(d.getMonth() - 6);
    return d;
  }, [epoch]);

  const endDate = useMemo(() => {
    const d = new Date(epoch);
    d.setMonth(d.getMonth() + 6);
    return d;
  }, [epoch]);

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);
  const epochDay = Math.floor((epoch.getTime() - startDate.getTime()) / 86400000);

  const windows = useMemo(() => {
    return targets.map((target) => ({
      target,
      windows: computeObservabilityWindows(target.ra, target.dec, startDate, endDate, 2),
    }));
  }, [targets, startDate, endDate]);

  if (targets.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="hud-label">Observability</span>
        {hoveredInfo ? (
          <span className="text-[9px] font-mono text-roman-text-dim">
            {hoveredInfo.name} / {hoveredInfo.date} / <span className={
              hoveredInfo.status === 'observable' ? 'text-roman-success' :
              hoveredInfo.status === 'near-constraint' ? 'text-roman-warning' : 'text-roman-danger'
            }>{hoveredInfo.status}</span>
          </span>
        ) : (
          <span className="text-[9px] font-mono text-roman-text-muted">
            {startDate.toISOString().split('T')[0]} — {endDate.toISOString().split('T')[0]}
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        {windows.map(({ target, windows: wins }) => (
          <div key={target.id} className="flex items-center gap-2">
            <button
              onClick={() => onSelectTarget(target.id)}
              className="w-16 text-[9px] font-mono text-roman-text-dim truncate text-left hover:text-roman-accent transition-colors shrink-0"
            >
              {target.name}
            </button>
            <div className="flex-1 h-2.5 bg-black/30 rounded-sm border border-roman-border overflow-hidden relative cursor-pointer">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${totalDays} 1`}>
                {wins.map((w, i) => {
                  const day = Math.floor((w.date.getTime() - startDate.getTime()) / 86400000);
                  const color =
                    w.status === 'observable'
                      ? '#10b981'
                      : w.status === 'near-constraint'
                      ? '#f59e0b'
                      : '#ef4444';
                  return (
                    <rect
                      key={i}
                      x={day}
                      y={0}
                      width={2.5}
                      height={1}
                      fill={color}
                      opacity={0.8}
                      onMouseEnter={() =>
                        setHoveredInfo({
                          name: target.name,
                          date: w.date.toLocaleDateString(),
                          status: w.status,
                        })
                      }
                      onMouseLeave={() => setHoveredInfo(null)}
                      onClick={() => onEpochChange(w.date)}
                    />
                  );
                })}
                {/* Current epoch marker */}
                <rect x={epochDay - 0.3} y={0} width={0.6} height={1} fill="#06b6d4" opacity={1} />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[8px] font-mono text-roman-text-muted">
        <span className="flex items-center gap-1">
          <div className="w-2 h-1.5 rounded-sm bg-roman-success" /> OBS
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-1.5 rounded-sm bg-roman-warning" /> NEAR
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-1.5 rounded-sm bg-roman-danger" /> EXCL
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-0.5 bg-roman-accent" /> EPOCH
        </span>
      </div>
    </div>
  );
}
