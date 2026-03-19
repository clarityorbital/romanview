import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { WFI_FILTERS, DITHER_PATTERNS, TOTAL_FOV_DEG, PIXEL_SCALE_ARCSEC, PIXELS_PER_DETECTOR } from '../../lib/roman';

export function InstrumentPanel() {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState('F146');
  const [dither, setDither] = useState('None');
  const [exposure, setExposure] = useState(300);

  const selectedFilter = WFI_FILTERS.find((f) => f.name === filter);
  const selectedDither = DITHER_PATTERNS.find((d) => d.name === dither);
  const totalExposure = exposure * (selectedDither?.points || 1);

  return (
    <div className="space-y-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 hud-label hover:text-roman-text-dim transition-colors"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>WFI Configuration</span>
      </button>

      {expanded && (
        <div className="space-y-2.5 pl-1">
          {/* Filter */}
          <div>
            <label className="text-[8px] font-mono text-roman-text-muted tracking-wider block mb-1">FILTER</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="hud-select font-mono text-[11px]"
            >
              {WFI_FILTERS.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name} — {f.description}
                </option>
              ))}
            </select>
            {selectedFilter && (
              <p className="text-[9px] text-roman-text-muted font-mono mt-0.5">{selectedFilter.wavelength}</p>
            )}
          </div>

          {/* Dither */}
          <div>
            <label className="text-[8px] font-mono text-roman-text-muted tracking-wider block mb-1">DITHER</label>
            <select
              value={dither}
              onChange={(e) => setDither(e.target.value)}
              className="hud-select font-mono text-[11px]"
            >
              {DITHER_PATTERNS.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name} ({d.points} {d.points === 1 ? 'pt' : 'pts'})
                </option>
              ))}
            </select>
          </div>

          {/* Exposure */}
          <div>
            <label className="text-[8px] font-mono text-roman-text-muted tracking-wider block mb-1">EXPOSURE / DITHER (s)</label>
            <input
              type="number"
              value={exposure}
              onChange={(e) => setExposure(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={10000}
              className="hud-input font-mono text-[11px] w-24"
            />
            <p className="text-[9px] text-roman-text-muted font-mono mt-0.5">
              Total: {totalExposure}s = {(totalExposure / 60).toFixed(1)} min
            </p>
          </div>

          {/* Instrument stats grid */}
          <div className="grid grid-cols-2 gap-px bg-roman-border rounded-sm overflow-hidden">
            <Stat label="FOV" value={`${TOTAL_FOV_DEG.width.toFixed(2)}° x ${TOTAL_FOV_DEG.height.toFixed(2)}°`} />
            <Stat label="SCALE" value={`${PIXEL_SCALE_ARCSEC}"/px`} />
            <Stat label="ARRAY" value="18 x H4RG-10" />
            <Stat label="PIXELS" value={`${PIXELS_PER_DETECTOR}²/det`} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-1.5 bg-black/30">
      <div className="text-[7px] font-mono text-roman-text-muted tracking-[0.15em]">{label}</div>
      <div className="text-[10px] font-mono text-roman-text mt-0.5">{value}</div>
    </div>
  );
}
