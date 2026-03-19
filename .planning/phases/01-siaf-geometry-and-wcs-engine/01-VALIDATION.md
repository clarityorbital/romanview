---
phase: 1
slug: siaf-geometry-and-wcs-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (integrates with Vite) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 0 | FOOT-01 | unit | `npx vitest run src/lib/__tests__/siaf.test.ts -t "detector positions"` | Wave 0 | ⬜ pending |
| 01-01-02 | 01 | 0 | FOOT-02 | unit | `npx vitest run src/lib/__tests__/siaf.test.ts -t "detector labels"` | Wave 0 | ⬜ pending |
| 01-02-01 | 02 | 1 | FOOT-03 | unit | `npx vitest run src/lib/__tests__/wcs.test.ts -t "position angle"` | Wave 0 | ⬜ pending |
| 01-02-02 | 02 | 1 | FOOT-04 | unit | `npx vitest run src/lib/__tests__/wcs.test.ts -t "gnomonic"` | Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install -D vitest` — install test framework
- [ ] `vitest.config.ts` — Vitest config (can reuse vite.config.ts)
- [ ] `src/lib/__tests__/siaf.test.ts` — SIAF data integrity (18 detectors, correct names, non-overlapping)
- [ ] `src/lib/__tests__/wcs.test.ts` — gnomonic projection round-trip, PA rotation, V2V3-to-sky

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 18 SCAs visually positioned correctly on sky with 60° FPA rotation | FOOT-01 | Visual layout requires human judgment | Load app, select a target, verify footprint shape matches Roman WFI layout diagrams |
| Hovering a detector shows SCA name and sky coverage | FOOT-02 | UI interaction requires browser | Hover over each detector in sky view, verify tooltip shows WFI name and RA/Dec bounds |
| PA rotation rotates footprint East of North around boresight | FOOT-03 | Visual rotation direction requires human check | Change epoch, verify footprint rotates in correct direction |
| Focal plane view shows stars at correct projected positions | FOOT-04 | Visual accuracy check against known fields | Point at a well-known cluster, verify star positions are plausible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
