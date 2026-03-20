import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gaiaConSearch, adaptiveGaiaQuery } from '../vizier';

describe('vizier', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockFetchResponse(data: unknown[][]) {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        data,
      }),
    });
  }

  describe('gaiaConSearch', () => {
    it('constructs ADQL with RA_ICRS, DE_ICRS, Gmag (not old column names)', async () => {
      mockFetchResponse([[10.5, 41.2, 15.3]]);

      await gaiaConSearch(10.5, 41.2, 0.6);

      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const url = fetchCall[0] as string;
      expect(url).toContain('RA_ICRS');
      expect(url).toContain('DE_ICRS');
      expect(url).toContain('Gmag');
      // Must NOT contain the old wrong column names
      expect(url).not.toContain('phot_g_mean_mag');
      // "ra" and "dec" appear as column values in the CIRCLE clause, but not as SELECT columns
      // Check the SELECT part specifically
      expect(url).toMatch(/SELECT.*RA_ICRS.*DE_ICRS.*Gmag/);
    });

    it('includes TOP N and magnitude limit in query', async () => {
      mockFetchResponse([]);

      await gaiaConSearch(10.5, 41.2, 0.6, 18, 2500);

      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      // URLSearchParams encodes spaces as +, so decode both forms
      const url = decodeURIComponent((fetchCall[0] as string).replace(/\+/g, ' '));
      expect(url).toContain('TOP 2500');
      expect(url).toContain('Gmag');
      expect(url).toMatch(/Gmag\s*<\s*18/);
    });

    it('passes AbortSignal to fetch', async () => {
      mockFetchResponse([]);

      const controller = new AbortController();
      await gaiaConSearch(10.5, 41.2, 0.6, 18, 2500, controller.signal);

      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const options = fetchCall[1] as RequestInit;
      expect(options.signal).toBe(controller.signal);
    });
  });

  describe('adaptiveGaiaQuery', () => {
    it('returns isDense=true and trims to 2000 when initial count >= 2000', async () => {
      // Generate 2500 stars ordered by magnitude
      const stars = Array.from({ length: 2500 }, (_, i) => [
        10.5 + i * 0.0001,
        41.2 + i * 0.0001,
        10.0 + i * 0.003, // mags from 10.0 to 17.5
      ]);

      mockFetchResponse(stars);

      const result = await adaptiveGaiaQuery(10.5, 41.2);
      expect(result.isDense).toBe(true);
      expect(result.stars).toHaveLength(2000);
      // magLimit should be the magnitude of the 2000th star
      expect(result.magLimit).toBeCloseTo(stars[1999][2], 2);
    });

    it('re-queries with Gmag<21 when initial count < 100', async () => {
      const sparseStars = Array.from({ length: 50 }, (_, i) => [
        10.5 + i * 0.001,
        41.2 + i * 0.001,
        15.0 + i * 0.1,
      ]);

      const deeperStars = Array.from({ length: 150 }, (_, i) => [
        10.5 + i * 0.001,
        41.2 + i * 0.001,
        15.0 + i * 0.04,
      ]);

      // First call returns sparse, second call returns deeper
      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: sparseStars }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: deeperStars }),
        });

      const result = await adaptiveGaiaQuery(10.5, 41.2);
      expect(result.isDense).toBe(false);
      expect(result.stars.length).toBe(150);

      // Verify second query was made with magLimit=21
      const secondCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      const url = decodeURIComponent((secondCall[0] as string).replace(/\+/g, ' '));
      expect(url).toMatch(/Gmag\s*<\s*21/);
    });

    it('returns stars as-is for normal fields (100-2000)', async () => {
      const normalStars = Array.from({ length: 500 }, (_, i) => [
        10.5 + i * 0.001,
        41.2 + i * 0.001,
        12.0 + i * 0.01,
      ]);

      mockFetchResponse(normalStars);

      const result = await adaptiveGaiaQuery(10.5, 41.2);
      expect(result.isDense).toBe(false);
      expect(result.stars).toHaveLength(500);
    });

    it('reports correct magLimit for each case', async () => {
      // Normal case
      const normalStars = Array.from({ length: 500 }, (_, i) => [
        10.5 + i * 0.001,
        41.2 + i * 0.001,
        12.0 + i * 0.01,
      ]);

      mockFetchResponse(normalStars);

      const result = await adaptiveGaiaQuery(10.5, 41.2);
      // magLimit should be the max magnitude in the returned stars
      const maxMag = Math.max(...normalStars.map(s => s[2]));
      expect(result.magLimit).toBeCloseTo(maxMag, 2);
    });
  });
});
