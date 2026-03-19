import { describe, it, expect } from 'vitest';
import { getAllDetectors, getDetector, getBoresight } from '../siaf';

describe('SIAF detector data', () => {
  describe('detector positions', () => {
    it('returns exactly 18 detectors', () => {
      const detectors = getAllDetectors();
      expect(detectors).toHaveLength(18);
    });
  });

  describe('detector labels', () => {
    it('all detectors named WFI01-WFI18', () => {
      const detectors = getAllDetectors();
      for (const det of detectors) {
        expect(det.id).toMatch(/^WFI\d{2}$/);
      }
    });

    it('no detectors named SCA*', () => {
      const detectors = getAllDetectors();
      for (const det of detectors) {
        expect(det.id).not.toMatch(/^SCA/);
      }
    });

    it('contains all 18 WFI detectors', () => {
      const detectors = getAllDetectors();
      const ids = detectors.map((d) => d.id).sort();
      const expected = Array.from({ length: 18 }, (_, i) =>
        `WFI${String(i + 1).padStart(2, '0')}`
      ).sort();
      expect(ids).toEqual(expected);
    });
  });

  describe('detector data integrity', () => {
    it('each detector has numeric v2Ref, v3Ref, v3IdlYAngle', () => {
      const detectors = getAllDetectors();
      for (const det of detectors) {
        expect(typeof det.v2Ref).toBe('number');
        expect(Number.isFinite(det.v2Ref)).toBe(true);
        expect(typeof det.v3Ref).toBe('number');
        expect(Number.isFinite(det.v3Ref)).toBe(true);
        expect(typeof det.v3IdlYAngle).toBe('number');
        expect(Number.isFinite(det.v3IdlYAngle)).toBe(true);
      }
    });

    it('each detector has corners_v2v3 with 4 corner pairs', () => {
      const detectors = getAllDetectors();
      for (const det of detectors) {
        expect(det.corners_v2v3).toHaveLength(4);
        for (const corner of det.corners_v2v3) {
          expect(corner).toHaveLength(2);
          expect(typeof corner[0]).toBe('number');
          expect(Number.isFinite(corner[0])).toBe(true);
          expect(typeof corner[1]).toBe('number');
          expect(Number.isFinite(corner[1])).toBe(true);
        }
      }
    });
  });

  describe('no overlapping detectors', () => {
    it('no two detector bounding boxes in V2V3 space overlap', () => {
      const detectors = getAllDetectors();

      // Compute bounding box for each detector from corners
      const boxes = detectors.map((det) => {
        const v2s = det.corners_v2v3.map((c) => c[0]);
        const v3s = det.corners_v2v3.map((c) => c[1]);
        return {
          id: det.id,
          minV2: Math.min(...v2s),
          maxV2: Math.max(...v2s),
          minV3: Math.min(...v3s),
          maxV3: Math.max(...v3s),
        };
      });

      // Check each pair for overlap
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i];
          const b = boxes[j];
          const overlapsV2 = a.minV2 < b.maxV2 && a.maxV2 > b.minV2;
          const overlapsV3 = a.minV3 < b.maxV3 && a.maxV3 > b.minV3;
          expect(
            overlapsV2 && overlapsV3,
            `Detectors ${a.id} and ${b.id} overlap in V2V3 space`
          ).toBe(false);
        }
      }
    });
  });

  describe('boresight', () => {
    it('getBoresight() returns V2/V3 values that are finite numbers', () => {
      const boresight = getBoresight();
      expect(typeof boresight.v2).toBe('number');
      expect(Number.isFinite(boresight.v2)).toBe(true);
      expect(typeof boresight.v3).toBe('number');
      expect(Number.isFinite(boresight.v3)).toBe(true);
    });
  });

  describe('getDetector', () => {
    it('returns WFI01 detector object', () => {
      const det = getDetector('WFI01');
      expect(det).toBeDefined();
      expect(det!.id).toBe('WFI01');
    });

    it('returns undefined for invalid detector', () => {
      const det = getDetector('INVALID');
      expect(det).toBeUndefined();
    });
  });
});
