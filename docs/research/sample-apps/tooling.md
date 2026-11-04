# Tooling ideas from the sample apps

Source tags (**C** Companion, **P** Private Mind, **R** Rakazo) and context: [README.md](README.md).
Agent tooling, evals, rules and dev tooling. GitHub Actions and release guards are in
[workflows-ci.md](workflows-ci.md).

## Evals and AI debugging

**Two-layer agent evals (R).** Deterministic scripted/loopback tests on every PR; real-model evals as an explicit command where missing credentials mean "not run", not "pass" (`docs/agent-verification.md`). Declarative cases with graders over memory, routines, approvals, external writes and a prompt-injection canary (`packages/testkit/src/evals/cases.ts`); synthetic 100/1k/10k-message histories for distant recall, corrections and absent facts (`docs/evals/history-findings.md`, `history-fixtures.ts`).
→ For `convex/evals.ts` and `ai/prompts/__evals__`: "remembers a 3-week-old detail", "stays silent when it should", "doesn't schedule more than asked", "injection in an imported journal does nothing", "crisis language always escalates".

**Dev-only answer traces (P).** `utils/answerTrace.ts` / `utils/traceFile.ts` write question → raw → tidied → retries → final, behind a flag, with a cap on kept files.
→ A never-ship trace for the reflection agent and talk prompts, alongside `evals.ts`.

**Real captured fixtures (P).** `__tests__/fixtures/pages` + `realPagePipeline.test.ts` run real input through the pipeline; `modelStoreDownloadRaces.test.ts` covers race conditions.
→ Anonymized real transcripts as fixtures for the `ai/` parsers.

## Agent rules and skills

**pr-watch skill (R).** `.agents/skills/pr-watch/SKILL.md` (+ `pr-digest`): one backgrounded `--watch` per cycle, verdict of green / failures / open comments, PR comments treated as untrusted, merge needs approval, 20-round / 2-hour cap.
→ Fits our many-agents setup. Must be recorded in `skills-lock.json` if adopted.

**AI test-authoring rule (C).** `.agents/rules/testing-mobile-ai-authoring.md`: numbered agent instructions and copy-paste prompts; explain the test layer, always print the verify command, don't invent runners. A router rule (`.agents/rules/testing-mobile.md`) picks the layer.
→ Fold into `.agents/rules/testing.md`, especially for Convex tests and evals.

**Grep guards for forbidden literals (C).** `apps/mobile/scripts/check-no-cal-hostnames.sh`: `rg` with an allowlist, ignores comments, wired into `lint:all`.
→ Block crisis-line numbers outside `features/crisis-resources`, raw Convex deployment URLs, and `api.admin.*` outside `apps/admin`. One file per rule that agents can't miss.

**Onboarding prompt (R).** `SETUP_PROMPT.md`: a copy-paste prompt that turns a coding agent into a careful onboarding engineer, with safety rules, questions to ask first, preflight and verification.
→ For new contributors and fresh worktrees, next to `bun run setup:worktree`.

## Performance tooling

**Perf log per release (P).** `docs/BENCHMARKS.md` keeps per-device throughput, time to first token, peak memory and crash counts, fed by an in-app benchmark (`hooks/useBenchmarkRunner.tsx`) and a tiny native memory probe (`modules/memory-probe/ios/MemoryProbeModule.swift`, `phys_footprint`; PSS on Android).
→ A `docs/perf/` log for talk latency, Skia FPS and cold start; a small local Expo module for real memory numbers on heavy Skia/Reanimated screens.

**Idempotent local migrations (P).** `database/db.ts` checks `PRAGMA table_info` before each `ALTER ... ADD COLUMN`, then cleans orphan rows; covered by `__tests__/dbMigration.test.ts`.
→ Pattern for Xolace's local op-sqlite caches.
