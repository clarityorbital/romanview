import { describe, it, expect } from 'vitest';
import { computeRollRange } from '../rollRange';
import { positionAngle, angularSeparation } from '../coordinates';

describe('computeRollRange', () => {
  // Sun at RA=0, Dec=0 (vernal equinox direction)
  const sunRa = 0;
  const sunDec = 0;

  it('returns { nominal, min, max } with min = nominal - 15 and max = nominal + 15 for observable target', () => {
    // Target at ~90 degrees from Sun (RA=90, Dec=0 gives 90 degree separation)
    const result = computeRollRange(90, 0, sunRa, sunDec);
    expect(result).not.toBeNull();
    expect(result!.min).toBeCloseTo(result!.nominal - 15, 5);
    expect(result!.max).toBeCloseTo(result!.nominal + 15, 5);
  });

  it('returns null when Sun separation < 54 degrees (too close to Sun)', () => {
    // Target at RA=30, Dec=0 => ~30 degrees from Sun (well within exclusion)
    const result = computeRollRange(30, 0, sunRa, sunDec);
    expect(result).toBeNull();
  });

  it('returns null when Sun separation > 126 degrees (anti-Sun exclusion)', () => {
    // Target at RA=180, Dec=0 => 180 degrees from Sun (anti-Sun direction)
    // Anti-Sun sep = 0 < 36, so unobservable
    const result = computeRollRange(180, 0, sunRa, sunDec);
    expect(result).toBeNull();
  });

  it('nominal V3PA matches positionAngle() output for the same inputs', () => {
    const targetRa = 90;
    const targetDec = 20;
    const result = computeRollRange(targetRa, targetDec, sunRa, sunDec);
    expect(result).not.toBeNull();
    const expectedPA = positionAngle(targetRa, targetDec, sunRa, sunDec);
    expect(result!.nominal).toBeCloseTo(expectedPA, 5);
  });

  it('returns valid range for target near ecliptic pole (always observable)', () => {
    // North ecliptic pole is roughly RA=270, Dec=66.56
    // This target is ~90 degrees from any Sun position near the ecliptic
    const result = computeRollRange(270, 66.56, sunRa, sunDec);
    expect(result).not.toBeNull();
    expect(result!.max - result!.min).toBeCloseTo(30, 5);
  });

  it('returns null for target at exactly 53 degrees Sun separation (just inside exclusion)', () => {
    // Use angularSeparation to find a point at ~53 degrees
    // RA=53, Dec=0 gives ~53 degrees from Sun at (0,0)
    const sep = angularSeparation(53, 0, sunRa, sunDec);
    // Confirm separation is below 54
    expect(sep).toBeLessThan(54);
    const result = computeRollRange(53, 0, sunRa, sunDec);
    expect(result).toBeNull();
  });

  it('returns valid result for target at exactly 55 degrees Sun separation (just outside exclusion)', () => {
    // RA=55, Dec=0 gives ~55 degrees from Sun at (0,0)
    const sep = angularSeparation(55, 0, sunRa, sunDec);
    expect(sep).toBeGreaterThanOrEqual(54);
    const result = computeRollRange(55, 0, sunRa, sunDec);
    expect(result).not.toBeNull();
  });
});
