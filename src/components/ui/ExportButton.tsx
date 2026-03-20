import { Download } from 'lucide-react';
import { downloadDS9Regions } from '../../lib/ds9Export';

interface ExportButtonProps {
  targetRa: number;
  targetDec: number;
  v3pa: number;
  targetName?: string;
  disabled?: boolean;
}

/**
 * Download DS9 region file button for the current WFI footprint.
 */
export function ExportButton({ targetRa, targetDec, v3pa, targetName, disabled }: ExportButtonProps) {
  const handleExport = () => {
    if (disabled) return;
    downloadDS9Regions(targetRa, targetDec, v3pa, targetName);
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      className={`px-2.5 py-1 text-[10px] font-mono font-medium rounded-sm border transition-all duration-150 flex items-center gap-1.5 ${
        disabled
          ? 'border-roman-border text-roman-text-muted/40 cursor-not-allowed'
          : 'cursor-pointer bg-transparent border-roman-border text-roman-text-dim hover:text-roman-text-muted hover:border-roman-border-accent'
      }`}
      title="Export DS9 region file"
      aria-label="Download DS9 region file for current footprint"
    >
      <Download className="w-3 h-3" />
      <span>DS9</span>
    </button>
  );
}
