# @xolace/cli

Terminal client (`xolace`) built with OpenTUI (`@opentui/react`) on Bun. Signs in with
Clerk OAuth and talks to Convex with the resulting ID token (Phase 4d).

## Commands

- Dev: `bun run dev:cli` from the root (`bun run --watch src/index.tsx`).
- Run a command: `bun run start login|logout|whoami` here; no argument opens the TUI.
- Test: `bun run test` here (`src/` only; `spikes/` need a live backend).
- Check: `bun run check:changed` from the root; `bun run check-types` here.

## Layout

- `src/auth/`: `oauth.ts` (PKCE, refresh, device grant), `loopback.ts` (redirect
  catcher), `token-store.ts` (keychain, else `0600` file), `session.ts` (the
  `fetchToken` Convex calls).
- `src/commands/`: `login`, `whoami`, and `me.ts` (`getMe` + error codes).
- `src/tui/`: the OpenTUI app. Keep views pure (`HomeView`) so tests render them
  without a backend.

## Boundaries

- May import: `@xolace/backend/api`, `@xolace/backend/dataModel`.
- Must not import: `@xolace/ui` (DOM components), other apps, `api.admin.*` (OAuth
  tokens have no `role` claim anyway).
- Runtime is Bun, not Node or a browser: no DOM, no Next/Expo APIs.

## Gotchas

- JSX intrinsics are OpenTUI elements (`<box>`, `<text>`, `<ascii-font>`), not HTML;
  Biome's `noUnknownAttribute` is off here for that reason.
- `ConvexProvider` must be re-typed as a plain function component (see `tui/app.tsx`):
  OpenTUI's JSX namespace rejects `React.FC`.
- Clerk rotates the refresh token on every refresh. Always go through
  `session.getIdToken` / `fetchToken`, which save the new one and share one refresh
  between concurrent callers. Never refresh by hand.
- Never print or log tokens.
- `tsconfig.json` has `noUncheckedIndexedAccess` off: `@xolace/backend/api` brings the
  backend's sources into this program and they don't compile with it.
- In `bun:test`, `expect(promise).rejects` waits on the promise right away; when the
  test must act before the promise settles, `.catch` it first and assert later.
- Env: `.env.example` lists the `XOLACE_*` names (all public values). Varlock (D4) and
  built-in prod defaults come with distribution.
