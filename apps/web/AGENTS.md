# @xolace/web

The user-facing Xolace web app (Next.js 16, App Router, React Compiler, typed routes,
Clerk via `@clerk/nextjs`, Convex). Two builds from one codebase:

- **Server build** on Vercel (default).
- **Static export** for desktop when `TAURI_BUILD=1` (`output: "export"` → `out/`).

## Commands

- Dev: `bun run dev:web` from the root (port 3001; in a worktree add
  `-- --port <web from .xolace/ports.json>`).
- Env types: `bun run codegen` (`varlock codegen` from `.env.schema` → `src/env.ts`).
- Check: `bun run check:changed` from the root.

## Boundaries

- May import: `@xolace/ui/*`, `@xolace/backend/api`, `@xolace/backend/dataModel`.
- Must not import: `api.admin.*`, anything admin-only, `apps/*`, server-only backend code.
- Shared UI that admin also needs goes in `packages/ui`, not here.

## Gotchas

- **Everything must also work as a static export.** Under `TAURI_BUILD` there are no
  server components with dynamic data, no route handlers, no middleware/`proxy.ts`, no
  Clerk server helpers. Desktop signs in with OAuth + PKCE, not Clerk web components.
  Test with `TAURI_BUILD=1 bun run build` when you touch routing, auth or data loading.
- Env: names in `.env.schema`, values in Vercel env. `NEXT_PUBLIC_*` is public.
- **This app's Vercel build deploys Convex**, the only place that does.
  `vercel.json` → `scripts/vercel-build.ts` → `convex deploy` (prod key on
  Production, optional preview key on Preview) → `turbo run build -F @xolace/web` with
  `NEXT_PUBLIC_CONVEX_URL` injected. A Preview without a key builds against its
  `NEXT_PUBLIC_CONVEX_URL` and deploys nothing. Setup: `docs/setup/vercel.md`.
  Don't run the script locally; it refuses off Vercel and under `TAURI_BUILD`. Local and desktop builds are a plain
  `bunx turbo run build -F @xolace/web`. A Production deploy also starts the mobile
  release (`.github/workflows/mobile-release.yml`). Topology:
  `packages/backend/AGENTS.md`.
- `.env` here may be a symlink to the main worktree; don't edit it in place.
- Next.js 16 differs from training data; read `node_modules/next/dist/docs/` before
  using an API you are unsure of.

## About the block below

`next dev` re-adds the managed block below whenever it runs under an AI agent and the
block is missing or stale (`next/dist/server/lib/generate-agent-files.js`). Keeping it
verbatim stops `next dev` from rewriting this file. Don't remove it; if a Next upgrade
changes it, commit the new block.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
