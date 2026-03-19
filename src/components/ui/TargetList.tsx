import { useMemo } from 'react';
import { Crosshair, Trash2, Eye } from 'lucide-react';
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
      <div className="py-8 text-center">
        <Eye className="w-8 h-8 mx-auto mb-2 text-roman-text-dim/30" />
        <p className="text-xs text-roman-text-dim/50">No targets added</p>
        <p className="text-[10px] text-roman-text-dim/30 mt-1">Search SIMBAD or enter coordinates</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <h2 className="text-xs font-semibold tracking-wider uppercase text-roman-text-dim mb-2">
        Targets ({targets.length})
      </h2>
      {targets.map((target) => (
        <TargetItem
          key={target.id}
          target={target}
          selected={target.id === selectedTargetId}
          epoch={epoch}
          onSelect={() => onSelect(target.id)}
          onRemove={() => onRemove(target.id)}
        />
      ))}
    </div>
  );
}

function TargetItem({
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

  const statusText = obs.observable
    ? obs.nearConstraint
      ? 'Near constraint'
      : 'Observable'
    : 'Excluded';

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-200 group ${
        selected
          ? 'bg-roman-accent/10 border-roman-accent/40'
          : 'bg-roman-bg/40 border-roman-border hover:border-roman-accent/20'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${statusColor} shrink-0`} />
            <span className="text-sm font-medium text-roman-text truncate">
              {target.name}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[10px] font-mono text-roman-text-dim">
            <span>{formatRA(target.ra)}</span>
            <span>{formatDec(target.dec)}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px]">
            <span className={`${obs.observable ? (obs.nearConstraint ? 'text-roman-warning' : 'text-roman-success') : 'text-roman-danger'}`}>
              {statusText}
            </span>
            <span className="text-roman-text-dim">
              Sun: {obs.sunSeparation.toFixed(1)}°
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <div
            className="p-1 rounded hover:bg-roman-accent/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
          >
            <Crosshair className="w-3.5 h-3.5 text-roman-accent" />
          </div>
          <div
            className="p-1 rounded hover:bg-roman-danger/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
          >
            <Trash2 className="w-3.5 h-3.5 text-roman-danger" />
          </div>
        </div>
      </div>
    </button>
  );
}
