---
plan_id: quick-3-01
phase: quick-3
title: Fix telescope barrel pointing toward selected target
description: Remove async useEffect refs that cause flickering, read props directly in useFrame (R3F v9 updates callback via useLayoutEffect), inline coordinate math to avoid per-frame allocations
wave: 1
autonomous: true
---

# Plan: Fix telescope barrel pointing toward selected target

## Goal
The telescope 3D model barrel should smoothly rotate to point toward whichever target the user selects. Fix the flickering caused by async ref updates.

## Root Cause Analysis

1. **Flickering**: `useEffect` updates refs AFTER paint (async). Between re-render and effect, `useFrame` reads stale refs → telescope flickers between camera-direction and target-direction modes.
2. **Fix**: Remove `useEffect` refs entirely. R3F v9's `useFrame` stores the callback in a ref updated via `useLayoutEffect` (synchronous), so reading props directly from the closure always gives current values.
3. **Allocation**: `raDecToCartesian()` creates a new `Vector3` every frame — inline the math into the preallocated `_dir` vector.

## Tasks

### Task 1: Remove async refs and read props directly in useFrame

**files:** `src/components/scene/RomanTelescope.tsx`
**action:**
- Remove `useEffect` import (keep useRef, useMemo)
- Remove `targetRaRef`, `targetDecRef` refs and their `useEffect`
- In `useFrame`, read `targetRa`/`targetDec` directly from props (closure)
- Inline the coordinate math into `_dir.set(...)` to avoid per-frame Vector3 allocation
- Keep the slerp smoothing (0.12 factor) and FLIP_Y_180 correction

**verify:** `npx tsc --noEmit` passes, no `useEffect` in the file
**done:** Telescope reads current props directly, no async ref delay
