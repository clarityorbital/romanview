import { useState, useCallback, useRef, useEffect } from 'react';
import { resolveName, type SimbadResult } from '../../lib/simbad';
import { parseCoords } from '../../lib/parseCoords';
import { Search, Plus, Loader2 } from 'lucide-react';

interface TargetSearchProps {
  onAddTarget: (name: string, ra: number, dec: number) => void;
}

export function TargetSearch({ onAddTarget }: TargetSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SimbadResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualCoords, setManualCoords] = useState('');
  const [manualName, setManualName] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (name: string) => {
    if (!name.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const matches = await resolveName(name.trim());
      if (matches.length > 0) {
        setResults(matches);
      } else {
        setResults([]);
        setError('No results found');
      }
    } catch {
      setError('Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search -- trigger after 3+ characters
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length >= 3) {
      debounceRef.current = setTimeout(() => search(query), 500);
    } else {
      setResults([]);
      setError(null);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // Click-outside dismiss
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setResults([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard handler for input
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setResults([]);
      setError(null);
    } else if (e.key === 'Enter' && results.length === 1) {
      const r = results[0];
      onAddTarget(r.name, r.ra, r.dec);
      setQuery('');
      setResults([]);
    }
  }, [results, onAddTarget]);

  const handleAddManual = () => {
    const parsed = parseCoords(manualCoords);
    if (!parsed) {
      setError('Invalid coordinates');
      return;
    }
    setError(null);
    const name = manualName.trim() || `Custom (${parsed.ra.toFixed(2)}, ${parsed.dec.toFixed(2)})`;
    onAddTarget(name, parsed.ra, parsed.dec);
    setManualCoords('');
    setManualName('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="hud-label">Target Search</span>
        <button
          onClick={() => setManualMode(!manualMode)}
          className="text-[9px] font-mono tracking-wider text-roman-accent/60 hover:text-roman-accent transition-colors cursor-pointer"
        >
          {manualMode ? '[SIMBAD]' : '[RA/DEC]'}
        </button>
      </div>

      {!manualMode ? (
        <div ref={containerRef} className="relative">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-roman-text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="SIMBAD lookup — M31, NGC 1234..."
              className="hud-input pl-8 font-mono text-[11px]"
              aria-label="Search SIMBAD targets"
              autoComplete="off"
            />
            {loading && (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-roman-accent animate-spin" />
            )}
          </div>

          {error && <p className="text-[10px] font-mono text-roman-danger/70 mt-1">{error}</p>}

          {results.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-black/90 border border-roman-border rounded-sm backdrop-blur-sm">
              <div className="px-2.5 py-1 border-b border-roman-border/50">
                <span className="text-[9px] font-mono text-roman-text-muted tracking-wider">
                  {results.length} RESULT{results.length !== 1 ? 'S' : ''}
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {results.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onAddTarget(r.name, r.ra, r.dec);
                      setQuery('');
                      setResults([]);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-roman-accent/10 transition-colors duration-150 group cursor-pointer"
                  >
                    <div className="text-left min-w-0">
                      <div className="text-[11px] text-roman-text font-medium truncate">{r.name}</div>
                      <div className="text-[10px] text-roman-text-dim font-mono mt-0.5">
                        {r.ra.toFixed(5)}  {r.dec >= 0 ? '+' : ''}{r.dec.toFixed(5)}
                      </div>
                    </div>
                    <Plus className="w-3.5 h-3.5 flex-shrink-0 ml-2 text-roman-text-muted group-hover:text-roman-accent transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <input
            type="text"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Designation (optional)"
            className="hud-input font-mono text-[11px]"
          />
          <div>
            <label className="text-[8px] font-mono text-roman-text-muted tracking-wider mb-0.5 block">COORDS</label>
            <input
              type="text"
              value={manualCoords}
              onChange={(e) => { setManualCoords(e.target.value); setError(null); }}
              placeholder="00h42m44s +41d16m09s or 10.685 +41.269"
              className="hud-input font-mono text-[11px]"
            />
          </div>
          {error && <p className="text-[10px] font-mono text-roman-danger/70">{error}</p>}
          <button
            onClick={handleAddManual}
            disabled={!manualCoords.trim()}
            className="w-full py-1.5 bg-roman-accent/10 border border-roman-accent/25 rounded-sm text-[10px] font-mono tracking-wider text-roman-accent hover:bg-roman-accent/20 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            + ADD TARGET
          </button>
        </div>
      )}
    </div>
  );
}
