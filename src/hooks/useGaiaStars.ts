import { useState, useEffect, useRef } from 'react';
import { adaptiveGaiaQuery, type GaiaSource } from '../lib/vizier';

export type QueryState = 'idle' | 'loading' | 'loaded' | 'error';

export interface QueryStatus {
  state: QueryState;
  count?: number;
  magLimit?: number;
  isDense?: boolean;
  message?: string;
}

/**
 * React hook for querying Gaia DR3 stars at a sky position.
 *
 * Features:
 * - 300ms debounce to prevent rapid-fire queries
 * - AbortController cancellation for stale requests
 * - Only fires when RA/Dec changes (not on camera pan/zoom or PA changes)
 * - Returns star array and query status with density information
 */
export function useGaiaStars(
  ra: number | undefined,
  dec: number | undefined
): {
  stars: GaiaSource[];
  status: QueryStatus;
} {
  const [stars, setStars] = useState<GaiaSource[]>([]);
  const [status, setStatus] = useState<QueryStatus>({ state: 'idle' });
  const abortRef = useRef<AbortController>();

  useEffect(() => {
    if (ra === undefined || dec === undefined) {
      setStatus({ state: 'idle' });
      setStars([]);
      return;
    }

    // Cancel previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus({ state: 'loading' });

    const timer = setTimeout(async () => {
      try {
        const result = await adaptiveGaiaQuery(ra, dec, controller.signal);
        if (!controller.signal.aborted) {
          setStars(result.stars);
          setStatus({
            state: 'loaded',
            count: result.stars.length,
            magLimit: result.magLimit,
            isDense: result.isDense,
          });
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setStatus({
            state: 'error',
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [ra, dec]);

  return { stars, status };
}
