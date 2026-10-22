# @xolace/ui

Web-only shadcn components (Base UI + Tailwind v4) shared by `apps/web` and
`apps/admin`. Mobile has its own UI (HeroUI Native) and never imports this.

## Commands

- Add a shadcn component: run `bunx shadcn add <name>` here (uses `components.json`).
- Check: `bun run check:changed` from the root; `bun run check-types` here.

## Exports

- `@xolace/ui/components/*` → `src/components/*.tsx`
- `@xolace/ui/hooks/*` → `src/hooks/*.ts`
- `@xolace/ui/lib/*` → `src/lib/*.ts`
- `@xolace/ui/globals.css`, `@xolace/ui/postcss.config`

Deep imports only; no barrel `index.ts`.

## Boundaries

- No imports from apps, `@xolace/backend` or Convex. Components take data via props.
- `react` / `react-dom` are **peer** dependencies (dev deps for typecheck) so the app
  supplies the single React copy. Keep it that way for anything React-coupled.
- Must render in a static export (desktop): no server-only APIs, no Next server
  imports.

## Gotchas

- Something used by only one app belongs in that app. Move it here when the second
  app needs it.
- Theme tokens live in `src/styles/globals.css`; don't hard-code colors in components.
