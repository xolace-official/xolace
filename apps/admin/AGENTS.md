# @xolace/admin

Internal Xolace dashboard (Next.js 16, Clerk, Convex): content ingestion, moderation
and feedback queues, user support, ops views. Own Vercel project and domain. Never
bundled into the user web app or desktop.

## Commands

- Dev: `bun run dev:admin` from the root (port 3002; in a worktree add
  `-- --port <admin from .xolace/ports.json>`).
- Env types: `bun run codegen` (`varlock codegen` → `src/env.ts`).
- Check: `bun run check:changed` from the root.

## Boundaries

- May import: `@xolace/ui/*`, `@xolace/backend/api` (including `api.admin.*`),
  `@xolace/backend/dataModel`.
- Must not import: `apps/*`. Nothing in `apps/web`, `apps/mobile` or `apps/cli` may
  import from here.

## Security model

- **Convex is the security boundary, not this UI.** Every admin capability is a
  function in `packages/backend/convex/admin/*` built with `adminQuery` /
  `adminMutation` / `adminAction`, which reject tokens without `role: "admin"`.
- The middleware/proxy check on `role` only hides pages. Never rely on it alone, and
  never call a non-admin function and filter the result client-side instead.
- Same Clerk instance as web; admin = `publicMetadata.role === "admin"`, copied into
  a `role` claim by the customized session token (Clerk Dashboard → Sessions;
  Convex gets that token, there is no JWT template).
- Staff sign in at `/sign-in` with work email + password; a new device also asks
  for an email code (Device Trust). There is no sign-up. The route-group layouts
  (`src/features/auth/guards.ts`) send signed-out visitors to `/sign-in` and
  non-admins to `/no-access`; `src/proxy.ts` only runs Clerk's session handling
  (Clerk deprecated path matching in middleware).
- Grant or revoke access with `bun run grant-admin <email> [--name "First Last"]
  [--revoke]` (creates the Clerk account if missing; asks for the password without
  echoing it). It uses this app's `CLERK_SECRET_KEY`, so dev keys hit the dev
  instance; live keys ask for confirmation. No Convex user row is needed.

## Gotchas

- Admin never deploys Convex; it reads `NEXT_PUBLIC_CONVEX_URL` from this project's
  Vercel env. `vercel.json` runs a plain `turbo run build -F @xolace/admin` and turns
  off Vercel's Git deploys of `main`; Production comes from the release workflow's
  deploy hook. `next.config.ts` fails the build if `CONVEX_DEPLOY_KEY` is set.
  Topology: `packages/backend/AGENTS.md`.
- Content ingestion uploads straight from the browser to storage, then one upsert
  mutation keyed by `slug` + `contentHash`; unchanged items are no-ops. Don't
  reintroduce "re-upload everything" flows.
- Next.js 16 differs from training data; read `node_modules/next/dist/docs/` first.
- The managed block below is re-added by `next dev` if missing; keep it verbatim.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
