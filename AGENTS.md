# Xolace

One repo for every Xolace client (mobile, web, desktop, CLI, internal admin) and the
docs site, all on **one Convex backend with Clerk auth**. bun 1.3.14 workspaces
(isolated linker) + Turborepo + Biome/Ultracite. Many people and agents work here at
once: stay inside your task, your worktree and your Convex dev deployment.

The mobile app and backend are real (moved in Phase 2). Web, admin, desktop, CLI and
docs are still placeholders until Phase 4. Plan and decisions:
`docs/plan/workspace-migration-plan.md`.

## Repo map

| Path | Package | What it is |
|---|---|---|
| `apps/mobile` | `@xolace/mobile` | Expo (SDK 58) app for iOS/Android; EAS builds and OTA |
| `apps/web` | `@xolace/web` | User-facing Next.js app. Server build on Vercel; static export (`TAURI_BUILD=1`) for desktop |
| `apps/admin` | `@xolace/admin` | Internal dashboard, Next.js, own Vercel project. Never bundled into web/desktop |
| `apps/desktop` | `@xolace/desktop` | Tauri shell only (`src-tauri/`); loads `apps/web`'s static build |
| `apps/cli` | `@xolace/cli` | OpenTUI terminal client on Bun |
| `apps/docs` | `@xolace/docs` | fumadocs site |
| `packages/backend` | `@xolace/backend` | Convex functions, schema, auth config; the contract every client uses |
| `packages/ui` | `@xolace/ui` | Web-only shadcn components shared by web + admin |
| `packages/config` | `@xolace/config` | Shared tsconfig bases |
| `scripts/` | (root) | `check-changed.ts`, `setup-worktree.ts`, env sync |
| `.agents/rules/` | | Topic rules; index in `.agents/README.md` |

Each app/package has its own `AGENTS.md` with commands, boundaries and gotchas. Read it
before editing there.

**Layout rules.** Apps ship; packages are imported. An app never imports another app.
Clients reach the backend only through `@xolace/backend/api` (+ `dataModel`, + the
allowlisted client-safe modules). `packages/ui` is web-only; mobile keeps its own UI.
Put a dependency in the package that uses it; shared versions come from the root
`catalog:`. Don't create `packages/shared` until a second client needs the same code.

## Glossary

- **user**: a person using Xolace on any client. Identified by Clerk's
  `tokenIdentifier` (`iss|sub`); a token from another issuer is a different user.
- **admin**: Xolace staff with `role: "admin"` in Clerk `publicMetadata`, carried as a
  JWT claim. Checked in Convex, not just the admin UI.
- **agent**: an AI coding agent working in this repo (you). Not the product's AI
  features, which live in `packages/backend/convex/ai/`.
- **surface**: anything that ships: mobile, web, desktop, cli, admin, docs, plus the
  Convex contract itself.
- **deployment**: a Convex deployment unless said otherwise: `prod`, `preview`,
  a per-worktree `dev`, and the dedicated `e2e` one.

## Hit every surface

When you change behavior, walk this list and say in the PR which ones you checked:

- [ ] **Convex contract**: schema and function args/returns. Shipped mobile binaries
      keep calling the old API for weeks (see "store-gap rule" below). Additive only.
- [ ] **mobile**: Expo app; also its offline/loading states and both platforms.
- [ ] **web**: server build on Vercel; Clerk middleware and server components available.
- [ ] **desktop**: the *static* export of web. No server components with dynamic data,
      no route handlers, no Clerk server features, no middleware. Guard with
      `TAURI_BUILD`.
- [ ] **admin**: needs its own view or permission? Admin-only functions go in
      `convex/admin/*`.
- [ ] **cli**: does the TUI expose this? Bun runtime, no DOM.
- [ ] **docs**: user-visible behavior or setup changed? Update `apps/docs` or the
      relevant `AGENTS.md`.

## Ways to hurt yourself

- **Never** run `convex deploy`, or anything against the prod Convex deployment. Only
  the release pipeline deploys.
- **Never** run `convex dev` against a deployment you share. Each worktree gets its own
  dev deployment (`bunx convex dev --configure` in `packages/backend`, pick "new").
- **Never** commit secrets: `.env*` values, `google-services.json`,
  `GoogleService-Info.plist`, service-account / firebase-adminsdk JSON, deploy keys.
  Names go in `.env.example` / `.env.schema`; values go in EAS / Convex / Vercel env.
  See `.agents/rules/env-and-secrets.md`.
- **Never** kill processes by name pattern (`pkill node`, `killall bun`): other agents'
  dev servers and simulators run on this machine. Kill the PID you started.
- **Never** run repo-wide checks while iterating (`turbo run test` with no filter,
  `bun run check-types`). Use `bun run check:changed`.
- **Never** use `--no-verify` or skip hooks. Fix what the hook reports.
- **Never** delete a Convex function, field or argument a shipped app may still call.
  Deprecate it (see `packages/backend/AGENTS.md`).
- **Never** add a third-party skill without recording it in `skills-lock.json`. Keep
  agent context lean: no vendored docs dumps, no auto-generated rule blocks.
- Don't edit a symlinked env file in a worktree: it is the main worktree's file.

## Worktrees and ports

