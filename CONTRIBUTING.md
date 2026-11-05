# Contributing to Xolace

This repo holds every Xolace client (mobile, web, admin, desktop, CLI) and the one Convex backend they share. Many people and agents work in it at once, so the rules below are about keeping changes small, checked and easy to review.

Agents: read [`AGENTS.md`](./AGENTS.md) first. This file is the human-facing version of the same rules.

## Setup

Requirements: [bun](https://bun.sh) at the version in `package.json` → `packageManager` (currently 1.3.14). Rust is needed only for `apps/desktop`; Xcode and Android Studio only for native mobile builds.

```bash
bun install
```

### Environment variables

Each app documents the variables it needs, by name only, in its own `.env.example` (and `.env.schema` for the Varlock-validated Next apps). Copy it to `.env.local` in the same folder and fill in values from the team's secret store. Never commit real values.

| Surface | Where real values live |
|---|---|
| `apps/mobile` | EAS environment variables |
| `packages/backend` | Convex deployment env (`bunx convex env`) |
| `apps/web`, `apps/admin` | Vercel project env |
| `apps/cli` | Varlock |

### Working in a git worktree

Several people and agents usually work in parallel, each in their own worktree. After creating one, run:

```bash
bun scripts/setup-worktree.ts
```

It links your `.env` files, assigns per-worktree dev ports and points the worktree at its own Convex dev deployment, so two worktrees never fight over the same port or backend.

## Branches and commits

- Branch from `main`. Name branches `type/short-description`, e.g. `fix/mirror-keyboard-overlap`.
- Commits and PR titles follow [Conventional Commits](https://www.conventionalcommits.org): `type(scope): subject`. The subject starts lowercase; the scope is optional. CI checks the PR title.
- **Types:** `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `style`, `revert`.
- **Scopes:** `mobile`, `web`, `admin`, `desktop`, `cli`, `docs`, `backend`, `ui`, `config`, `ci`, `deps`, `repo`.

Examples: `feat(web): add sign-in page`, `fix(backend): reject expired session tokens`, `chore(deps): bump expo to 55.0.4`.

Formatting-only commits that touch many files go in [`.git-blame-ignore-revs`](./.git-blame-ignore-revs). To use it locally:

```bash
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

## Testing

### Tiers

| Tier | Command | What it covers | Runs in |
|---|---|---|---|
| Changed only | `bun run check:changed` | format, lint, typecheck and sibling tests for files changed since main | locally / agents, while iterating |
| Unit + Convex | `bun run test` (`turbo run test --affected`) | convex-test (edge-runtime), pure TS logic, RN logic with mocks. Offline. Includes a **security suite**. | every PR (GitHub Actions) |
| Local Convex integration | `bun run test:local` | against a local backend; refuses to run against cloud deployments | local, nightly |
| Web / admin E2E | `bun run test:e2e -F @xolace/web` · `-F @xolace/admin` | Playwright + `@clerk/testing` against the **E2E Convex deployment**, reset and seeded first | PRs touching web, admin or backend |
| Mobile E2E (blocking) | the existing `.argent/flows` | **E2E build** on a simulator | PRs touching mobile or backend (EAS Workflow) |
| Mobile E2E (exploratory) | an argent agent run with a goal built from the PR title, body and changed files | same build; **never blocks the PR**, only reports | same PRs |
| Live evals | `test:evals:*` | model behaviour (intensity, talk) | PRs touching `convex/ai/**` |

Some of these commands land with later migration phases; if a command doesn't exist yet, the tier isn't active yet.

### When to run what

| You are… | Run |
|---|---|
| Iterating on a change | `bun run check:changed`. Don't run repo-wide checks on every save. |
| About to push | `bun run check:changed`, plus the E2E tier for any surface you touched |
| Changing `packages/backend` | `bun run test -F @xolace/backend`; keep functions compatible with mobile builds already in users' hands |
| Changing `apps/desktop/src-tauri` | `cargo check` in `apps/desktop/src-tauri` |
| Changing shared config (`turbo.json`, `biome.json`, `package.json`, `bun.lock`) | `bun run check`, `bun run check-types`, `bun run test` (CI runs everything for these) |
| Fixing formatting | `bun run fix` |

Never point tests or scripts at the production Convex deployment.

## Pull requests

- **One problem per PR.** Unrelated fixes go in their own PR, however small.
- **Fill in the template.** Problem, Change (lead with a small diagram or diff-sketch), Surfaces touched, Merge danger (one-way or two-way door, blast radius), Verification (before/after), and Model & harness if an agent wrote any of it.
- **Evidence is required**, matched to the change:
  - visual change: before/after screenshots
  - timing or animation: a screen recording
  - logic: a test that failed before the change and passes after
  - and say what you **couldn't** verify (e.g. microphone and voice, purchases, push, native auth sheets).
- **CI must pass.** The single required check is `ci-ok`, which aggregates lint, typecheck, test, build, Convex codegen drift and the desktop `cargo check`. Docs-only changes skip build and test.
- **CODEOWNERS review.** Each area has owners in [`.github/CODEOWNERS`](./.github/CODEOWNERS); their approval is required.

## Release pipelines (coming in Phase 3)

Not built yet; this section will describe them once they land:

- **Mobile:** EAS Workflows in `.eas/workflows/` with a fingerprint check on PRs (labels native changes), OTA updates for JS-only changes, and store builds when native code changes. Mobile E2E builds and argent flows run there too.
- **Backend:** `convex deploy` from a single place, always before any client deploy, so backend changes stay compatible with shipped mobile builds.
- **Desktop:** tag-triggered `tauri build` with the updater.
- **Release notes:** the format and where they live will be documented here with the release pipeline.

## Security

See [SECURITY.md](./SECURITY.md). Never commit secrets, and report vulnerabilities privately.
