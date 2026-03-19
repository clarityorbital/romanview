---
phase: 2
slug: live-sky-data
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | TARG-01 | unit (mock fetch) | `npx vitest run src/lib/__tests__/simbad.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | TARG-02 | unit | `npx vitest run src/lib/__tests__/parseCoords.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | TARG-03 | unit | `npx vitest run src/lib/__tests__/coordinates.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | STAR-01 | unit (mock fetch) | `npx vitest run src/lib/__tests__/vizier.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | STAR-02 | unit (mock fetch) | `npx vitest run src/lib/__tests__/vizier.test.ts -t "adaptive"` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 1 | STAR-03 | unit | `npx vitest run src/lib/__tests__/vizier.test.ts -t "status"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/parseCoords.test.ts` — HMS/DMS parsing, edge cases, decimal passthrough
- [ ] `src/lib/__tests__/vizier.test.ts` — VizieR query construction, adaptive logic (mocked fetch)
- [ ] `src/lib/__tests__/simbad.test.ts` — Sesame response parsing (mocked fetch)
- [ ] `src/lib/__tests__/coordinates.test.ts` — formatRA/formatDec, decimal formatting

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stars render in both sky view and focal plane | STAR-01 | Visual rendering requires browser | Load app, enter "M31", verify stars appear in both views |
| Density indicator visible in dense field | STAR-03 | UI element display | Enter "Sgr A*" (galactic center), check footer shows source count and mag limit |
| View centers on resolved target | TARG-01 | Camera animation requires browser | Enter "NGC 6397", verify view centers to RA~265.2, Dec~-53.7 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
