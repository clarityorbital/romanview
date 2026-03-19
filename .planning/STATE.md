# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-19)

**Core value:** Scientifically accurate WFI footprint placement on the sky with real coordinate transforms, so observers can plan which detectors cover their targets and when Roman can observe them.
**Current focus:** Phase 1: SIAF Geometry and WCS Engine

## Current Position

Phase: 1 of 4 (SIAF Geometry and WCS Engine)
Plan: 0 of 3 in current phase
Status: Ready to plan
Last activity: 2026-03-19 — Roadmap created

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 4-phase structure derived from requirement dependencies -- geometry first, then catalog data, then workflow, then advanced features
- [Research]: VizieR TAP uses column names RAJ2000/DEJ2000/Gmag (NOT ESA Gaia names ra/dec/phot_g_mean_mag) -- existing vizier.ts has wrong names
- [Research]: Current detector geometry has ~60-degree orientation error -- SIAF extraction is critical path

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1 requires extracting SIAF data from pysiaf into static JSON (one-time Python script, well-documented)
- PA convention (V3PA vs aperture PA vs FPA PA) needs validation against pysiaf or APT output
- Dither pattern exact offsets (Phase 4) have LOW research confidence -- may need additional research

## Session Continuity

Last session: 2026-03-19
Stopped at: Roadmap created, ready to plan Phase 1
Resume file: None
