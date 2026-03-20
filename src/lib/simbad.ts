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
  const safe = sanitize(name);
  // Replace letter-digit boundaries (with or without spaces) with % wildcard
  // to handle SIMBAD spacing: "M31"→"M%31", "NGC 4321"→"NGC%4321", matching "M  31", "NGC  4321"
  const pattern = safe.replace(/([A-Za-z])\s*(\d)/, '$1%$2');
  const query = [
    'SELECT TOP 10 main_id, ra, dec',
    'FROM ident JOIN basic ON oidref = oid',
    `WHERE id LIKE '${pattern}%'`,
    'AND ra IS NOT NULL AND dec IS NOT NULL',
  ].join(' ');

  const response = await fetch(
    'https://simbad.cds.unistra.fr/simbad/sim-tap/sync',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        REQUEST: 'doQuery',
        LANG: 'ADQL',
        FORMAT: 'json',
        QUERY: query,
      }),
    }
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

  // If TAP returned nothing, fall back to sesame for exact name resolution
  if (results.length === 0) {
    const exact = await sesameResolve(name.trim());
    if (exact) return [exact];
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
