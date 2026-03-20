/**
 * URL hash state encoding/decoding for shareable observation parameters.
 *
 * Encodes observation parameters into a URL hash fragment that can be
 * shared to reproduce the exact same view. Uses URLSearchParams for
 * standards-compliant encoding of special characters.
 */

/** Observation parameters that can be persisted in URL hash */
export interface ObservationParams {
  /** Target right ascension in degrees */
  ra?: number;
  /** Target declination in degrees */
  dec?: number;
  /** Target name (human-readable) */
  name?: string;
  /** V3 position angle in degrees */
  pa?: number;
  /** Observation date (ISO 8601 date string, e.g., "2026-06-15") */
  date?: string;
}

/**
 * Encode observation parameters into a URL hash string.
 *
 * Only defined fields are included. Numeric values are formatted to
 * fixed decimal places (ra/dec: 5, pa: 1) for clean URLs.
 *
 * @param params - Observation parameters to encode
 * @returns Hash string starting with '#' (e.g., "#ra=10.68470&dec=41.26870")
 */
export function encodeToHash(params: ObservationParams): string {
  const searchParams = new URLSearchParams();

  if (params.ra !== undefined) {
    searchParams.set('ra', params.ra.toFixed(5));
  }
  if (params.dec !== undefined) {
    searchParams.set('dec', params.dec.toFixed(5));
  }
  if (params.name !== undefined) {
    searchParams.set('name', params.name);
  }
  if (params.pa !== undefined) {
    searchParams.set('pa', params.pa.toFixed(1));
  }
  if (params.date !== undefined) {
    searchParams.set('date', params.date);
  }

  return '#' + searchParams.toString();
}

/**
 * Decode observation parameters from a URL hash string.
 *
 * Missing parameters are returned as undefined (not NaN or empty string).
 *
 * @param hash - Hash string (with or without leading '#')
 * @returns Decoded observation parameters
 */
export function decodeFromHash(hash: string): ObservationParams {
  const stripped = hash.startsWith('#') ? hash.slice(1) : hash;
  const searchParams = new URLSearchParams(stripped);

  const result: ObservationParams = {};

  const raStr = searchParams.get('ra');
  if (raStr !== null) {
    const ra = parseFloat(raStr);
    if (!isNaN(ra)) {
      result.ra = ra;
    }
  }

  const decStr = searchParams.get('dec');
  if (decStr !== null) {
    const dec = parseFloat(decStr);
    if (!isNaN(dec)) {
      result.dec = dec;
    }
  }

  const name = searchParams.get('name');
  if (name !== null && name !== '') {
    result.name = name;
  }

  const paStr = searchParams.get('pa');
  if (paStr !== null) {
    const pa = parseFloat(paStr);
    if (!isNaN(pa)) {
      result.pa = pa;
    }
  }

  const date = searchParams.get('date');
  if (date !== null && date !== '') {
    result.date = date;
  }

  return result;
}
