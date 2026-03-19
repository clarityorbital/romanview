interface HeaderProps {
  showGrid: boolean;
  showConstraints: boolean;
  showGalactic: boolean;
  onToggleGrid: () => void;
  onToggleConstraints: () => void;
  onToggleGalactic: () => void;
}

export function Header({
  showGrid,
  showConstraints,
  showGalactic,
  onToggleGrid,
  onToggleConstraints,
  onToggleGalactic,
}: HeaderProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-3 pointer-events-none">
      <div className="flex items-center gap-3 pointer-events-auto">
        {/* Roman logo mark */}
        <div className="w-8 h-8 rounded-lg bg-roman-accent/20 flex items-center justify-center border border-roman-accent/30">
          <span className="text-roman-accent font-bold text-sm">R</span>
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-wide text-roman-text leading-none">
            ROMAN SPACE TELESCOPE
          </h1>
          <p className="text-[10px] tracking-[0.2em] text-roman-text-dim uppercase">
            Observation Planner
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 pointer-events-auto">
        <ToggleButton active={showGrid} onClick={onToggleGrid} label="Grid" />
        <ToggleButton active={showConstraints} onClick={onToggleConstraints} label="Constraints" />
        <ToggleButton active={showGalactic} onClick={onToggleGalactic} label="Galactic" />
      </div>
    </header>
  );
}

function ToggleButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-[11px] font-medium rounded-md border transition-all duration-200 ${
        active
          ? 'bg-roman-accent/20 border-roman-accent/40 text-roman-accent'
          : 'bg-roman-surface border-roman-border text-roman-text-dim hover:text-roman-text hover:border-roman-accent/30'
      } backdrop-blur-md`}
    >
      {label}
    </button>
  );
}
