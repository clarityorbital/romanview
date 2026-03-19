import { describe, it, expect } from 'vitest';
import { parseCoords } from '../parseCoords';

describe('parseCoords', () => {
  describe('decimal degree passthrough', () => {
    it('parses "10.6847 +41.2687" as decimal degrees', () => {
      const result = parseCoords('10.6847 +41.2687');
      expect(result).not.toBeNull();
      expect(result!.ra).toBeCloseTo(10.6847, 4);
      expect(result!.dec).toBeCloseTo(41.2687, 4);
    });

    it('parses "10.6847, 41.2687" with comma separator', () => {
      const result = parseCoords('10.6847, 41.2687');
      expect(result).not.toBeNull();
      expect(result!.ra).toBeCloseTo(10.6847, 4);
      expect(result!.dec).toBeCloseTo(41.2687, 4);
    });
  });

  describe('HMS/DMS with letters', () => {
    it('parses "00h42m44.3s +41d16m09s" to correct decimal degrees', () => {
      const result = parseCoords('00h42m44.3s +41d16m09s');
      expect(result).not.toBeNull();
      // 0*15 + 42*15/60 + 44.3*15/3600 = 0 + 10.5 + 0.18458... = 10.6846
      expect(result!.ra).toBeCloseTo(10.6846, 3);
      // 41 + 16/60 + 9/3600 = 41.2692
      expect(result!.dec).toBeCloseTo(41.2692, 3);
    });
  });

  describe('HMS/DMS with colons', () => {
    it('parses "00:42:44.3 +41:16:09" to correct decimal degrees', () => {
      const result = parseCoords('00:42:44.3 +41:16:09');
      expect(result).not.toBeNull();
      expect(result!.ra).toBeCloseTo(10.6846, 3);
      expect(result!.dec).toBeCloseTo(41.2692, 3);
    });
  });

  describe('range validation', () => {
    it('returns null for negative RA ("-10.5 +41.2")', () => {
      expect(parseCoords('-10.5 +41.2')).toBeNull();
    });

    it('returns null for RA > 360 ("370 +41.0")', () => {
      expect(parseCoords('370 +41.0')).toBeNull();
    });

    it('returns null for Dec > 90 ("180.0 +95.0")', () => {
      expect(parseCoords('180.0 +95.0')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('returns null for empty string', () => {
      expect(parseCoords('')).toBeNull();
    });

    it('returns null for unparseable garbage', () => {
      expect(parseCoords('garbage')).toBeNull();
    });
  });

  describe('boundary values', () => {
    it('parses "12h00m00s -00d00m00s" to ra=180, dec=0', () => {
      const result = parseCoords('12h00m00s -00d00m00s');
      expect(result).not.toBeNull();
      expect(result!.ra).toBeCloseTo(180.0, 4);
      expect(result!.dec).toBeCloseTo(0.0, 4);
    });

    it('parses "23h59m59.9s +89d59m59s" near the pole', () => {
      const result = parseCoords('23h59m59.9s +89d59m59s');
      expect(result).not.toBeNull();
      // 23*15 + 59*15/60 + 59.9*15/3600 = 345 + 14.75 + 0.24958... = 359.9996
      expect(result!.ra).toBeCloseTo(359.9996, 3);
      // 89 + 59/60 + 59/3600 = 89.9997
      expect(result!.dec).toBeCloseTo(89.9997, 3);
    });
  });
});
