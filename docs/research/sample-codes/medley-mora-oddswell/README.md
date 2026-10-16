# Medley · Mora · Oddswell — sample-app analysis

Research date: 2026-10-14. This is the second batch of sample-app research. The first batch (amber, clarity, oyelo) is in `../`. These docs cross-reference that batch instead of repeating it.

| App | What it is | SDK |
|---|---|---|
| Medley | Media discovery app (Supabase, TanStack Query, Maestro + Argent QA on EAS) | 57 (same as Xolace) |
| Mora | Chat-first nutrition journal: local-first, AI drafts entries and the user confirms them, HealthKit | 58 preview |
| Oddswell | AI sports analysis: structured-output pipelines, risk flags, local history | 56 |

Source: `/Users/nathan/Developer/XolaceInc/sample apps/{Medley-main,Mora-main,oddswell-main}`.

## Files

- [feature-ideas.md](feature-ideas.md): product and feature ideas, ranked shortlist, rejected list.
- [ui-ideas.md](ui-ideas.md): UX and UI ideas by area, "don't regress" table, outside-the-box section.
- [ci-testing-workflows.md](ci-testing-workflows.md): testing, CI and developer workflow. Covers what changed in Xolace since 2026-10-09 and a Maestro + Argent split.

## Xolace issues found along the way (not ideas: actual gaps)

- A safety rejection shows the raw `content_policy_violation` code under "Take a breath", and "Try again" resubmits the same text. Path: `convex/ai/process.ts:175` → `src/features/reflect/components/states/error-state.tsx:56-58`.
- `src/themes/alpha.css` is orphaned. It is not imported in `global.css`, not in `metro.config.js`, and not in `ThemeName`, yet CLAUDE.md lists it.
- 17 files use the OS reduced-motion hook instead of `useEffectiveReducedMotion`, including the thinking orb.
- Mirror audio shares the background-enabled audio session, so it keeps playing after the screen locks.
- No screen-reader announcement when the mirror arrives.
- Sentry `environment` comes from `__DEV__` only, so preview and TestFlight crashes are reported as production.
- Zero `testID` props in `src/`, which blocks any selector-based E2E.

## Top picks across all three docs

1. Kind error copy for safety rejections, and remove the useless retry (ui C1).
2. "What this mirror drew on": surface `episodicMatchKeys`, with a "Not related" correction (feature A1 / ui H1).
3. Self-serve "Download a copy" data export (feature A3).
4. Make the orb and the loop animations respect the in-app reduced-motion setting (ui D2).
5. A deterministic output gate on the mirror with one repair retry, following ADR 0019 (feature B1).
6. A `theme:check` script plus a single `check` script and `expo export` in CI (ci R1/R2).
7. Maestro smoke and regression flows on EAS, one per `docs/bug-log.md` entry, plus an Argent agentic verdict gate before submit (ci R4/R5, feature E1).
8. Every safety miss becomes a permanent synthetic eval case (feature D1).
