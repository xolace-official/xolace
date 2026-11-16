# .agents

Repo-owned context for AI coding agents. Start with the root `AGENTS.md`; read a rule
file only when your task touches its topic.

## Rules (`rules/`)

| File | Read when |
|---|---|
| `rules/code-style.md` | writing any code (Ultracite/Biome, React Compiler, colocation) |
| `rules/convex.md` | touching `packages/backend/convex` or any client's Convex usage |
| `rules/expo-monorepo.md` | changing mobile dependencies, Metro or EAS config |
| `rules/testing.md` | choosing what to run, writing tests, PR proof |
| `rules/pull-requests.md` | writing or editing a PR body |
| `rules/env-and-secrets.md` | adding/using env vars, worktree env files |
| `rules/release.md` | anything deploy- or release-shaped (stub until Phase 3) |

Per-package rules live in each package's `AGENTS.md`.

## Skills

Third-party skills are kept to a minimum (decision D9). Add one only when a task needs
it, record it in the root `skills-lock.json`, and prefer small repo-specific skills under
`.agents/skills/` (e.g. `test-mobile`, `pr-watch`). A repo-owned skill has no lock entry
(the lock pins upstream sources); Claude Code finds it through a symlink in
`.claude/skills/`.

| Skill | Owner | Use when |
|---|---|---|
| `port-screen` | repo | porting a redesign screen (S1–S22) into `apps/mobile` |
| `animate-expo`, `react-native-best-practices` | third-party (`skills-lock.json`) | mobile motion and performance |
| `vercel-react-best-practices` | third-party, in `.claude/skills/` | React advice; `rules/code-style.md` says which rules it must not override |

## Keeping this lean

Each rule file is short and single-topic. Don't paste vendor docs or generated rule
blocks here; link to them. If a rule stops being true, fix or delete it in the same PR
that changes the behavior.
