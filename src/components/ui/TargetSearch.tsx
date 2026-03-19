import { useState, useCallback, useRef, useEffect } from 'react';
import { sesameResolve, type SimbadResult } from '../../lib/simbad';
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
  const [manualRa, setManualRa] = useState('');
  const [manualDec, setManualDec] = useState('');
  const [manualName, setManualName] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback(async (name: string) => {
    if (!name.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await sesameResolve(name.trim());
      if (result) {
        setResults([result]);
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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => search(query), 500);
    } else {
      setResults([]);
      setError(null);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  const handleAddManual = () => {
    const ra = parseFloat(manualRa);
    const dec = parseFloat(manualDec);
    if (isNaN(ra) || isNaN(dec)) return;
    const name = manualName.trim() || `Custom (${ra.toFixed(2)}, ${dec.toFixed(2)})`;
    onAddTarget(name, ra, dec);
    setManualRa('');
    setManualDec('');
    setManualName('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-roman-text-dim">
          Target Search
        </h2>
        <button
          onClick={() => setManualMode(!manualMode)}
          className="text-[10px] text-roman-accent hover:text-roman-accent/80 transition-colors"
        >
          {manualMode ? 'SIMBAD Search' : 'Manual RA/Dec'}
        </button>
      </div>

      {!manualMode ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-roman-text-dim" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search SIMBAD (e.g. M31, NGC 1234)"
              className="w-full pl-9 pr-3 py-2 bg-roman-bg/60 border border-roman-border rounded-lg text-sm text-roman-text placeholder:text-roman-text-dim/50 focus:outline-none focus:border-roman-accent/50 transition-colors"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-roman-accent animate-spin" />
            )}
          </div>

          {error && <p className="text-xs text-roman-danger/80">{error}</p>}

          {results.length > 0 && (
            <div className="space-y-1">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onAddTarget(r.name, r.ra, r.dec);
                    setQuery('');
                    setResults([]);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-roman-bg/40 border border-roman-border hover:border-roman-accent/40 transition-all group"
                >
                  <div className="text-left">
                    <div className="text-sm text-roman-text">{r.name}</div>
                    <div className="text-[10px] text-roman-text-dim font-mono">
                      RA {r.ra.toFixed(4)}° Dec {r.dec.toFixed(4)}°
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-roman-text-dim group-hover:text-roman-accent transition-colors" />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Target name (optional)"
            className="w-full px-3 py-2 bg-roman-bg/60 border border-roman-border rounded-lg text-sm text-roman-text placeholder:text-roman-text-dim/50 focus:outline-none focus:border-roman-accent/50"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={manualRa}
              onChange={(e) => setManualRa(e.target.value)}
              placeholder="RA (degrees)"
              className="px-3 py-2 bg-roman-bg/60 border border-roman-border rounded-lg text-sm text-roman-text placeholder:text-roman-text-dim/50 focus:outline-none focus:border-roman-accent/50"
            />
            <input
              type="number"
              value={manualDec}
              onChange={(e) => setManualDec(e.target.value)}
              placeholder="Dec (degrees)"
              className="px-3 py-2 bg-roman-bg/60 border border-roman-border rounded-lg text-sm text-roman-text placeholder:text-roman-text-dim/50 focus:outline-none focus:border-roman-accent/50"
            />
          </div>
          <button
            onClick={handleAddManual}
            disabled={!manualRa || !manualDec}
            className="w-full py-2 bg-roman-accent/20 border border-roman-accent/30 rounded-lg text-sm text-roman-accent hover:bg-roman-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Target
          </button>
        </div>
      )}
    </div>
  );
}
