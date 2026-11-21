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
- Check: `bun run check:changed` from the root; `bun run check-types` here (incremental:
  a no-change rerun takes seconds; `rm -rf node_modules/.cache/tsc` forces a cold one).
- Tests: `bun run test` here. Live evals spend Anthropic credits and run only on
  request: `bun run test:evals` (or `:intensity` / `:talk` / `:letters`), with
  `ANTHROPIC_API_KEY` set.
- Never: `convex deploy`, `convex dev` against a shared/prod deployment,
  `convex env set` on prod. Only the release pipeline deploys Convex (below).

## Deploy topology

- **Only CI deploys Convex**, and agents never run either deploy:
  - push to `dev` → `.github/workflows/staging.yml` → **staging** (the Production
    deployment of the separate `xolace-staging` project), then an opt-in EAS OTA to
    the `preview` channel. Vercel Previews deploy on their own.
  - push to `main` → `.github/workflows/release.yml` → **prod**
    (`energetic-guineapig-283`), then the clients (EAS mobile release, Vercel deploy
    hooks for web and admin). The backend never waits on a client build.
  - PR labelled `preview-backend` → `.github/workflows/pr-preview.yml` → a Convex
    preview `pr-<n>` in `xolace-staging` (preview deploy key in GitHub env
    `preview`), deleted on unlabel or close.
- **Keys:** each `CONVEX_DEPLOY_KEY` is a secret of its GitHub environment
  (`production` / `staging`) and nowhere else: not Vercel, EAS or a local `.env`.
  Both are `prod:` keys; the workflows check the deployment name so neither can deploy
  the other's backend.
- **Web and admin** are plain builds reading `NEXT_PUBLIC_CONVEX_URL` from Vercel env
  (prod URL on Production, staging on Preview); both fail their build if
  `CONVEX_DEPLOY_KEY` is set. Desktop and local builds never deploy.
- Staging uses the Clerk dev instance, so test accounts work there. Setup:
  `docs/setup/staging.md`.
- Clients ship after the backend is live; the store-gap rule still applies to binaries
  already in users' hands. Setup: `docs/setup/release.md`.

## Public surface

- `@xolace/backend/api` (`convex/_generated/api`) and `@xolace/backend/dataModel`.
- `@xolace/backend/shared` (`convex/lib/shared.ts`): the limits, error codes and
  small pure helpers a client must agree with the server on. It has no runtime
  imports and reads no env (`lib/shared.test.ts` enforces this and snapshots the
  values). The owning server module imports from it and keeps its old name as an
  alias. A shipped binary keeps the value it was built with, so changing one is a
  store-gap change: say in the PR which way it may move.
- Refusals a client reacts to throw `ConvexError({ code, message })` with a code
  from `ERROR_CODES`; production replaces a plain `Error`'s message with
  "Server Error". Keep the old text in `message` for clients that still match on it.
- Temporary `@xolace/backend/convex/*` for the mobile move: `_generated` plus the
  client-safe modules listed in `apps/mobile/src/features/backend-imports.ts`. The
  mobile import-graph test fails on any other value import, and on any listed
  module that reaches server-only code at runtime (`"use node"`, `process.env`,
  `ai/providers`, `jobs`, the ElevenLabs ids in `lib/elevenLabsVoices.ts`).

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
- Telegram (`convex/outreach/telegram/`): `TELEGRAM_BOT_TOKEN` is per deployment and
  `outreach/telegram/bot:configureBot` is run by hand, never on deploy. Your worktree's
  dev deployment has no bot unless you make one. Runbook: `docs/setup/telegram.md`.
- Codegen drift fails CI: commit `convex/_generated` changes with the code.
- Quote backgrounds (`convex/quoteBackgrounds/`, B18) are a catalogue per deployment:
  until `bun run quote-backgrounds:upload` has run there, `catalogue.list` is empty and
  the app shows only what it draws in code. The art goes through
  `quote-backgrounds:process` first; both scripts' headers say how.
- The daily quote push (`convex/dailyQuotes/push.ts`, B19) is swept every 15 minutes
  from `daily_quote_pushes`, one row per person who has it on, keyed by the next
  local slot. Change `notifications.dailyQuote` or the time zone only through
  `updateNotificationPrefs`, which keeps that row in step.
- Explore's "For the hour" (`browse/explore.getForHour`, B6) reads `audio_tracks.bestAt`
  (dawn/day/evening/late). Set it in the Kindling manifest or with
  `browse/explore:setBestAt`; there is no admin screen. Until three tracks carry a
  phase, the shelf fills from the New pool.
