import { describe, it, expect } from 'vitest';
import { encodeToHash, decodeFromHash } from '../urlState';
import type { ObservationParams } from '../urlState';

describe('urlState', () => {
  describe('encodeToHash', () => {
    it('produces hash containing "ra=10.68470" and "dec=41.26870" for M31 coords', () => {
      const hash = encodeToHash({ ra: 10.6847, dec: 41.2687 });
      expect(hash).toContain('ra=10.68470');
      expect(hash).toContain('dec=41.26870');
    });

    it('starts with #', () => {
      const hash = encodeToHash({ ra: 10.6847, dec: 41.2687 });
      expect(hash).toMatch(/^#/);
    });

    it('omits undefined fields (no "ra=undefined" in output)', () => {
      const hash = encodeToHash({ name: 'M31' });
      expect(hash).not.toContain('ra=');
      expect(hash).not.toContain('dec=');
      expect(hash).not.toContain('undefined');
    });

    it('formats pa to 1 decimal place', () => {
      const hash = encodeToHash({ pa: 123.456 });
      expect(hash).toContain('pa=123.5');
    });
  });

  describe('decodeFromHash', () => {
    it('round-trips all params: ra, dec, name, pa, date', () => {
      const original: ObservationParams = {
        ra: 10.6847,
        dec: 41.2687,
        name: 'M31',
        pa: 90.5,
        date: '2026-06-15',
      };
      const hash = encodeToHash(original);
      const decoded = decodeFromHash(hash);
      expect(decoded.ra).toBeCloseTo(original.ra!, 4);
      expect(decoded.dec).toBeCloseTo(original.dec!, 4);
      expect(decoded.name).toBe('M31');
      expect(decoded.pa).toBeCloseTo(original.pa!, 0);
      expect(decoded.date).toBe('2026-06-15');
    });

    it('target names with spaces ("NGC 1234") survive encode/decode', () => {
      const original: ObservationParams = { name: 'NGC 1234' };
      const hash = encodeToHash(original);
      const decoded = decodeFromHash(hash);
      expect(decoded.name).toBe('NGC 1234');
    });

    it('target names with special chars ("alpha Cen A") survive encode/decode', () => {
      const original: ObservationParams = { name: 'alpha Cen A' };
      const hash = encodeToHash(original);
      const decoded = decodeFromHash(hash);
      expect(decoded.name).toBe('alpha Cen A');
    });

    it('missing params decode as undefined (not NaN or empty string)', () => {
      const decoded = decodeFromHash('#name=M31');
      expect(decoded.ra).toBeUndefined();
      expect(decoded.dec).toBeUndefined();
      expect(decoded.pa).toBeUndefined();
      expect(decoded.date).toBeUndefined();
    });

    it('handles empty hash string', () => {
      const decoded = decodeFromHash('');
      expect(decoded.ra).toBeUndefined();
      expect(decoded.dec).toBeUndefined();
      expect(decoded.name).toBeUndefined();
    });

    it('handles hash with only #', () => {
      const decoded = decodeFromHash('#');
      expect(decoded.ra).toBeUndefined();
      expect(decoded.dec).toBeUndefined();
    });
  });
});
