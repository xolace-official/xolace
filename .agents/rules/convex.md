# Convex

One Convex backend (`packages/backend/convex`) serves mobile, web, admin, desktop and
the CLI. Package-level commands and the store-gap rule: `packages/backend/AGENTS.md`.

## Deployments

| Deployment | Who touches it |
|---|---|
| prod | release pipeline only (`convex deploy` from the web build). Never by hand, never by an agent |
| preview | Vercel preview builds via deploy key |
| dev (one per worktree) | you, through `convex dev` in your worktree |
| e2e | E2E runs only; test-only functions refuse to run unless `E2E_ENABLED=1` |

Never share a dev deployment between worktrees: two `convex dev` processes overwrite
each other's functions. Never run `convex env set` / `convex import` / `convex run`
against prod.

## Functions

- Object syntax with validators on every `args` **and** `returns`
  (`returns: v.null()` when nothing comes back).
- `query` / `mutation` / `action` only for what clients call; everything else is
  `internalQuery` / `internalMutation` / `internalAction`, referenced via `internal.*`.
- Domain folders: `convex/<feature>/<fn>.ts`, tests beside them. File names are
  camelCase or kebab-case (Biome enforces it).
- Actions don't touch `ctx.db`; they call internal queries/mutations. Put `"use node"`
  only in files that need Node APIs, and never import those from client code.
- Keep each mutation's transaction small; batch large work with the scheduler.

## Data access

- Read with `.withIndex("by_x", (q) => q.eq(...))`. Don't `.filter()` a table scan;
  add an index to `schema.ts` instead. `.collect()` only on bounded results;
  paginate or `.take(n)` otherwise.
- Schema changes are additive. Existing documents must always validate. New fields
  start optional; backfill with a migration before tightening.

## Auth

- Users are keyed by `identity.tokenIdentifier` (`iss|sub`, `by_token` index). Every
  client must present Clerk-issued tokens or the same person becomes a new user.
- Resolve the caller with the shared helper (`requireAuth()` in `convex/lib/auth.ts`),
  never by trusting a `userId` argument. Check ownership on every document you read or
  write on a user's behalf.
- Admin: functions in `convex/admin/*` only, built with `adminQuery` /
  `adminMutation` / `adminAction` (they check the `role` claim and throw). `apps/web`,
  `apps/mobile` and `apps/cli` must not import `api.admin.*`.

## Client imports

- Clients import `@xolace/backend/api` and `@xolace/backend/dataModel`.
- `@xolace/backend/convex/*` is a temporary bridge for the mobile move; only
  `_generated` and allowlisted client-safe `lib/*` modules. Never `"use node"` files,
  `ai/providers` or `jobs`.

## AI

All model calls live under `convex/ai/`. Features take the session's Understanding and
Memory as input instead of calling a model to re-derive them. Changes under
`convex/ai/**` trigger the live eval gates in CI.

## Tests

`convex-test` on the edge-runtime vitest environment, beside the code. Security suite
expectations: one user can't read/modify another's data (`withIdentity`), anonymous
HTTP calls get 401, `api.admin.*` rejects non-admins, quota/idempotent mutations
survive concurrent calls (`Promise.allSettled`).
