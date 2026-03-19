export interface GaiaSource {
  ra: number;
  dec: number;
  mag: number;
}

/** Query Gaia DR3 sources in a cone around a position */
export async function gaiaConSearch(
  raDeg: number,
  decDeg: number,
  radiusDeg: number,
  maxResults = 500
): Promise<GaiaSource[]> {
  const query = `SELECT TOP ${maxResults} ra, dec, phot_g_mean_mag FROM "I/355/gaiadr3" WHERE 1=CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', ${raDeg.toFixed(6)}, ${decDeg.toFixed(6)}, ${radiusDeg.toFixed(4)})) ORDER BY phot_g_mean_mag ASC`;

  const params = new URLSearchParams({
    REQUEST: 'doQuery',
    LANG: 'ADQL',
    FORMAT: 'json',
    QUERY: query,
  });

  const response = await fetch(
    `https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync?${params.toString()}`
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
