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
    it('no two detector polygons in V2V3 space overlap (SAT check)', () => {
      const detectors = getAllDetectors();

      // Use Separating Axis Theorem for convex polygon overlap detection.
      // The detectors are rotated ~60 degrees so axis-aligned bounding boxes
      // will falsely report overlaps. SAT tests along all edge-normal axes.
      function getAxes(corners: [number, number][]): [number, number][] {
        const axes: [number, number][] = [];
        for (let i = 0; i < corners.length; i++) {
          const j = (i + 1) % corners.length;
          const edgeX = corners[j][0] - corners[i][0];
          const edgeY = corners[j][1] - corners[i][1];
          // Normal to edge (perpendicular)
          const len = Math.sqrt(edgeX * edgeX + edgeY * edgeY);
          axes.push([-edgeY / len, edgeX / len]);
        }
        return axes;
      }

      function project(corners: [number, number][], axis: [number, number]): [number, number] {
        let min = Infinity;
        let max = -Infinity;
        for (const c of corners) {
          const dot = c[0] * axis[0] + c[1] * axis[1];
          if (dot < min) min = dot;
          if (dot > max) max = dot;
        }
        return [min, max];
      }

      function polygonsOverlap(a: [number, number][], b: [number, number][]): boolean {
        const axes = [...getAxes(a), ...getAxes(b)];
        for (const axis of axes) {
          const [minA, maxA] = project(a, axis);
          const [minB, maxB] = project(b, axis);
          if (maxA <= minB || maxB <= minA) return false; // separating axis found
        }
        return true; // no separating axis = overlap
      }

      for (let i = 0; i < detectors.length; i++) {
        for (let j = i + 1; j < detectors.length; j++) {
          const a = detectors[i];
          const b = detectors[j];
          expect(
            polygonsOverlap(a.corners_v2v3 as [number, number][], b.corners_v2v3 as [number, number][]),
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
