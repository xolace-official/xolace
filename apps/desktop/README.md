# @xolace/desktop

The Tauri shell for the Xolace desktop app. It holds only `src-tauri/`; the UI is
the static export of `apps/web`.

## How it fits together

- `bun run dev:desktop` (from the repo root) runs `tauri dev` with `TAURI_BUILD=1`.
  Tauri starts `@xolace/web`'s dev server (`beforeDevCommand`) and opens
  `http://localhost:3001` in the webview.
- `bun run --filter @xolace/desktop build` runs `tauri build` with `TAURI_BUILD=1`.
  `beforeBuildCommand` runs `turbo run build --filter=@xolace/web` (so web's env
  codegen runs first); because `TAURI_BUILD` is set, `apps/web/next.config.ts`
  switches to `output: "export"` and writes `apps/web/out`, which `tauri.conf.json`
  uses as `frontendDist`.
- The bundle identifier is `com.xolaceincorg.xolace.desktop`.
- The version comes from `package.json` here (`"version": "../package.json"` in
  `tauri.conf.json`). `Cargo.toml`'s version is not the app version.

Building needs a Rust toolchain (see `rust-version` in `src-tauri/Cargo.toml`) and the
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

## Content Security Policy

`app.security.csp` in `tauri.conf.json` allows:

- the app's own assets (`'self'`, Tauri's `ipc:` / `asset:` protocols);
- Convex: `https://*.convex.cloud`, `wss://*.convex.cloud`;
- Clerk frontend API: `https://curious-kingfish-86.clerk.accounts.dev` (dev) and
  `https://clerk.xolaceinc.com` (prod), plus what Clerk's CSP guide lists:
  `img.clerk.com`, Cloudflare Turnstile (`challenges.cloudflare.com`) and
  `*.protect.clerk.com`.

No `'unsafe-eval'`. `script-src` has no `'unsafe-inline'` because Tauri adds a hash for
each inline script (Next's RSC payload) at build time. `style-src` has
`'unsafe-inline'` because Clerk injects CSS-in-JS at runtime; Tauri's style hashing is
turned off for that directive since a hash would make browsers ignore
`'unsafe-inline'`. `devCsp` is the dev-only variant that also allows the Next dev
server, HMR websocket and `'unsafe-eval'`.

## Updates

`tauri-plugin-updater` checks
`https://github.com/xolace-official/xolace/releases/latest/download/latest.json` on
launch (release builds only) and asks before installing. Updates must be signed with
the key whose public half is `plugins.updater.pubkey`.

Local builds have `bundle.createUpdaterArtifacts: false`, so they need no key. CI
enables it when the signing secret exists.

## Releasing

1. Bump `version` in `apps/desktop/package.json`; merge to `dev`/`main`.
2. Push the tag `desktop-v<version>` (maintainers only).
3. `.github/workflows/desktop-release.yml` checks the tag matches the version, builds
   macOS (universal), Windows and Linux, and attaches installers, updater bundles,
   `.sig` files and `latest.json` to a draft release.
4. Review the draft and publish it. Installed apps update once it is published and
   marked "Latest".

`workflow_dispatch` runs the same builds as a dry run and uploads them as workflow
artifacts instead.

### One-time setup

- Updater key: `bunx tauri signer generate -w ~/.tauri/xolace-desktop.key`. Put the
  public key in `plugins.updater.pubkey`; store the private key and its password as
  GitHub secrets `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
  Losing the private key means installed apps can't be updated.
- Web config: variables `NEXT_PUBLIC_CONVEX_URL` (prod) and
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (`pk_live_`) on the `desktop-release` environment.
- macOS signing (optional): `APPLE_CERTIFICATE` (base64 `.p12`),
  `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`; notarization: `APPLE_ID`,
  `APPLE_PASSWORD` (app-specific password), `APPLE_TEAM_ID`.
- Windows signing (optional): `WINDOWS_CERTIFICATE` (base64 `.pfx`),
  `WINDOWS_CERTIFICATE_PASSWORD`.

Without the optional secrets the workflow still produces unsigned installers.

## Not done yet

- Deep links (`xolace://`) and keychain storage come with desktop sign-in (Phase 4e).
- Rust crate naming (`app` / `app_lib` in `Cargo.toml`) is still the template's.
