import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sesameResolve } from '../simbad';

/**
 * Minimal DOMParser mock for Node.js test environment.
 * Parses XML by extracting element text content via regex.
 */
class MockDOMParser {
  parseFromString(text: string, _type: string) {
    return {
      querySelector(selector: string) {
        // Simple regex-based element finder for XML
        const regex = new RegExp(`<${selector}[^>]*>([^<]*)</${selector}>`, 'i');
        const match = text.match(regex);
        if (match) {
          return { textContent: match[1] };
        }
        return null;
      },
    };
  }
}

describe('sesameResolve', () => {
  beforeEach(() => {
    // Provide DOMParser in Node.js test environment
    if (typeof globalThis.DOMParser === 'undefined') {
      vi.stubGlobal('DOMParser', MockDOMParser);
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves "M31" from mocked XML response', async () => {
    const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<Sesame>
  <Target>
    <Resolver name="S=Simbad">
      <jradeg>10.6847</jradeg>
      <jdedeg>41.2687</jdedeg>
      <oname>M 31</oname>
    </Resolver>
  </Target>
</Sesame>`;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockXml,
    }));

    const result = await sesameResolve('M31');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('M 31');
    expect(result!.ra).toBeCloseTo(10.6847, 4);
    expect(result!.dec).toBeCloseTo(41.2687, 4);
  });

  it('returns null for nonexistent target (no jradeg in XML)', async () => {
    const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<Sesame>
  <Target>
    <Resolver name="S=Simbad">
      <INFO>nonexistent_xyz: No data</INFO>
    </Resolver>
  </Target>
</Sesame>`;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockXml,
    }));

    const result = await sesameResolve('nonexistent_xyz');
    expect(result).toBeNull();
  });

  it('returns null when fetch throws a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const result = await sesameResolve('M31');
    expect(result).toBeNull();
  });
});
