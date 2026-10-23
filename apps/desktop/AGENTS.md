# @xolace/desktop

Tauri 2 shell only. It holds `src-tauri/` (Rust) and loads the static export of
`apps/web`. All UI work happens in `apps/web`. Details: `README.md` here.

## Commands

- Dev: `bun run dev:desktop` from the root (`tauri dev`, `TAURI_BUILD=1`; starts web's
  dev server and opens `http://localhost:3001`).
- Build: `bun run --filter @xolace/desktop build` (runs `turbo run build -F @xolace/web`
  with `TAURI_BUILD=1`, then bundles `apps/web/out`). Unsigned, no updater artifacts.
- Check Rust: `cargo check` in `src-tauri` (needs `apps/web/out` to exist; a stub
  `index.html` is enough).
- Release: bump `version` in `package.json`, merge, push tag `desktop-v<version>`.
  `.github/workflows/desktop-release.yml` builds macOS/Windows/Linux into a draft
  GitHub release; a maintainer publishes it. Agents never push release tags.
- Needs a Rust toolchain (`rust-version` in `src-tauri/Cargo.toml`) and the Tauri
  prerequisites. `src-tauri/target` is ignored.

## Boundaries

- No JS/TS source here. Web code that only makes sense on desktop is guarded in
  `apps/web` by `TAURI_BUILD` or a runtime Tauri check.
- Never bundles `apps/admin`.
- The app version lives only in `package.json` (`tauri.conf.json` reads
  `../package.json`). The release workflow fails if the tag doesn't match it.
- The bundle identifier `com.xolaceincorg.xolace.desktop` can't change after the first
  release (it keys app data, keychain entries and the updater).

## Gotchas

- `devUrl` is fixed at port 3001, so desktop dev ignores the per-worktree web port.
  Run desktop dev from one worktree at a time.
- CSP lives in `tauri.conf.json` (`app.security.csp`, plus a looser `devCsp` for
  `next dev`). A new external origin (API, image host, font CDN) must be added there
  or the webview blocks it. Tauri hashes inline `<script>`s at build time, so
  `script-src` has no `'unsafe-inline'`; style hashing is disabled
  (`dangerousDisableAssetCspModification: ["style-src"]`) because a hash would cancel
  the `'unsafe-inline'` that Clerk's runtime CSS needs.
- `bundle.createUpdaterArtifacts` is `false` in the repo so local builds work without
  the signing key; CI turns it on with `--config` when `TAURI_SIGNING_PRIVATE_KEY` is set.
- The updater reads `releases/latest/download/latest.json`. If another surface ever
  publishes a GitHub release marked "Latest", desktop updates stop resolving; keep
  desktop releases as the repo's "Latest" or move the endpoint.
- Sign-in uses OAuth + PKCE in the system browser, returning via a local port or the
  `xolace://` deep link; Rust keeps the refresh token in the keychain. Clerk's web
  components don't work in the webview (third-party cookies are blocked in prod), even
  if they appear to work against a Clerk dev instance.
- `TAURI_BUILD=1` web export currently fails ("Server Actions are not supported with
  static export"): `@clerk/nextjs`'s app-router `ClerkProvider` imports server actions.
  Fixed when web stops using Clerk web components under `TAURI_BUILD` (Phase 4e).
  Until then, test the shell with a stub `apps/web/out/index.html` and
  `tauri build --debug --config <file with "beforeBuildCommand": "">`.
- Not wired yet (Phase 4e): deep-link and keychain plugins.
