export interface SimbadResult {
  name: string;
  ra: number;  // degrees
  dec: number; // degrees
}

/** Resolve a target name via SIMBAD TAP service.
 *  Uses a JOIN on the ident table for broader name matching.
 *  Returns up to 10 matching targets with coordinates.
 */
export async function resolveName(name: string): Promise<SimbadResult[]> {
  const safe = sanitize(name).toUpperCase();
  // Use ident table join for comprehensive name matching (main_id, aliases, catalog IDs)
  const query = [
    'SELECT TOP 10 b.main_id, b.ra, b.dec',
    'FROM ident AS i JOIN basic AS b ON i.oidref = b.oid',
    `WHERE UPPER(i.id) LIKE '%${safe}%'`,
    'AND b.ra IS NOT NULL AND b.dec IS NOT NULL',
    'ORDER BY b.main_id',
  ].join(' ');

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

  // Deduplicate by main_id (multiple ident rows can map to same object)
  const seen = new Set<string>();
  const results: SimbadResult[] = [];
  for (const row of rows as unknown[][]) {
    if (row[1] == null || row[2] == null) continue;
    const id = String(row[0]).trim();
    if (seen.has(id)) continue;
    seen.add(id);
    results.push({ name: id, ra: Number(row[1]), dec: Number(row[2]) });
  }
  return results;
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
