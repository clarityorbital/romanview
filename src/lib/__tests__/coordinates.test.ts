import { describe, it, expect } from 'vitest';
import { formatRA, formatDec, formatRaDeg, formatDecDeg } from '../coordinates';

describe('coordinate formatting', () => {
  describe('formatRaDeg', () => {
    it('formats 10.6847 as "10.6847"', () => {
      expect(formatRaDeg(10.6847)).toBe('10.6847');
    });

    it('formats 0.0 as "0.0000"', () => {
      expect(formatRaDeg(0.0)).toBe('0.0000');
    });

    it('formats 359.9996 with 4 decimal places', () => {
      expect(formatRaDeg(359.9996)).toBe('359.9996');
    });
  });

  describe('formatDecDeg', () => {
    it('formats +41.2687 with leading plus sign', () => {
      expect(formatDecDeg(41.2687)).toBe('+41.2687');
    });

    it('formats -53.67 with trailing zeros', () => {
      expect(formatDecDeg(-53.67)).toBe('-53.6700');
    });

    it('formats 0 as "+0.0000"', () => {
      expect(formatDecDeg(0)).toBe('+0.0000');
    });
  });

  describe('existing formatRA regression', () => {
    it('formatRA produces HMS string', () => {
      const result = formatRA(10.6847);
      // 10.6847 degrees / 15 = 0.712313... hours
      // 0h 42m 44.3s approximately
      expect(result).toMatch(/00h\s+42m/);
    });
  });

  describe('existing formatDec regression', () => {
    it('formatDec produces DMS string with sign', () => {
      const result = formatDec(41.2687);
      expect(result).toMatch(/\+41/);
    });

    it('formatDec handles negative values', () => {
      const result = formatDec(-53.67);
      expect(result).toMatch(/-53/);
    });
  });
});
