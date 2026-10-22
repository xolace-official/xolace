# @xolace/desktop

The Tauri shell for the Xolace desktop app. It holds only `src-tauri/`; the UI is
the static export of `apps/web`.

## How it fits together

- `bun run dev:desktop` (from the repo root) runs `tauri dev` with `TAURI_BUILD=1`.
  Tauri starts `@xolace/web`'s dev server (`beforeDevCommand`) and opens
  `http://localhost:3001` in the webview.
- `bun run --filter @xolace/desktop build` runs `tauri build` with `TAURI_BUILD=1`.
  `beforeBuildCommand` builds `@xolace/web`; because `TAURI_BUILD` is set,
  `apps/web/next.config.ts` switches to `output: "export"` and writes `apps/web/out`,
  which `tauri.conf.json` uses as `frontendDist`.
- The bundle identifier is `com.xolaceincorg.xolace.desktop`.

Building needs a Rust toolchain (see `rust-version` in `src-tauri/Cargo.toml`) and the
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

## Not done yet

These are planned for the desktop workstream and are intentionally left at the
template defaults for now:

- Content Security Policy: `app.security.csp` is still `null`.
- Plugins: only `tauri-plugin-log` is wired. Updater, deep links (`xolace://`) and
  keychain storage come with the desktop sign-in work.
- Rust crate naming (`app` / `app_lib` in `Cargo.toml`) is still the template's.
