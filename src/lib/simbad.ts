export interface SimbadResult {
  name: string;
  ra: number;  // degrees
  dec: number; // degrees
}

/** Resolve a target name via SIMBAD TAP service */
export async function resolveName(name: string): Promise<SimbadResult[]> {
  const query = `SELECT TOP 10 main_id, ra, dec FROM basic WHERE main_id LIKE '%${sanitize(name)}%' OR ident.id LIKE '%${sanitize(name)}%' ORDER BY main_id`;

  const params = new URLSearchParams({
    REQUEST: 'doQuery',
    LANG: 'ADQL',
    FORMAT: 'json',
    QUERY: query,
  });

  const response = await fetch(
    `https://simbad.cds.unistra.fr/simbad/sim-tap/sync?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`SIMBAD query failed: ${response.statusText}`);
  }

  const data = await response.json();
  const rows = data?.data || [];

  return rows
    .filter((row: unknown[]) => row[1] != null && row[2] != null)
    .map((row: unknown[]) => ({
      name: String(row[0]).trim(),
      ra: Number(row[1]),
      dec: Number(row[2]),
    }));
}

/** Simple SIMBAD sesame name resolver - more reliable for exact names */
export async function sesameResolve(name: string): Promise<SimbadResult | null> {
  const url = `https://cdsweb.u-strasbg.fr/cgi-bin/nph-sesame/-ox/SNV?${encodeURIComponent(name)}`;
  try {
    const response = await fetch(url);
    const text = await response.text();

    // Parse XML response
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');
    const jradeg = doc.querySelector('jradeg');
    const jdedeg = doc.querySelector('jdedeg');
    const oname = doc.querySelector('oname');

    if (jradeg && jdedeg) {
      return {
        name: oname?.textContent?.trim() || name,
        ra: parseFloat(jradeg.textContent || '0'),
        dec: parseFloat(jdedeg.textContent || '0'),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function sanitize(s: string): string {
  return s.replace(/[';\\]/g, '');
}
