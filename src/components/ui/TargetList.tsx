import { useMemo } from 'react';
import { Crosshair, X } from 'lucide-react';
import { formatRA, formatDec } from '../../lib/coordinates';
import { checkObservability } from '../../lib/constraints';
import type { Target } from '../../hooks/useTargets';

interface TargetListProps {
  targets: Target[];
  selectedTargetId: string | null;
  epoch: Date;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function TargetList({ targets, selectedTargetId, epoch, onSelect, onRemove }: TargetListProps) {
  if (targets.length === 0) {
    return (
      <div className="py-4 text-center">
        <Crosshair className="w-5 h-5 mx-auto mb-1.5 text-roman-text-dim/20" />
        <p className="text-[10px] font-mono text-roman-text-muted">NO TARGETS LOADED</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-1">
        <span className="hud-label">Targets</span>
        <span className="text-[9px] font-mono text-roman-text-muted">{targets.length} loaded</span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[auto_1fr_5.5rem_5.5rem_1.5rem] gap-x-2 px-2 py-0.5 text-[8px] font-mono text-roman-text-muted tracking-wider">
        <span></span>
        <span>ID</span>
        <span className="text-right">RA</span>
        <span className="text-right">DEC</span>
        <span></span>
      </div>

      {/* Target rows */}
      <div className="space-y-px">
        {targets.map((target) => (
          <TargetRow
            key={target.id}
            target={target}
            selected={target.id === selectedTargetId}
            epoch={epoch}
            onSelect={() => onSelect(target.id)}
            onRemove={() => onRemove(target.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TargetRow({
  target,
  selected,
  epoch,
  onSelect,
  onRemove,
}: {
  target: Target;
  selected: boolean;
  epoch: Date;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const obs = useMemo(
    () => checkObservability(target.ra, target.dec, epoch),
    [target.ra, target.dec, epoch]
  );

  const statusColor = obs.observable
    ? obs.nearConstraint
      ? 'bg-roman-warning'
      : 'bg-roman-success'
    : 'bg-roman-danger';

  return (
    <button
      onClick={onSelect}
      className={`w-full grid grid-cols-[auto_1fr_5.5rem_5.5rem_1.5rem] gap-x-2 items-center px-2 py-1.5 rounded-sm border transition-all duration-100 group text-left ${
        selected
          ? 'bg-roman-accent/8 border-roman-accent/25'
          : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-roman-border'
      }`}
    >
      {/* Status indicator */}
      <div className={`w-1.5 h-1.5 rounded-full ${statusColor} shrink-0 ${obs.observable && !obs.nearConstraint ? '' : ''}`} />

      {/* Name */}
      <span className={`text-[11px] truncate ${selected ? 'text-roman-accent' : 'text-roman-text'}`}>
        {target.name}
      </span>

      {/* RA */}
      <span className="text-[10px] font-mono text-roman-text-dim text-right tabular-nums">
        {formatRA(target.ra)}
      </span>

      {/* Dec */}
      <span className="text-[10px] font-mono text-roman-text-dim text-right tabular-nums">
        {formatDec(target.dec)}
      </span>

      {/* Remove */}
      <div
        className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
      >
        <X className="w-3 h-3 text-roman-text-muted hover:text-roman-danger transition-colors" />
      </div>
    </button>
  );
}
