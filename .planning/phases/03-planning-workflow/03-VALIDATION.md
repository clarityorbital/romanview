---
phase: 3
slug: planning-workflow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest --run` |
| **Full suite command** | `npx vitest --run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest --run`
- **After every plan wave:** Run `npx vitest --run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | PLAN-01 | unit | `npx vitest --run src/lib/__tests__/rollRange.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | PLAN-02 | unit | `npx vitest --run src/lib/__tests__/urlState.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | PLAN-03 | unit | `npx vitest --run src/lib/__tests__/ds9Export.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/rollRange.test.ts` — roll range computation, unobservable targets
- [ ] `src/lib/__tests__/urlState.test.ts` — URL encode/decode round-trips, special characters
- [ ] `src/lib/__tests__/ds9Export.test.ts` — FK5 polygon generation, 18 SCAs, header format

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PA slider drags and footprint rotates in real-time | PLAN-01 | Interactive UI + Three.js rendering | Drag slider, verify footprint rotation matches PA value |
| URL copied and opened reproduces identical view | PLAN-02 | Requires two browser tabs | Copy URL, open in new tab, compare target/PA/date |
| Downloaded .reg file loads in DS9 | PLAN-03 | Requires SAOImage DS9 application | Click export, open file in DS9, verify 18 SCA polygons |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
