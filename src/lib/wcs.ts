/**
 * Centralized WCS (World Coordinate System) engine for Roman WFI.
 *
 * This module is the SINGLE source of truth for ALL coordinate projection math
 * in the application. No other file should implement its own projection.
 *
 * Functions:
 * - gnomonicForward: Sky (RA/Dec) to tangent plane (xi/eta)
 * - gnomonicInverse: Tangent plane to sky
 * - rotateByPA: Rotate tangent plane coordinates by position angle
 * - v2v3ToSky: SIAF V2V3 arcsec to sky RA/Dec
 * - skyToFocalPlane: Project sky position onto focal plane in arcminutes
 *
 * Formulas follow Calabretta & Greisen 2002 (TAN gnomonic projection).
 * The tangent plane approximation is accurate to <0.01 arcsec over the
 * WFI's ~0.8-degree field of view.
 */

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const ARCSEC_TO_RAD = Math.PI / (180 * 3600);
const RAD_TO_ARCMIN = (180 * 60) / Math.PI;

/**
 * Gnomonic (TAN) forward projection: sky coordinates to tangent plane.
 *
 * @param ra  - Source right ascension in degrees
 * @param dec - Source declination in degrees
 * @param ra0 - Tangent point right ascension in degrees
 * @param dec0 - Tangent point declination in degrees
 * @returns {xi, eta} in radians (xi = East, eta = North), or null if behind tangent point
 */
export function gnomonicForward(
  ra: number, dec: number,
  ra0: number, dec0: number,
): { xi: number; eta: number } | null {
  const cosDec = Math.cos(dec * DEG_TO_RAD);
  const sinDec = Math.sin(dec * DEG_TO_RAD);
  const cosDec0 = Math.cos(dec0 * DEG_TO_RAD);
  const sinDec0 = Math.sin(dec0 * DEG_TO_RAD);
  const dRa = (ra - ra0) * DEG_TO_RAD;

  const cosC = sinDec0 * sinDec + cosDec0 * cosDec * Math.cos(dRa);
  if (cosC <= 0) return null; // behind tangent point

  const xi = (cosDec * Math.sin(dRa)) / cosC;           // radians, East
  const eta = (cosDec0 * sinDec - sinDec0 * cosDec * Math.cos(dRa)) / cosC; // radians, North

  return { xi, eta };
}

/**
 * Gnomonic (TAN) inverse projection: tangent plane to sky coordinates.
 *
 * @param xi  - Tangent plane East coordinate in radians
 * @param eta - Tangent plane North coordinate in radians
 * @param ra0 - Tangent point right ascension in degrees
 * @param dec0 - Tangent point declination in degrees
 * @returns {ra, dec} in degrees, with ra normalized to [0, 360)
 */
export function gnomonicInverse(
  xi: number, eta: number,
  ra0: number, dec0: number,
): { ra: number; dec: number } {
  const cosDec0 = Math.cos(dec0 * DEG_TO_RAD);
  const sinDec0 = Math.sin(dec0 * DEG_TO_RAD);
  const rho = Math.sqrt(xi * xi + eta * eta);

  if (rho === 0) return { ra: ra0, dec: dec0 };

  const c = Math.atan(rho);
  const cosC = Math.cos(c);
  const sinC = Math.sin(c);

  const dec = Math.asin(cosC * sinDec0 + (eta * sinC * cosDec0) / rho);
  const raRad = ra0 * DEG_TO_RAD + Math.atan2(
    xi * sinC,
    rho * cosDec0 * cosC - eta * sinDec0 * sinC,
  );

  return {
    ra: ((raRad * RAD_TO_DEG) % 360 + 360) % 360,
    dec: dec * RAD_TO_DEG,
  };
}

/**
 * Rotate tangent plane coordinates by a position angle.
 *
 * PA is measured East of North (standard astronomical convention):
 * - PA = 0: no rotation
 * - PA = 90: East vector rotates to South
 *
 * @param xi  - Tangent plane East coordinate (any unit)
 * @param eta - Tangent plane North coordinate (same unit as xi)
 * @param paDeg - Position angle in degrees, East of North
 * @returns Rotated {xi, eta} in same units as input
 */
export function rotateByPA(
  xi: number, eta: number,
  paDeg: number,
): { xi: number; eta: number } {
  const pa = paDeg * DEG_TO_RAD;
  const cosPA = Math.cos(pa);
  const sinPA = Math.sin(pa);
  return {
    xi:   xi * cosPA + eta * sinPA,
    eta: -xi * sinPA + eta * cosPA,
  };
}

/**
 * Convert a SIAF V2/V3 position to sky RA/Dec given a pointing attitude.
 *
 * Uses the tangent plane approximation (accurate to <0.01 arcsec for WFI FOV).
 *
 * @param v2 - V2 coordinate in arcseconds (from SIAF)
 * @param v3 - V3 coordinate in arcseconds (from SIAF)
 * @param boresightV2 - Boresight V2 in arcseconds (WFI_CEN)
 * @param boresightV3 - Boresight V3 in arcseconds (WFI_CEN)
 * @param targetRa - Target RA in degrees (where boresight points on sky)
 * @param targetDec - Target Dec in degrees
 * @param v3paDeg - V3 position angle in degrees (East of North)
 * @returns {ra, dec} in degrees
 */
export function v2v3ToSky(
  v2: number, v3: number,
  boresightV2: number, boresightV3: number,
  targetRa: number, targetDec: number,
  v3paDeg: number,
): { ra: number; dec: number } {
  // 1. Compute offset from boresight in V2/V3 frame (arcsec -> radians)
  const dv2 = (v2 - boresightV2) * ARCSEC_TO_RAD;
  const dv3 = (v3 - boresightV3) * ARCSEC_TO_RAD;

  // 2. V2V3 to tangent plane coordinates
  //    V2 increases to the left (West on sky at V3PA=0), xi increases East
  //    So xi = -dv2 (sign flip), eta = dv3
  const xiUnrotated = -dv2;
  const etaUnrotated = dv3;

  // 3. Rotate by V3PA to align with sky N/E
  const { xi, eta } = rotateByPA(xiUnrotated, etaUnrotated, v3paDeg);

  // 4. Inverse gnomonic projection to get sky coordinates
  return gnomonicInverse(xi, eta, targetRa, targetDec);
}

/**
 * Project a sky position onto the focal plane.
 *
 * Returns focal plane coordinates in arcminutes relative to the boresight,
 * with the V3PA rotation removed so coordinates are in the instrument frame.
 *
 * @param ra - Source RA in degrees
 * @param dec - Source Dec in degrees
 * @param boresightRa - Boresight RA in degrees
 * @param boresightDec - Boresight Dec in degrees
 * @param v3paDeg - V3 position angle in degrees
 * @returns {x, y} in arcminutes (instrument frame), or null if behind tangent point
 */
export function skyToFocalPlane(
  ra: number, dec: number,
  boresightRa: number, boresightDec: number,
  v3paDeg: number,
): { x: number; y: number } | null {
  // 1. Forward gnomonic projection to get tangent plane position
  const proj = gnomonicForward(ra, dec, boresightRa, boresightDec);
  if (!proj) return null;

  // 2. Rotate by -V3PA to get from sky frame to instrument frame
  const { xi, eta } = rotateByPA(proj.xi, proj.eta, -v3paDeg);

  // 3. Convert from radians to arcminutes
  return {
    x: xi * RAD_TO_ARCMIN,
    y: eta * RAD_TO_ARCMIN,
  };
}
