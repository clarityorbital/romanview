import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateDS9Regions, downloadDS9Regions } from '../ds9Export';

describe('generateDS9Regions', () => {
  // M31 at PA=90
  const targetRa = 10.6847;
  const targetDec = 41.2687;
  const v3pa = 90;

  it('returns string starting with DS9 version 4.1 header', () => {
    const output = generateDS9Regions(targetRa, targetDec, v3pa);
    expect(output.startsWith('# Region file format: DS9 version 4.1')).toBe(true);
  });

  it('output contains "fk5" coordinate system line', () => {
    const output = generateDS9Regions(targetRa, targetDec, v3pa);
    const lines = output.split('\n');
    expect(lines.some(l => l.trim() === 'fk5')).toBe(true);
  });

  it('output contains exactly 18 polygon lines (one per SCA)', () => {
    const output = generateDS9Regions(targetRa, targetDec, v3pa);
    const lines = output.split('\n');
    const polygonLines = lines.filter(l => l.startsWith('polygon('));
    expect(polygonLines).toHaveLength(18);
  });

  it('each polygon line contains exactly 4 RA/Dec coordinate pairs (8 numbers)', () => {
    const output = generateDS9Regions(targetRa, targetDec, v3pa);
    const lines = output.split('\n');
    const polygonLines = lines.filter(l => l.startsWith('polygon('));

    for (const line of polygonLines) {
      // Extract the coordinate string between "polygon(" and ")"
      const match = line.match(/^polygon\(([^)]+)\)/);
      expect(match).not.toBeNull();
      const coords = match![1].split(',').map(s => s.trim());
      // 4 corners x 2 values (RA, Dec) = 8 numbers
      expect(coords).toHaveLength(8);
      // All should be valid numbers
      for (const c of coords) {
        expect(parseFloat(c)).not.toBeNaN();
      }
    }
  });

  it('each polygon line has text tag matching detector ID (e.g., "text={WFI01}")', () => {
    const output = generateDS9Regions(targetRa, targetDec, v3pa);
    const lines = output.split('\n');
    const polygonLines = lines.filter(l => l.startsWith('polygon('));

    const detectorIds: string[] = [];
    for (const line of polygonLines) {
      const match = line.match(/text=\{(WFI\d{2})\}/);
      expect(match).not.toBeNull();
      detectorIds.push(match![1]);
    }

    // Should have all 18 unique detector IDs
    expect(new Set(detectorIds).size).toBe(18);
    // Verify some known IDs
    expect(detectorIds).toContain('WFI01');
    expect(detectorIds).toContain('WFI18');
  });

  it('all RA values are in range [0, 360) and all Dec values are in range [-90, 90]', () => {
    const output = generateDS9Regions(targetRa, targetDec, v3pa);
    const lines = output.split('\n');
    const polygonLines = lines.filter(l => l.startsWith('polygon('));

    for (const line of polygonLines) {
      const match = line.match(/^polygon\(([^)]+)\)/);
      const coords = match![1].split(',').map(s => parseFloat(s.trim()));

      // Even indices are RA, odd indices are Dec
      for (let i = 0; i < coords.length; i += 2) {
        const ra = coords[i];
        const dec = coords[i + 1];
        expect(ra).toBeGreaterThanOrEqual(0);
        expect(ra).toBeLessThan(360);
        expect(dec).toBeGreaterThanOrEqual(-90);
        expect(dec).toBeLessThanOrEqual(90);
      }
    }
  });

  it('output ends with trailing newline', () => {
    const output = generateDS9Regions(targetRa, targetDec, v3pa);
    expect(output.endsWith('\n')).toBe(true);
  });

  it('works with different PA values', () => {
    const output0 = generateDS9Regions(targetRa, targetDec, 0);
    const output180 = generateDS9Regions(targetRa, targetDec, 180);
    // Both should produce valid output with 18 polygons
    expect(output0.split('\n').filter(l => l.startsWith('polygon(')).length).toBe(18);
    expect(output180.split('\n').filter(l => l.startsWith('polygon(')).length).toBe(18);
    // But with different coordinates
    expect(output0).not.toBe(output180);
  });
});

describe('downloadDS9Regions', () => {
  let createElementSpy: ReturnType<typeof vi.spyOn>;
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock DOM APIs
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
      style: {} as CSSStyleDeclaration,
    };

    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(
      mockLink as unknown as HTMLAnchorElement
    );

    createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.fn();

    // Assign URL methods
    globalThis.URL.createObjectURL = createObjectURLSpy;
    globalThis.URL.revokeObjectURL = revokeObjectURLSpy;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates and triggers a Blob download', () => {
    downloadDS9Regions(10.6847, 41.2687, 90, 'M31');

    // Should create an anchor element
    expect(createElementSpy).toHaveBeenCalledWith('a');

    // Should create a blob URL
    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    const blobArg = createObjectURLSpy.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);

    // Should trigger download and cleanup
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('uses target name in filename when provided', () => {
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
      style: {} as CSSStyleDeclaration,
    };
    createElementSpy.mockReturnValue(mockLink as unknown as HTMLAnchorElement);

    downloadDS9Regions(10.6847, 41.2687, 90, 'M31');
    expect(mockLink.download).toContain('M31');
    expect(mockLink.download).toContain('.reg');
  });
});
