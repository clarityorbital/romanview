import { useState } from 'react';
import { Settings, ChevronDown, ChevronUp } from 'lucide-react';
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
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-xs font-semibold tracking-wider uppercase text-roman-text-dim"
      >
        <span className="flex items-center gap-1.5">
          <Settings className="w-3 h-3" />
          WFI Configuration
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="space-y-3 pt-1">
          {/* Filter selection */}
          <div>
            <label className="text-[10px] text-roman-text-dim block mb-1">Filter</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-roman-bg/60 border border-roman-border rounded-lg text-sm text-roman-text focus:outline-none focus:border-roman-accent/50 appearance-none cursor-pointer"
            >
              {WFI_FILTERS.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name} — {f.description}
                </option>
              ))}
            </select>
            {selectedFilter && (
              <p className="text-[10px] text-roman-text-dim mt-1 font-mono">
                {selectedFilter.wavelength}
              </p>
            )}
          </div>

          {/* Dither pattern */}
          <div>
            <label className="text-[10px] text-roman-text-dim block mb-1">Dither Pattern</label>
            <select
              value={dither}
              onChange={(e) => setDither(e.target.value)}
              className="w-full px-3 py-1.5 bg-roman-bg/60 border border-roman-border rounded-lg text-sm text-roman-text focus:outline-none focus:border-roman-accent/50 appearance-none cursor-pointer"
            >
              {DITHER_PATTERNS.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name} ({d.points} {d.points === 1 ? 'point' : 'points'})
                </option>
              ))}
            </select>
          </div>

          {/* Exposure time */}
          <div>
            <label className="text-[10px] text-roman-text-dim block mb-1">
              Exposure per dither (seconds)
            </label>
            <input
              type="number"
              value={exposure}
              onChange={(e) => setExposure(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={10000}
              className="w-full px-3 py-1.5 bg-roman-bg/60 border border-roman-border rounded-lg text-sm text-roman-text focus:outline-none focus:border-roman-accent/50"
            />
            <p className="text-[10px] text-roman-text-dim mt-1">
              Total: {totalExposure}s ({(totalExposure / 60).toFixed(1)} min)
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Stat label="FOV" value={`${TOTAL_FOV_DEG.width.toFixed(2)}° × ${TOTAL_FOV_DEG.height.toFixed(2)}°`} />
            <Stat label="Pixel Scale" value={`${PIXEL_SCALE_ARCSEC}"/px`} />
            <Stat label="Detectors" value="18 × H4RG-10" />
            <Stat label="Detector Size" value={`${PIXELS_PER_DETECTOR}²`} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-1.5 bg-roman-bg/40 rounded-md border border-roman-border">
      <div className="text-[9px] text-roman-text-dim uppercase tracking-wider">{label}</div>
      <div className="text-xs font-mono text-roman-text mt-0.5">{value}</div>
    </div>
  );
}
