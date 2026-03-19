# Testing Patterns

**Analysis Date:** 2026-03-19

## Test Framework

**Current Status:** No testing framework configured

**Runner:**
- Not detected - no Jest, Vitest, Mocha, or other test runner configured
- `package.json` contains no test-related dependencies
- `package-lock.json` lists no testing packages

**Assertion Library:**
- Not detected

**Run Commands:**
- Not available - no `npm test`, `npm run test`, or equivalent defined

## Motivation for Testing Gap

This is a visualization-heavy application built with React Three Fiber and astronomy calculations:

1. **Visual/3D rendering hard to test** - Much logic is in Three.js scene management (`StarField.tsx`, `CelestialScene.tsx`), which requires headless browser or snapshot testing
2. **Tight canvas integration** - Components use `useThree()` and `useFrame()` hooks from React Three Fiber, difficult to unit test in isolation
3. **Early-stage project** - Three commits in, feature set is still stabilizing (latest commit: "Add sun-constrained position angle rotation and focal plane detector view")
4. **Pure functions are testable** - Astronomy math (`coordinates.ts`, `constraints.ts`) has no tests but could benefit from them

## Recommended Test Strategy

**Test Types to Add:**

### 1. Unit Tests for Pure Functions (High Priority)
Location: `src/lib/__tests__/` or alongside source files as `*.test.ts`

**High-value modules to test:**
- `src/lib/coordinates.ts` - All functions are pure math with clear inputs/outputs
- `src/lib/constraints.ts` - Observability logic has edge cases (exclusion zones, date ranges)
- `src/lib/catalog.ts` - Star catalog loading and processing
- `src/lib/roman.ts` - Detector geometry calculations

**Example test pattern:**
```typescript
// src/lib/__tests__/coordinates.test.ts
import { describe, it, expect } from 'vitest';
import { raDecToCartesian, cartesianToRaDec, angularSeparation } from '../coordinates';
import * as THREE from 'three';

describe('coordinates', () => {
  describe('raDecToCartesian', () => {
    it('converts RA=0, Dec=0 to positive X axis', () => {
      const pos = raDecToCartesian(0, 0, 1);
      expect(pos.x).toBeCloseTo(1);
      expect(pos.y).toBeCloseTo(0);
      expect(pos.z).toBeCloseTo(0);
    });

    it('converts RA=90, Dec=0 to negative Z axis', () => {
      const pos = raDecToCartesian(90, 0, 1);
      expect(pos.x).toBeCloseTo(0, 5);
      expect(pos.z).toBeCloseTo(-1, 5);
    });

    it('respects radius parameter', () => {
      const pos = raDecToCartesian(0, 0, 2);
      expect(pos.length()).toBeCloseTo(2);
    });
  });

  describe('angularSeparation', () => {
    it('returns 0 for identical positions', () => {
      expect(angularSeparation(45, 30, 45, 30)).toBeCloseTo(0);
    });

    it('returns ~180 for antipodal positions', () => {
      expect(angularSeparation(0, 0, 180, 0)).toBeCloseTo(180);
    });
  });
});
```

### 2. Integration Tests for Hooks (Medium Priority)
Location: `src/hooks/__tests__/`

**Modules to test:**
- `useTargets` - State management, localStorage persistence
- `useEphemeris` - Ephemeris calculation over time

**Example pattern:**
```typescript
// src/hooks/__tests__/useTargets.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTargets } from '../useTargets';

describe('useTargets', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with empty targets', () => {
    const { result } = renderHook(() => useTargets());
    expect(result.current.targets).toEqual([]);
    expect(result.current.selectedTargetId).toBeNull();
  });

  it('adds a target', () => {
    const { result } = renderHook(() => useTargets());

    act(() => {
      result.current.addTarget('M31', 10.68, 41.27);
    });

    expect(result.current.targets).toHaveLength(1);
    expect(result.current.targets[0].name).toBe('M31');
  });

  it('persists targets to localStorage', () => {
    const { result } = renderHook(() => useTargets());

    act(() => {
      result.current.addTarget('M31', 10.68, 41.27);
    });

    const stored = JSON.parse(localStorage.getItem('roman-view-targets') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('M31');
  });
});
```

### 3. Component Tests (Lower Priority - Visual Components)
Location: `src/components/__tests__/`

**Easier to test:**
- Form components: `TargetSearch` (mock API calls, test input handling)
- Display components: `Header`, `CoordinateDisplay` (prop-based rendering)

**Harder to test (require snapshot/canvas testing):**
- Scene components: `CelestialScene`, `StarField` (3D rendering)
- Canvas-based components: `WFIFootprint`, `ExclusionZones`

**Example for form component:**
```typescript
// src/components/ui/__tests__/TargetSearch.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TargetSearch } from '../TargetSearch';

describe('TargetSearch', () => {
  it('calls onAddTarget with manual coordinates', () => {
    const handleAdd = vi.fn();
    render(<TargetSearch onAddTarget={handleAdd} />);

    // Switch to manual mode
    fireEvent.click(screen.getByText('[RA/DEC]'));

    // Enter coordinates
    fireEvent.change(screen.getByPlaceholderText('RA (deg)'), { target: { value: '10.68' } });
    fireEvent.change(screen.getByPlaceholderText('DEC (deg)'), { target: { value: '41.27' } });
    fireEvent.click(screen.getByText('+ ADD TARGET'));

    expect(handleAdd).toHaveBeenCalledWith(expect.any(String), 10.68, 41.27);
  });
});
```

