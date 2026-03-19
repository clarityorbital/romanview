import { Body, Equator, MakeTime, Observer } from 'astronomy-engine';

export interface SunPosition {
  ra: number;  // degrees
  dec: number; // degrees
}

const geocenter = new Observer(0, 0, 0);

/** Get the Sun's RA/Dec at a given date */
export function getSunPosition(date: Date): SunPosition {
  const time = MakeTime(date);
  const eq = Equator(Body.Sun, time, geocenter, true, true);
  return {
    ra: eq.ra * 15, // hours to degrees
    dec: eq.dec,
  };
}

/** Roman Sun exclusion angle in degrees (cannot point within 54° of Sun) */
export const SUN_EXCLUSION_ANGLE = 54;

/** Roman anti-Sun exclusion angle (cannot point within 36° of anti-Sun) */
export const ANTI_SUN_EXCLUSION_ANGLE = 36;

export interface ObservabilityResult {
  observable: boolean;
  sunSeparation: number;
  antiSunSeparation: number;
  nearConstraint: boolean; // within 5° of a boundary
}

/** Check if a target is observable at a given date */
export function checkObservability(
  targetRaDeg: number,
  targetDecDeg: number,
  date: Date
): ObservabilityResult {
  const sun = getSunPosition(date);

  // Angular separation from Sun
  const sunSep = angSep(targetRaDeg, targetDecDeg, sun.ra, sun.dec);

  // Anti-Sun position
  const antiSunRa = (sun.ra + 180) % 360;
  const antiSunDec = -sun.dec;
  const antiSunSep = angSep(targetRaDeg, targetDecDeg, antiSunRa, antiSunDec);

  const inSunExclusion = sunSep < SUN_EXCLUSION_ANGLE;
  const inAntiSunExclusion = antiSunSep < ANTI_SUN_EXCLUSION_ANGLE;
  const observable = !inSunExclusion && !inAntiSunExclusion;

  const marginSun = Math.abs(sunSep - SUN_EXCLUSION_ANGLE);
  const marginAntiSun = Math.abs(antiSunSep - ANTI_SUN_EXCLUSION_ANGLE);
  const nearConstraint = marginSun < 5 || marginAntiSun < 5;

  return {
    observable,
    sunSeparation: sunSep,
    antiSunSeparation: antiSunSep,
    nearConstraint: observable && nearConstraint,
  };
}

function angSep(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const toRad = Math.PI / 180;
  const r1 = ra1 * toRad, d1 = dec1 * toRad;
  const r2 = ra2 * toRad, d2 = dec2 * toRad;
  const cos = Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(r1 - r2);
  return Math.acos(Math.min(1, Math.max(-1, cos))) / toRad;
}

/** Compute observability windows over a date range */
export function computeObservabilityWindows(
  targetRaDeg: number,
  targetDecDeg: number,
  startDate: Date,
  endDate: Date,
  stepDays = 1
): Array<{ date: Date; status: 'observable' | 'excluded' | 'near-constraint' }> {
  const windows: Array<{ date: Date; status: 'observable' | 'excluded' | 'near-constraint' }> = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const result = checkObservability(targetRaDeg, targetDecDeg, current);
    let status: 'observable' | 'excluded' | 'near-constraint';
    if (!result.observable) {
      status = 'excluded';
    } else if (result.nearConstraint) {
      status = 'near-constraint';
    } else {
      status = 'observable';
    }
    windows.push({ date: new Date(current), status });
    current.setDate(current.getDate() + stepDays);
  }

  return windows;
}
