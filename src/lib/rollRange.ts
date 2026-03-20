/**
 * Roll range computation for Roman Space Telescope WFI.
 *
 * Given a target and Sun position, computes the allowed V3 position angle
 * range based on Sun-target geometry. The roll range is +/-15 degrees
 * around the nominal V3PA.
 */

import { positionAngle, angularSeparation } from './coordinates';

export interface RollRange {
  /** Nominal V3 position angle in degrees (East of North) */
  nominal: number;
  /** Minimum allowed V3PA (nominal - 15) */
  min: number;
  /** Maximum allowed V3PA (nominal + 15) */
  max: number;
}

/** Roman Sun exclusion half-angle in degrees */
const SUN_EXCLUSION = 54;

/** Maximum Sun separation for observability (180 - anti-Sun exclusion) */
const MAX_SUN_SEP = 126;

/**
 * Compute the allowed V3PA roll range for a target given the Sun position.
 *
 * @param targetRa  - Target right ascension in degrees
 * @param targetDec - Target declination in degrees
 * @param sunRa     - Sun right ascension in degrees
 * @param sunDec    - Sun declination in degrees
 * @returns Roll range { nominal, min, max } in degrees, or null if target is not observable
 */
export function computeRollRange(
  targetRa: number,
  targetDec: number,
  sunRa: number,
  sunDec: number,
): RollRange | null {
  // Check Sun separation constraint
  const sunSep = angularSeparation(targetRa, targetDec, sunRa, sunDec);

  if (sunSep < SUN_EXCLUSION || sunSep > MAX_SUN_SEP) {
    return null;
  }

  // Compute nominal V3PA as the position angle from target toward the Sun
  const nominal = positionAngle(targetRa, targetDec, sunRa, sunDec);

  return {
    nominal,
    min: nominal - 15,
    max: nominal + 15,
  };
}
