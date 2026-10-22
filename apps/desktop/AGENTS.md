# @xolace/desktop

Tauri 2 shell only. It holds `src-tauri/` (Rust) and loads the static export of
`apps/web`. All UI work happens in `apps/web`. Details: `README.md` here.

## Commands

- Dev: `bun run dev:desktop` from the root (`tauri dev`, `TAURI_BUILD=1`; starts web's
  dev server and opens `http://localhost:3001`).
- Build: `bun run --filter @xolace/desktop build` (builds web with `TAURI_BUILD=1`, then
  bundles `apps/web/out`).
- Needs a Rust toolchain (`rust-version` in `src-tauri/Cargo.toml`) and the Tauri
  prerequisites. `src-tauri/target` is ignored.

## Boundaries

- No JS/TS source here. Web code that only makes sense on desktop is guarded in
  `apps/web` by `TAURI_BUILD` or a runtime Tauri check.
- Never bundles `apps/admin`.

## Gotchas

- `devUrl` is fixed at port 3001, so desktop dev ignores the per-worktree web port.
  Run desktop dev from one worktree at a time.
- Sign-in uses OAuth + PKCE in the system browser, returning via a local port or the
  `xolace://` deep link; Rust keeps the refresh token in the keychain. Clerk's web
  components don't work in the webview (third-party cookies are blocked in prod), even
  if they appear to work against a Clerk dev instance.
- Still template defaults: CSP is `null`, no updater/deep-link/keychain plugins yet.
  Release pipeline (tag-triggered build + updater) comes in Phase 3.
