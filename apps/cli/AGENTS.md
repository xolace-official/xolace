# @xolace/cli

Terminal client (`xolace`) built with OpenTUI (`@opentui/react`) on Bun. Currently the
`create-tui` template; `xolace login` and reactive Convex views come in Phase 4d.

## Commands

- Dev: `bun run dev:cli` from the root (`bun run --watch src/index.tsx`).
- Check: `bun run check:changed` from the root; `bun run check-types` here.

## Boundaries

- May import: `@xolace/backend/api`, `@xolace/backend/dataModel` (when wired).
- Must not import: `@xolace/ui` (DOM components), other apps, `api.admin.*`.
- Runtime is Bun, not Node or a browser: no DOM, no Next/Expo APIs.

## Gotchas

- JSX intrinsics are OpenTUI elements (`<box>`, `<text>`, `<ascii-font>`), not HTML;
  Biome's `noUnknownAttribute` is off here for that reason.
- Planned auth: `xolace login` opens the web app's `/connect` page → Clerk OAuth +
  PKCE → local-port redirect. The refresh token lives in the OS keychain
  (`@napi-rs/keyring`), falling back to a `0600` file. Never print or log tokens.
- Env: varlock (D4). Keep a `.env.example` with names only.