## Test File Organization

**Recommended Location:**
- Co-located with source: `src/lib/coordinates.ts` paired with `src/lib/__tests__/coordinates.test.ts`
- OR subdirectory: `src/__tests__/lib/coordinates.test.ts`
- Tests for hooks: `src/hooks/__tests__/useTargets.test.ts`
- Tests for components: `src/components/__tests__/Header.test.tsx`

**Naming:**
- Unit tests: `*.test.ts` or `*.spec.ts`
- Integration tests: can use same naming or `*.integration.test.ts`
- Snapshot tests (if added): `*.snap`

## Recommended Testing Setup

**Framework to Add: Vitest**

Why Vitest over Jest:
- Faster (uses Vite's existing pipeline)
- Better TypeScript support out of the box
- ESM-native (aligns with project's ESNext module target)
- Lower config overhead

**Installation:**
```bash
npm install -D vitest @testing-library/react @testing-library/dom happy-dom
```

**Config file: `vitest.config.ts`**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: [],
  },
});
```

**Update `tsconfig.app.json` to include Vitest types:**
```json
{
  "compilerOptions": {
    "types": ["vite/client", "vitest/globals"]
  }
}
```

**Update `package.json` scripts:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## Mocking Strategy

**What to Mock:**
- API calls (SIMBAD, VizieR) - Use `vi.mock()` or MSW (Mock Service Worker)
- `localStorage` - Already handled in test setup or use `localStorage-mock`
- Three.js rendering - Harder to mock; use snapshot testing or skip rendering tests
- `astronomy-engine` - Mock for deterministic tests, or use real library with fixed dates

**What NOT to Mock:**
- Pure math functions - Test them directly
- React hooks from standard library - Don't mock
- Custom hooks (`useTargets`, `useEphemeris`) - Test with React Testing Library

**Example mock setup:**
```typescript
// src/__tests__/setup.ts
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock SIMBAD/sesameResolve
vi.mock('../lib/simbad', () => ({
  sesameResolve: vi.fn(async (name: string) => {
    if (name === 'M31') return { name: 'M31', ra: 10.68, dec: 41.27 };
    return null;
  }),
  resolveName: vi.fn(),
}));
```

## Coverage

**Requirements:** Not enforced (no coverage config found)

**View Coverage:**
```bash
npm run test:coverage
```

**Recommended thresholds** (to add to Vitest config):
```typescript
test: {
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
    include: ['src/**/*.{ts,tsx}'],
    exclude: ['src/**/*.d.ts', 'src/main.tsx'],
    lines: 60,
    functions: 60,
    branches: 50,
    statements: 60,
  },
},
```

## Test Types

**Unit Tests:**
- Scope: Individual functions or small components
- Approach: Test with pure inputs/outputs, no side effects
- Priority: HIGH for `lib/` utilities
- Examples: `coordinates.ts` functions, `roman.ts` geometry calculations

**Integration Tests:**
- Scope: Hook logic with React state, localStorage, API interactions
- Approach: Use React Testing Library hooks renderer, mock external APIs
- Priority: MEDIUM for hooks like `useTargets`, `useEphemeris`
- May combine multiple hooks or utilities

**E2E Tests:**
- Framework: Not currently used; Cypress or Playwright would be candidates
- Priority: LOW (3D visualization hard to E2E test)
- Consider Cypress Component Testing for complex UI flows

## Common Patterns

**Async Testing:**
```typescript
it('resolves SIMBAD query', async () => {
  const result = await sesameResolve('M31');
  expect(result?.name).toBe('M31');
});

// With React Testing Library
it('displays results after search', async () => {
  render(<TargetSearch onAddTarget={vi.fn()} />);
  fireEvent.change(screen.getByPlaceholderText('SIMBAD lookup...'), { target: { value: 'M31' } });
  expect(await screen.findByText('M31')).toBeInTheDocument();
});
```

**Error Testing:**
```typescript
it('handles SIMBAD lookup failure', async () => {
  vi.mocked(sesameResolve).mockRejectedValueOnce(new Error('Network error'));

  const { result } = renderHook(() => useSearch());
  await act(() => result.current.search('M31'));

  expect(result.current.error).toBe('Search failed');
});

it('returns null on invalid input to cartesianToRaDec', () => {
  const result = cartesianToRaDec(new THREE.Vector3(0, 0, 0));
  // Function handles edge case gracefully
  expect(isNaN(result.ra)).toBe(false);
});
```

**Snapshot Testing (if needed for complex scenes):**
```typescript
it('renders CelestialScene with expected structure', () => {
  const { container } = render(
    <CelestialScene
      sunPosition={{ ra: 100, dec: 20 }}
      selectedTarget={null}
      showGrid={true}
      showConstraints={true}
      showGalactic={false}
    />
  );
  expect(container).toMatchSnapshot();
});
```

---

*Testing analysis: 2026-03-19*