Fresh worktree: `bun run setup:worktree` (idempotent). It installs with
`--frozen-lockfile`, symlinks gitignored `.env`/`.env.local` files from the main
worktree (except the backend's `.env.local`, which the Convex CLI owns), and writes
`.xolace/ports.json` plus `.xolace/setup-{running,done,failed}` markers.

Ports are stable per worktree path (main worktree = defaults):

| Service | Default | Worktree |
|---|---|---|
| web | 3001 | `3001 + 10·slot` |
| admin | 3002 | `3002 + 10·slot` |
| docs | 4000 | `4000 + 10·slot` |
| metro | 8081 | `8081 + 10·slot` |

Pass them explicitly; the dev scripts still hard-code the defaults:

```sh
bun run dev:web -- --port "$(jq -r .web .xolace/ports.json)"
bun run dev:mobile -- --port "$(jq -r .metro .xolace/ports.json)"
```

Desktop dev (`tauri dev`) still expects web on 3001; run it from one worktree at a time.

## Verifying

| When | Run |
|---|---|
| Iterating | `bun run check:changed` (Biome on changed files, `check-types`+`lint` for affected packages and dependents, sibling tests). `--base <ref>` to compare elsewhere, `--list` to dry-run |
| One test file | `bunx vitest run <file>` inside the package, or `bunx turbo run test -F <pkg> -- <file>`; root scripts: `bun test scripts/` |
| Before a PR | `bunx turbo run check-types lint test` and `bun run check` |

`check:changed` prints a timed summary and what only CI covers (builds, E2E, codegen
drift, evals). Tiers and commands: `.agents/rules/testing.md`.

**Proof in PRs.** Before reproducing a bug, pick the evidence it needs:
visual → before/after screenshots; timing or animation → a recording; logic → a test
that fails before the fix and passes after. State what the simulator **can't** prove:
microphone and voice, purchases, push, native auth sheets.

**Mobile on a simulator:** use the argent MCP tools. `describe` (or
`debugger-component-tree`) before every tap; never guess coordinates. Stop the
simulator sessions you started when done (scope the stop to your devices; an unscoped
stop kills other agents' sessions).

## Convex in one screen

Full rules: `.agents/rules/convex.md` and `packages/backend/AGENTS.md`.

- Functions live in domain folders (`convex/<feature>/`), not one flat directory.
- Validators on **every** `args` and `returns`. `internal*` for anything not called by a
  client.
- Query with `.withIndex(...)`, never `.filter(...)` on a table scan.
- Auth through the shared helper (`requireAuth`), never ad-hoc identity checks.
- Admin functions only in `convex/admin/*`, built with `adminQuery` / `adminMutation` /
  `adminAction`. Clients other than `apps/admin` never import `api.admin.*`.
- Clients import only `@xolace/backend/api` (+ `dataModel` and allowlisted shared
  modules). Never server-only code (`"use node"`, `ai/providers`, `jobs`).
- **Store-gap rule:** backend deploys before store review clears, so old app builds run
  against the new backend. Only additive changes: new functions, new optional args,
  widened arg types. Scheduled functions run the *current* code with *old* args.

## Coding standards

Ultracite/Biome enforces the mechanics: run `bun run fix`. Full rules:
`.agents/rules/code-style.md`. The ones that bite most:

- `unknown` over `any`; narrow instead of asserting; named constants, no magic numbers.
- `for...of`, `?.`/`??`, `const`; always `await`; throw `Error` objects.
- React: function components, hooks at top level, full deps, stable `key`s, no
  components defined inside components, `ref` as a prop.
- **React Compiler is on**: no `useMemo`/`useCallback`/`memo()` for performance
  (exceptions listed in code-style.md).
- Colocate by feature; no new files in horizontal dirs (`hooks/`, `services/`,
  `types/`); no barrel files.
- No `console.log`/`debugger` in shipped code. Accessible, semantic markup.

## Commits and PRs

- Conventional Commits (`feat(web): ...`, `fix(backend): ...`). One logical change per
  commit.
- Work on a branch; nothing lands on `main` or touches prod Convex without review.
- PR body: Problem / Change / Verification (with the proof above) / Model and harness.
- Issues live in GitHub Issues; use `gh`.

### Merging a PR

| Button | Use for | Lands as |
|---|---|---|
| **Squash and merge** (default) | Most PRs: one logical change, even with fix-up commits on the branch | One commit titled like the PR, e.g. `chore(mobile): bump uniwind to 1.12.2 (#615)` |
| **Create a merge commit** | Big PRs whose commits each stand alone (a migration done in steps), and `dev` → `main` releases | Every branch commit plus a merge commit; keeps the steps and the branch link |
| **Rebase and merge** | Rarely: a few clean, independent commits you want without a merge commit | The commits replayed onto the base, with new hashes |

- The PR title becomes the squash commit title, so it must be a Conventional Commit
  (the PR title check enforces it).
- After a squash, the branch's commits aren't on `dev`. A branch cut from it must drop
  them: `git rebase --onto origin/dev <last-squashed-commit>`.
- Stacked or overlapping PRs (same `package.json` / `bun.lock`): merge in order, then
  rebase the next one. On a `bun.lock` conflict take the base's lockfile and re-run
  `bun install`; never hand-merge it. After force-pushing a rebase, check the PR
  still has its approval: the `dev` ruleset can ask for a new one after a push.
