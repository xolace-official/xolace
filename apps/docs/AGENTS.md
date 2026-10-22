# @xolace/docs

Documentation site on fumadocs (Next.js 16). Content is MDX under `content/docs/`.

## Commands

- Dev: `bun run dev:docs` from the root (port 4000; in a worktree add
  `-- --port <docs from .xolace/ports.json>`).
- Regenerate the content index: `bun run codegen` (`fumadocs-mdx` → `.source/`).
- Check: `bun run check:changed` from the root (`.mdx` here is *not* inert: it compiles).

## Boundaries

- Standalone: no imports from other apps, `@xolace/backend` or `@xolace/ui`.
- Uses the root `biome.json` and `@xolace/config` tsconfig; don't add nested configs.

## Gotchas

- `.source/` is generated; don't edit or commit it.
- Docs describe shipped behavior. When a PR changes something user-visible or a setup
  step, update the page in the same PR ("Hit every surface" in the root AGENTS.md).
- The managed block below is re-added by `next dev` if missing; keep it verbatim.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
