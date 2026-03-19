/**
 * Astronomical coordinate parser.
 * Converts HMS/DMS and decimal degree strings to decimal degrees.
 */

export interface ParsedCoords {
  ra: number;   // degrees [0, 360)
  dec: number;  // degrees [-90, 90]
}

/**
 * Parse a coordinate string into decimal degrees.
 * Supports:
 *   "10.6847 +41.2687"           (decimal degrees)
 *   "10.6847, 41.2687"           (comma-separated decimal)
 *   "00h42m44.3s +41d16m09s"     (HMS/DMS with letters)
 *   "00:42:44.3 +41:16:09"       (HMS/DMS with colons)
 *
 * Returns null for any parse failure or out-of-range values.
 */
export function parseCoords(input: string): ParsedCoords | null {
  const cleaned = input.trim();
  if (!cleaned) return null;

  const parts = splitRaDec(cleaned);
  if (!parts) return null;

  const ra = parseRA(parts.ra);
  const dec = parseDec(parts.dec);

  if (ra === null || dec === null) return null;
  if (ra < 0 || ra >= 360) return null;
  if (dec < -90 || dec > 90) return null;

  return { ra, dec };
}

/**
 * Split an input string into RA and Dec components.
 * Handles comma separation and whitespace-with-sign separation.
 */
function splitRaDec(input: string): { ra: string; dec: string } | null {
  // Comma-separated: "10.6847, 41.2687"
  if (input.includes(',')) {
    const parts = input.split(',').map(s => s.trim());
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    return { ra: parts[0], dec: parts[1] };
  }

  // HMS/DMS with letter notation: split at the boundary between RA (ends with 's')
  // and Dec (starts with sign or digit followed by 'd')
  // e.g., "00h42m44.3s +41d16m09s"
  const hmsMatch = input.match(
    /^([\d.]+h[\s]*[\d.]+m[\s]*[\d.]+s?)\s+([+-]?[\d.]+d[\s]*[\d.]+m[\s]*[\d.]+s?)$/i
  );
  if (hmsMatch) {
    return { ra: hmsMatch[1].trim(), dec: hmsMatch[2].trim() };
  }

  // Colon notation: "00:42:44.3 +41:16:09"
  // Split at whitespace before a sign or digit that starts the Dec part
  const colonMatch = input.match(
    /^([\d.:]+)\s+([+-]?[\d.:]+)$/
  );
  if (colonMatch) {
    return { ra: colonMatch[1].trim(), dec: colonMatch[2].trim() };
  }

  // Plain decimal: "10.6847 +41.2687"
  const decimalMatch = input.match(
    /^([\d.]+)\s+([+-]?[\d.]+)$/
  );
  if (decimalMatch) {
    return { ra: decimalMatch[1].trim(), dec: decimalMatch[2].trim() };
  }

  return null;
}

/**
 * Parse an RA string to degrees.
 * Handles HMS formats (letters or colons) and plain decimal.
 */
function parseRA(s: string): number | null {
  // HMS format with letters: "00h42m44.3s"
  const hmsLetters = s.match(/^(\d+)h\s*(\d+)m\s*([\d.]+)s?$/i);
  if (hmsLetters) {
    const h = parseInt(hmsLetters[1]);
    const m = parseInt(hmsLetters[2]);
    const sec = parseFloat(hmsLetters[3]);
    return h * 15 + m * 15 / 60 + sec * 15 / 3600;
  }

  // HMS format with colons: "00:42:44.3"
  const hmsColons = s.match(/^(\d+):([\d]+):([\d.]+)$/);
  if (hmsColons) {
    const h = parseInt(hmsColons[1]);
    const m = parseInt(hmsColons[2]);
    const sec = parseFloat(hmsColons[3]);
    return h * 15 + m * 15 / 60 + sec * 15 / 3600;
  }

  // Plain decimal
  const decimal = parseFloat(s);
  if (!isNaN(decimal) && s.match(/^[\d.]+$/)) {
    return decimal;
  }

  return null;
}

/**
 * Parse a Dec string to degrees.
 * Handles DMS formats (letters or colons) and plain decimal.
 */
function parseDec(s: string): number | null {
  // DMS format with letters: "+41d16m09s" or "-41d16m09s"
  const dmsLetters = s.match(/^([+-]?\d+)d\s*(\d+)m\s*([\d.]+)s?$/i);
  if (dmsLetters) {
    const signStr = dmsLetters[1];
    const sign = signStr.startsWith('-') ? -1 : 1;
    const d = Math.abs(parseInt(signStr));
    const m = parseInt(dmsLetters[2]);
    const sec = parseFloat(dmsLetters[3]);
    return sign * (d + m / 60 + sec / 3600);
  }

  // DMS format with colons: "+41:16:09" or "-41:16:09"
  const dmsColons = s.match(/^([+-]?\d+):([\d]+):([\d.]+)$/);
  if (dmsColons) {
    const signStr = dmsColons[1];
    const sign = signStr.startsWith('-') ? -1 : 1;
    const d = Math.abs(parseInt(signStr));
    const m = parseInt(dmsColons[2]);
    const sec = parseFloat(dmsColons[3]);
    return sign * (d + m / 60 + sec / 3600);
  }

  // Plain decimal (may have sign)
  const decimal = parseFloat(s);
  if (!isNaN(decimal) && s.match(/^[+-]?[\d.]+$/)) {
    return decimal;
  }

  return null;
}
