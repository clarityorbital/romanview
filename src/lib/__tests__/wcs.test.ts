import { describe, it, expect } from 'vitest';
import {
  gnomonicForward,
  gnomonicInverse,
  rotateByPA,
  v2v3ToSky,
  skyToFocalPlane,
} from '../wcs';

describe('WCS projection engine', () => {
  const ARCSEC_TOLERANCE = 0.001 / 3600; // 0.001 arcsec in degrees

  describe('gnomonic round-trip', () => {
    const testCases = [
      { ra: 45, dec: 30, ra0: 45.1, dec0: 30.05, label: 'mid-latitude' },
      { ra: 180, dec: 0, ra0: 180.2, dec0: 0.1, label: 'equator' },
      { ra: 90, dec: 85, ra0: 90.5, dec0: 85.1, label: 'near pole' },
    ];

    for (const { ra, dec, ra0, dec0, label } of testCases) {
      it(`round-trips within 0.001 arcsec (${label})`, () => {
        const proj = gnomonicForward(ra, dec, ra0, dec0);
        expect(proj).not.toBeNull();
        const recovered = gnomonicInverse(proj!.xi, proj!.eta, ra0, dec0);
        expect(recovered.ra).toBeCloseTo(ra, 8);
        expect(recovered.dec).toBeCloseTo(dec, 8);

        // Explicit arcsecond-level check
        const dRa = Math.abs(recovered.ra - ra) * Math.cos(dec * Math.PI / 180);
        const dDec = Math.abs(recovered.dec - dec);
        expect(dRa).toBeLessThan(ARCSEC_TOLERANCE);
        expect(dDec).toBeLessThan(ARCSEC_TOLERANCE);
      });
    }
  });

  describe('gnomonic at tangent point', () => {
    it('returns (0, 0) at the tangent point itself', () => {
      const result = gnomonicForward(45, 30, 45, 30);
      expect(result).not.toBeNull();
      expect(result!.xi).toBeCloseTo(0, 12);
      expect(result!.eta).toBeCloseTo(0, 12);
    });
  });

  describe('gnomonic behind tangent', () => {
    it('returns null for antipodal point', () => {
      const result = gnomonicForward(45, 30, 225, -30);
      expect(result).toBeNull();
    });
  });

  describe('position angle rotation', () => {
    it('rotateByPA(1, 0, 90) rotates East vector to South', () => {
      const result = rotateByPA(1, 0, 90);
      expect(result.xi).toBeCloseTo(0, 10);
      expect(result.eta).toBeCloseTo(-1, 10);
    });

    it('rotateByPA with PA=0 is identity', () => {
      const result = rotateByPA(0.5, 0.3, 0);
      expect(result.xi).toBeCloseTo(0.5, 10);
      expect(result.eta).toBeCloseTo(0.3, 10);
    });
  });

  describe('v2v3ToSky', () => {
    // Use a reference boresight and target
    const boresightV2 = 0;
    const boresightV3 = -468;
    const targetRa = 45;
    const targetDec = 30;
    const v3pa = 0;

    it('at boresight V2/V3 returns target RA/Dec', () => {
      const result = v2v3ToSky(
        boresightV2, boresightV3,
        boresightV2, boresightV3,
        targetRa, targetDec,
        v3pa
      );
      expect(result.ra).toBeCloseTo(targetRa, 6);
      expect(result.dec).toBeCloseTo(targetDec, 6);
    });

    it('with offset V2/V3 returns displaced position', () => {
      // 100 arcsec offset in V2
      const result = v2v3ToSky(
        boresightV2 + 100, boresightV3,
        boresightV2, boresightV3,
        targetRa, targetDec,
        v3pa
      );
      // Should NOT be at the target
      const separation = Math.sqrt(
        Math.pow((result.ra - targetRa) * Math.cos(targetDec * Math.PI / 180), 2) +
        Math.pow(result.dec - targetDec, 2)
      );
      // 100 arcsec ~ 0.0278 degrees
      expect(separation).toBeGreaterThan(0.01);
      expect(separation).toBeLessThan(0.1);
    });
  });

  describe('skyToFocalPlane', () => {
    it('round-trip: star 5 arcmin north of boresight at PA=0 gives fpY ~ 5', () => {
      const boresightRa = 45;
      const boresightDec = 30;
      const v3pa = 0;

      // Star 5 arcmin north (in Dec)
      const starRa = boresightRa;
      const starDec = boresightDec + 5 / 60; // 5 arcmin north

      const result = skyToFocalPlane(starRa, starDec, boresightRa, boresightDec, v3pa);
      expect(result).not.toBeNull();
      // At PA=0, north on sky = +eta = +y in focal plane
      expect(result!.x).toBeCloseTo(0, 1);
      expect(result!.y).toBeCloseTo(5, 1); // ~5 arcmin
    });

    it('returns null for positions behind the tangent point', () => {
      const result = skyToFocalPlane(225, -30, 45, 30, 0);
      expect(result).toBeNull();
    });
  });
});
