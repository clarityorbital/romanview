---
plan_id: quick-3-01
status: complete
started: 2026-03-20T03:20:36Z
completed: 2026-03-20T03:22:00Z
---

# Quick Task 3: Fix telescope barrel pointing toward selected target

## Summary

Fixed the telescope flickering and rotation by removing the async `useEffect` ref pattern that was causing the telescope to bounce between camera-tracking and target-tracking modes on alternating frames.

## Root Cause

The `useEffect` hook that synced `targetRa`/`targetDec` into refs ran **after paint** (async). Between the React re-render and the effect firing, `useFrame` read stale ref values (`undefined`) and fell back to camera-direction mode. On the next frame, the effect had fired and the refs held correct values, so it used target-direction mode. This alternation caused visible flickering.

## Fix

- Removed `useEffect` + refs pattern entirely
- Read `targetRa`/`targetDec` props directly in the `useFrame` closure
- R3F v9 updates the `useFrame` callback ref via `useLayoutEffect` (synchronous after DOM commit), so props captured in the closure are always current
- Inlined `raDecToCartesian` math into `_dir.set(...)` to avoid per-frame `Vector3` allocation

## Files Modified

| File | Change |
|------|--------|
| `src/components/scene/RomanTelescope.tsx` | Removed useEffect refs, read props directly, inlined coordinate math |

## Commits

| Hash | Message |
|------|---------|
| 1988233 | fix(quick-3): remove async useEffect refs causing telescope flicker |
