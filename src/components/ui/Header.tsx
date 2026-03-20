import type { ReactNode } from 'react';

interface HeaderProps {
  showGrid: boolean;
  showConstraints: boolean;
  showGalactic: boolean;
  onToggleGrid: () => void;
  onToggleConstraints: () => void;
  onToggleGalactic: () => void;
  shareButton?: ReactNode;
  exportButton?: ReactNode;
}

export function Header({
  showGrid,
  showConstraints,
  showGalactic,
  onToggleGrid,
  onToggleConstraints,
  onToggleGalactic,
  shareButton,
  exportButton,
}: HeaderProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
      <div className="flex items-center justify-between px-3 py-2">
        {/* Logo + Title */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <div className="w-7 h-7 rounded-sm bg-roman-accent/10 flex items-center justify-center border border-roman-accent/25">
            <span className="text-roman-accent font-bold text-[11px] font-mono">R</span>
          </div>
          <div className="leading-none">
            <h1 className="text-[11px] font-semibold tracking-[0.15em] text-roman-text/90 leading-none">
              ROMANVIEW
            </h1>
            <p className="text-[9px] tracking-[0.2em] text-roman-text-dim mt-0.5">
              OBSERVATION PLANNER
            </p>
          </div>
          <div className="ml-2 h-4 w-px bg-roman-border" />
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-roman-success status-dot-pulse" />
            <span className="text-[9px] font-mono text-roman-text-dim tracking-wide">NOMINAL</span>
          </div>
        </div>

        {/* Toggle Controls + Action Buttons */}
        <div className="flex items-center gap-0.5 pointer-events-auto">
          <ToggleButton active={showGrid} onClick={onToggleGrid} label="GRID" hotkey="G" />
          <ToggleButton active={showConstraints} onClick={onToggleConstraints} label="CONST" hotkey="C" />
          <ToggleButton active={showGalactic} onClick={onToggleGalactic} label="GAL" hotkey="B" />
          {(shareButton || exportButton) && (
            <>
              <div className="mx-1 h-4 w-px bg-roman-border" />
              {shareButton}
              {exportButton}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function ToggleButton({ active, onClick, label, hotkey }: { active: boolean; onClick: () => void; label: string; hotkey: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-[10px] font-mono font-medium rounded-sm border transition-all duration-150 ${
        active
          ? 'bg-roman-accent/12 border-roman-accent/30 text-roman-accent shadow-[0_0_8px_rgba(6,182,212,0.12)]'
          : 'bg-transparent border-roman-border text-roman-text-dim hover:text-roman-text-muted hover:border-roman-border-accent'
      }`}
    >
      <span>{label}</span>
      <span className={`ml-1.5 text-[8px] ${active ? 'text-roman-accent/50' : 'text-roman-text-muted'}`}>{hotkey}</span>
    </button>
  );
}
