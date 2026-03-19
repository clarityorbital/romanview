export interface GaiaSource {
  ra: number;
  dec: number;
  mag: number;
}

export interface AdaptiveResult {
  stars: GaiaSource[];
  magLimit: number;
  isDense: boolean;
}

/** Query Gaia DR3 sources in a cone around a position via VizieR TAP */
export async function gaiaConSearch(
  raDeg: number,
  decDeg: number,
  radiusDeg: number,
  magLimit: number = 18,
  maxResults: number = 2500,
  signal?: AbortSignal
): Promise<GaiaSource[]> {
  const query = `SELECT TOP ${maxResults} RA_ICRS, DE_ICRS, Gmag FROM "I/355/gaiadr3" WHERE 1=CONTAINS(POINT('ICRS', RA_ICRS, DE_ICRS), CIRCLE('ICRS', ${raDeg.toFixed(6)}, ${decDeg.toFixed(6)}, ${radiusDeg.toFixed(4)})) AND Gmag < ${magLimit.toFixed(1)} ORDER BY Gmag ASC`;

  const params = new URLSearchParams({
    REQUEST: 'doQuery',
    LANG: 'ADQL',
    FORMAT: 'json',
    QUERY: query,
  });

  const response = await fetch(
    `https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync?${params.toString()}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error(`VizieR query failed: ${response.statusText}`);
  }

  const data = await response.json();
  const rows = data?.data || [];

  return rows
    .filter((row: unknown[]) => row[0] != null && row[1] != null)
    .map((row: unknown[]) => ({
      ra: Number(row[0]),
      dec: Number(row[1]),
      mag: Number(row[2]) || 20,
    }));
}

/**
 * Adaptive Gaia query with density management.
 *
 * Strategy:
 * - Initial query with Gmag < 18, TOP 2500, ordered by brightness
 * - Dense field (>= 2000 results): trim to 2000, report effective mag limit
 * - Sparse field (< 100 results): re-query with Gmag < 21
 * - Normal field (100-2000): use as-is
 */
export async function adaptiveGaiaQuery(
  ra: number,
  dec: number,
  signal?: AbortSignal,
  radius: number = 0.6
): Promise<AdaptiveResult> {
  const initial = await gaiaConSearch(ra, dec, radius, 18, 2500, signal);

  if (initial.length >= 2000) {
    // Dense field: trim to 2000 brightest, report the faintest star's mag
    const trimmed = initial.slice(0, 2000);
    const magLimit = trimmed[trimmed.length - 1].mag;
    return { stars: trimmed, magLimit, isDense: true };
  }

  if (initial.length < 100) {
    // Sparse field: go deeper
    const deeper = await gaiaConSearch(ra, dec, radius, 21, 2500, signal);
    const magLimit = deeper.length > 0
      ? Math.max(...deeper.map(s => s.mag))
      : 21;
    return {
      stars: deeper.slice(0, 2000),
      magLimit: Math.min(magLimit, 21),
      isDense: false,
    };
  }

  // Normal field: use as-is
  const magLimit = initial.length > 0
    ? Math.max(...initial.map(s => s.mag))
    : 18;
  return { stars: initial, magLimit, isDense: false };
}
