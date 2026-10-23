# @xolace/backend

The single Convex backend for every client: schema, queries/mutations/actions, crons,
HTTP routes, Clerk auth config. Its generated API is **the contract** that shipped
mobile binaries, web, admin, desktop and the CLI all call. The real backend moves in
from `xolace_app/convex` in Phase 2. Full rules: `.agents/rules/convex.md`.

## Commands

- Own dev deployment (once per worktree, interactive; run it yourself, an agent
  should ask): `bunx convex dev --configure` → "create a new dev deployment".
- Dev sync: `bun run dev:server` from the root (`convex dev`, against *your* dev
  deployment only).
- Check: `bun run check:changed` from the root; `bun run check-types` here.
- Tests: `bun run test` here. Live evals spend Anthropic credits and run only on
  request: `bun run test:evals` (or `:intensity` / `:talk`), with
  `ANTHROPIC_API_KEY` set.
- Never: `convex deploy`, `convex dev` against a shared/prod deployment,
  `convex env set` on prod. Only the release pipeline deploys Convex (below).

## Deploy topology

- **Only `.github/workflows/release.yml` deploys Convex**, on every push to `main`:
  `convex deploy` to prod first, then the clients (EAS mobile release, Vercel deploy
  hooks for web and admin). The backend never waits on a client build.
- **Key:** the prod `CONVEX_DEPLOY_KEY` is a secret of the GitHub `production`
  environment, and nowhere else: not Vercel, EAS or a local `.env`.
- **Web and admin** are plain builds reading `NEXT_PUBLIC_CONVEX_URL` from Vercel env
  (prod URL on Production, the shared dev deployment on Preview); both fail their
  build if `CONVEX_DEPLOY_KEY` is set. Desktop and local builds never deploy.
- Clients ship after the backend is live; the store-gap rule still applies to binaries
  already in users' hands. Setup: `docs/setup/release.md`.

## Public surface

- `@xolace/backend/api` (`convex/_generated/api`) and `@xolace/backend/dataModel`.
- Temporary `@xolace/backend/convex/*` for the mobile move, restricted by Biome to
  `_generated` + an allowlist of client-safe `lib/*` modules. Server-only code
  (`"use node"`, `ai/providers`, `jobs`) is never on the allowlist.

## Rules

- Domain folders (`convex/<feature>/`), tests beside the code.
- Validators on all `args` and `returns`; `internal*` unless a client calls it.
- `.withIndex()`, never `.filter()` over a table.
- Auth through `requireAuth()` / `requireSessionOwnership()` (`convex/lib/auth.ts`).
- Admin functions only in `convex/admin/*` via `adminQuery` / `adminMutation` /
  `adminAction`.
- **All model calls live under `convex/ai/`.** No feature calls an LLM to re-derive
  what the session's Understanding already holds (read it via
  `internal.understanding.getUnderstanding`). A new model call needs genuinely new
  signal (a new modality or artifact type).
- Read `convex/_generated/ai/guidelines.md` when present; it overrides training data
  on Convex APIs.

## Store-gap rule (backward compatibility)

The backend deploys before app-store review clears, so the *old* app runs against the
*new* backend for days. The schema must always match existing data.

- Safe: new tables, new functions, new optional args, making an arg optional,
  widening an arg to a union that still accepts the old type.
- Behavior changes must stay acceptable to a client sending the old args.
- Scheduled functions run the *currently deployed* code with the args they were
  scheduled with; keep accepting those.
- Never delete a function, field or arg the minimum supported app may call. Mark it:
  JSDoc `@deprecated` plus
  `// DEPRECATED(remove-after: app >= X.Y.Z): <reason + replacement>`, and add a line
  to `packages/backend/DEPRECATIONS.md` (moved from `xolace_app/docs/deprecations.md`
  in Phase 2). Read that ledger before removing anything. Delete only once the minimum
  supported store version no longer references it.

## Gotchas

- `CONVEX_DEPLOYMENT` lives in this package's `.env.local`, written by the Convex CLI.
  `setup:worktree` never symlinks it, so a worktree can't overwrite the main one's.
- `auth.config.ts` must accept Clerk session JWTs (`aud=convex`) and, from Phase 4,
  Clerk OAuth ID tokens; both resolve to the same `tokenIdentifier`.
- Codegen drift fails CI: commit `convex/_generated` changes with the code.
