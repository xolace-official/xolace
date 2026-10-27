# Xolace Workspace: Structure & Migration Plan

**Status:** Decisions agreed 2026-10-21 · updated 2026-10-27: Phases 1–3 done, Phase 4 has admin v1 (4f), the auth spikes (4a) and the backend auth (4b) done, the CLI (4d) in progress and 4c and 4e not started, Phase 5 not started. Each phase below carries its own status.

The goal is one repository holding the mobile app, the user web app (which also becomes the desktop app), an admin dashboard and a TUI/CLI, all running on one Convex backend. Many people and agents should be able to work in it at the same time without stepping on each other.

`xolace_workspace` is a **Better-T-Stack template scaffold** (`bts.jsonc`, `create-better-t-stack@3.47`). We take its tooling choices (bun workspaces, Turborepo, Biome/Ultracite, husky, Convex + Clerk wiring, Tauri, OpenTUI, fumadocs). We do not treat its placeholder code as something to keep. Repo layout and conventions come from the reference repos, not from the template.

This plan is based on these research reports:
- t3code and rakazo: monorepo structure
- companion and convex-credits: Convex and Expo inside a monorepo
- clarity and amber: E2E testing and CI (see §5)
- a full audit of `xolace_app`
- sign-in for every client against one Convex + Clerk backend

---

## 1. Decisions (agreed 2026-10-21)

| # | Decision | Agreed |
|---|---|---|
| D1 | **Which repo keeps its git history** | **`xolace_app`'s git history continues; the result lives in a new, clean folder.** We make a fresh clone of `xolace_app` into a new folder (e.g. `repos/xolace`), so none of the old untracked clutter comes along (316 MB `.claude/worktrees`, caches, local skills). On a migration branch, we move its files into the new layout and delete the bloat (skills and agent folders, docs, reference, research), then add the workspace tooling on top. The files that exist after migration are only what we choose. Old commits still contain the deleted files, but agents only read the current files, so they add nothing to context. After it lands, rename the GitHub repo `xolace_app` → `xolace`; GitHub redirects the old URL. `xolace_workspace` is retired once its tooling has been moved over. |
| D2 | **Package install layout** | **Bun's isolated linker** (Expo-supported from SDK 54). Fall back to hoisted only if the Phase 1F spike finds a library that breaks. Expo does not allow two copies of React, React Native or an Expo module in one app. We prevent that with one React version in the catalog plus `peerDependencies` in shared packages, not with Metro workarounds. |
| D3 | **Folder and package names** | `apps/mobile`, `apps/web`, `apps/admin`, `apps/desktop`, `apps/cli`, `apps/docs`; package scope `@xolace/*`. |
| D4 | **Env and secrets** | **Mobile:** EAS env. **Backend:** Convex env. **Web and admin:** Vercel env. **CLI:** varlock. Each app gets a `.env.example` listing variable names only. Varlock codegen is removed from the root `postinstall`. |
| D5 | **Formatting** | One commit that only runs `ultracite fix`, listed in `.git-blame-ignore-revs`. Biome overrides for React Native. A tiny ESLint config only for `packages/backend/convex`, to keep the Convex lint plugin. |
| D6 | **Web, admin, desktop** | **Two separate Next.js apps.** `apps/web` is the user-facing Xolace web app, and it is the only one that becomes desktop. `apps/admin` is the internal dashboard, deployed separately and never bundled into the user app or desktop. `apps/desktop` holds only the Tauri shell and loads the static build of `apps/web` (`TAURI_BUILD=1`), so Rust and desktop release work has its own owner and CI path. `apps/web` runs as a server build on Vercel. See §3a for the admin design. |
| D7 | **Freeze** | You finish `feat(🎀)/support-binding-upgrade` and merge it into `dev`. Then we freeze `xolace_app` and start Phase 2 from `dev`. |
| D8 | **Leftovers** | `theme.css` and `panelui*.json`: exclude. `CHANGELOG.md` and `VERSION`: keep, under `apps/mobile/`. `.gstack/`: exclude. `CLAUDE.md`: its conventions are pulled into the new `AGENTS.md` files for your review. |
| D9 | **Skills and agent context** | Start with **no third-party skills checked in**. The 25 template-installed skills in `.agents/skills` are dropped. We add a skill back only when a task needs it, and record it in `skills-lock.json`. Repo-specific skills (e.g. `test-mobile`, `pr-watch`) are written small, on purpose. This only controls skills in the repo. Your user-level plugins and skills load in every session no matter what the repo contains, so pruning those is a separate cleanup on your machine. |

**Excluded as you asked, and confirmed by the audit:**
- Agent and skills folders: `.agents/`, `.claude/`, `.windsurf/`, `.junie/`, `.trae/`, `.gemini/`, `.posthog/skills/`, `agent/` and `skills-lock.json`
- `docs/`, `reference/`, `research/`
- The loose planning markdown files

**Secret files.** The audit checked `xolace-app-firebase-adminsdk-*.json`, `xolace-7e7265d6b904.json`, `google-services.json` and `google-services-preview/`. None are tracked by git or appear anywhere in its history. Two configs still read them by path:
- `app.config.ts` loads the `google-services` files.
- `eas.json` points `serviceAccountKeyPath` at the service-account file.

They'll go into gitignored paths under `apps/mobile/`, or better, become EAS file env vars. The workspace `.gitignore` will get the app's ignore rules for these files.

---

## 2. Target structure

```
xolace/                                  (fresh clone of xolace_app, history kept; GitHub repo renamed)
├─ AGENTS.md                             repo map · surfaces checklist · how to verify · ways to break things
├─ CLAUDE.md                             one line: @AGENTS.md
├─ CONTRIBUTING.md  SECURITY.md  VISION.md (product rules that must always hold)
├─ .agents/rules/*.md                    short topic rules (convex, expo-metro, testing, env, release)
├─ .agents/skills/                       repo skills (test-mobile, test-web, pr-watch …); .claude/skills symlinks here
├─ .github/
│  ├─ workflows/  ci.yml · release.yml · staging.yml · pr-preview.yml · mobile-fingerprint.yml · desktop-release.yml
│  │              intensity-gate.yml · talk-gate.yml · security-audit.yml · pr-title.yml
│  ├─ CODEOWNERS (repo-relative paths) · pull_request_template.md · ISSUE_TEMPLATE/*.yml
│  └─ actions/setup/ (bun pin + cache)
├─ package.json  (bun workspaces, catalog, patchedDependencies, trustedDependencies)
├─ bunfig.toml (isolated linker) · turbo.json · biome.json (single root) · .git-blame-ignore-revs
├─ patches/                              uniwind, masked-view
├─ scripts/                              check-changed.ts · setup-worktree.ts · check-generated.ts
├─ apps/
│  ├─ mobile/     Expo app moved from xolace_app (src/, assets/, modules/, metro-stubs/,
│  │              app.config.ts, eas.json, metro.config.js, .argent/flows/, vitest.config.ts, AGENTS.md)
│  ├─ web/        user-facing Xolace web app, Next.js (server build on Vercel; static build for desktop) + e2e/
│  ├─ admin/      internal dashboard, Next.js (own Vercel project and domain; content, moderation, ops views) + e2e/
│  ├─ desktop/    Tauri shell only (src-tauri/, loads apps/web's static build; updater, deep links, keychain)
│  ├─ cli/        OpenTUI + Convex client + `xolace login` (renamed from apps/tui)
│  └─ docs/       fumadocs (renamed from apps/fumadocs; uses the root biome/tsconfig)
└─ packages/
   ├─ backend/    convex/ moved from xolace_app (including _generated), scripts/ (kindling, library, stream),
   │              vitest.config.ts (edge-runtime, evals, coverage), AGENTS.md
   ├─ ui/         web-only shadcn shared by web + admin (react as a peer dependency)
   └─ config/     tsconfig.{base,expo,next,convex,bun}.json
```

**Not created yet, on purpose:**
- **`packages/shared`** (or `domain`). It would hold pure constants and types such as specialties, voices, timeOfDay, conversationGating, milestones and audioTags. Mobile already imports these from `convex/lib` in about 30 places. We create this package when a second client (web or TUI) first needs one of them, and not before. A package with only one user is a split we'd be guessing at.
- **`packages/convex-hooks`**. This waits until web actually shares a hook with mobile.
- **`packages/ui-native`**. heroui-native stays inside `apps/mobile`.

### How `packages/backend` exposes code

The backend is the most important package to keep tidy, so it gets a small, explicit set of public entry points:

```jsonc
// packages/backend/package.json
"exports": {
  "./api":        "./convex/_generated/api.js",      // every client imports this
  "./dataModel":  "./convex/_generated/dataModel.d.ts",
  "./convex/*":   "./convex/*"                       // temporary: lets mobile's ~241 `@/convex/*` imports keep working
}
```

The plan for `./convex/*`:
- It exists only so the move is mechanical. A codemod rewrites `@/convex/` → `@xolace/backend/convex/`.
- A Biome `noRestrictedImports` rule then allows only `_generated` and an allowlist of client-safe `lib/*` modules.
- That allowlist is the exact list of modules that later becomes `packages/shared`.
- Server-only code (anything using `"use node"`, `ai/providers`, or `jobs`) is never on the allowlist.

---

## 3. Auth: one backend, five clients

**The constraint.** Users are keyed by `identity.tokenIdentifier` (`by_token` index; `tokenIdentifier` is `iss|sub`). If a client's token has a different issuer, the same person becomes a new user. So every client must use tokens issued by Clerk.

| Client | How it signs in | Token sent to Convex |
|---|---|---|
| Mobile | `@clerk/expo` + `ConvexProviderWithClerk`. Keep the existing `useResilientClerkAuth`, `AuthSyncGuard` and `AccountBootstrapBoundary`. | Clerk session JWT, `aud=convex` |
| Web | `@clerk/nextjs` + `clerkMiddleware`, server build on Vercel | Clerk session JWT, `aud=convex` |
| Admin | Same as web, same Clerk instance. Staff sign in with work email + password (no sign-up). Access requires `role: "admin"` in Clerk `publicMetadata`, which the customized session token copies into a `role` claim. The admin layout also blocks non-admins, but that only affects the UI; Convex is the actual security check (see §3a). | Clerk session JWT, `aud=convex`, with a `role` claim |
| TUI/CLI | `xolace login` opens the browser to the web app's `/connect` page. That page signs the user in, sends them to Clerk's `/oauth/authorize` (PKCE), and Clerk redirects back to a local port on the machine (the t3code pattern). The refresh token is stored in the OS keychain (`@napi-rs/keyring`), falling back to a 0600 file. | Clerk OAuth **ID token**, `aud=<oauth client id>` |
| Desktop (Tauri) | Same OAuth + PKCE flow as the CLI, in the system browser. It returns through a local port or the `xolace://` deep link, and Rust stores the refresh token in the keychain. The webview uses `ConvexProviderWithAuth`. Clerk's normal web components are not used there. | Same as the CLI |

**Backend change.** Add a second provider to `auth.config.ts`: same Clerk domain, `applicationID` = the OAuth client ID. The issuer and user ID are the same as on web and mobile, so it resolves to the same `tokenIdentifier`.

**Where the seam is.** Each client has its own small `fetchToken({ forceRefreshToken })` adapter, and everything above it is shared Convex code. There are four real adapters, so this split is earned.

**Why not Clerk's web SDK inside Tauri:**
- Production Clerk keeps the session in cookies on its own domain. From a `tauri://` page those cookies count as third-party, and WKWebView blocks them.
- Google refuses OAuth inside embedded webviews.
- This fails in production even if it seems to work against a Clerk development instance.

**Spikes to run before building any of this** (Phase 4a, each about half a day):
1. Decode a Clerk OAuth `id_token`. Confirm that `iss` exactly matches `CLERK_JWT_ISSUER_DOMAIN` and that `sub` is the Clerk user ID. Then confirm the `tokenIdentifier` Convex derives matches the web app's for the same user.
2. Confirm `grant_type=refresh_token` returns a fresh `id_token`.
3. Confirm Clerk accepts a local redirect URI on any port.
4. Find out whether the device-code flow (RFC 8628) is GA or beta on our plan. It's the nicer experience over SSH.
5. Confirm `convex/react` hooks work under the `@opentui/react` renderer on Bun.
6. Confirm `@napi-rs/keyring` works under Bun.

**Results (2026-10-27, Bun 1.3.14, macOS):** all six pass. Spikes 1–4 ran `apps/cli/spikes/oauth.ts` (prints claims, never tokens) against the Clerk **development** instance, OAuth app `Xolace CLI (spike)`: public client (PKCE, no secret), scopes `openid profile email offline_access`, consent screen and device authorization grant on, redirect URI `http://127.0.0.1:53682/callback` (+ `localhost`). Each token was also checked by a throwaway local Convex backend whose `auth.config.ts` had the 4b shape (same Clerk domain, `applicationID` = the client ID).
- **1 ✅** The `id_token` has `iss` = `https://curious-kingfish-86.clerk.accounts.dev` (the apps' Clerk dev domain), `sub` = the Clerk user ID, `aud` = `[<client id>]`, lifetime 24 h. Convex accepted it and derived `tokenIdentifier` = `<iss>|user_…`, the same `iss|sub` the session JWT gives web and mobile, so a CLI sign-in is the same user. It carries no `role` claim (that comes from the customized session token), so admin functions never work over OAuth, as intended.
- **2 ✅** `grant_type=refresh_token` with only `client_id` (auth method `none`) returns a new `id_token` that Convex accepts. The refresh token **rotates** on every use: the CLI and desktop must store the new one after each refresh.
- **3 ✅** A sign-in on unregistered port 53999 succeeded with only port 53682 registered: Clerk ignores the port on loopback redirects (RFC 8252 §7.3), so the CLI can bind any free port. A redirect URI that isn't registered at all fails after sign-in with `invalid_request` ("does not match any of the OAuth 2.0 Client's pre-registered redirect urls"), not before.
- **4 ✅** Device authorization (RFC 8628) is offered: it's in discovery (`device_authorization_endpoint`, grant `urn:ietf:params:oauth:grant-type:device_code`), is a per-app toggle in the dashboard with no beta label, and a full run returned an `id_token` Convex resolves to the same `tokenIdentifier`. Codes last 10 minutes; the verification page is `https://<frontend api>/device`. Use it for `xolace login` over SSH or when no browser can open. Not yet checked on the production instance.
- **5 ✅** `ConvexProvider` + `useQuery` + `useMutation` render under `@opentui/react` 0.6.6: a query renders, a mutation from inside the tree re-renders it, and a write from another client reaches it (`apps/cli/spikes/convex-react.test.tsx`, run against a local anonymous Convex backend with `SPIKE_CONVEX_URL`; skipped without one). Two things for 4d:
  - **Types:** OpenTUI's JSX namespace has no `ElementType`, so TS rejects any `React.FC`-typed component, `ConvexProvider` included ("cannot be used as a JSX component"). Runtime is fine; re-type it once as a plain function component.
  - **Tests:** `testRender` turns on React's act environment and its `waitForFrame` counts render passes, not time. Tests that wait on the network poll on a clock with the pause inside `act()`.
- **6 ✅** `@napi-rs/keyring` 2.1.2 writes, reads and deletes a keychain entry under Bun (`apps/cli/spikes/keyring.ts`). macOS only so far; Linux (Secret Service, often missing on servers and over SSH) and Windows are untested, which is why the `0600` file fallback stays.
- The CLI tsconfig now lists `"types": ["bun"]`: TypeScript 6 loads no `@types` packages unless listed, so `bun:test` and `process` didn't resolve.

### 3a. Admin dashboard and content pipeline

**Why a separate app.** Admin-only code, admin dependencies and admin routes never reach the user bundle or the desktop app. Admin gets its own deploy, its own domain, and its own entry in CODEOWNERS. It shares `packages/ui` with web, which means `packages/ui` now has two real users and is worth having as a package.

**Authorization lives in Convex, not the UI.**
- Every admin function sits in `packages/backend/convex/admin/*`.
- Each is built with `adminQuery`, `adminMutation` and `adminAction`. These are custom function builders that check the `role` claim and throw if it's missing.
- A Biome rule stops `apps/web`, `apps/mobile` and `apps/cli` from importing `api.admin.*`.
- The existing `convex/admin.ts` is folded into this (now `convex/admin/xolacers.ts`).

**Content ingestion replaces the scripts that re-upload everything.** Today `scripts/kindling` and `scripts/library` push the whole manifest every run. The new design is one deep module, `content.ingest`, with a small interface:
- **Upload.** Admin requests an upload URL and the file goes straight from the browser to R2 (`@convex-dev/r2`, already a dependency) or Convex storage.
- **Upsert.** One mutation upserts a content item, keyed by a stable `slug` plus a `contentHash`. If the hash hasn't changed, nothing happens. Only new or changed items are processed.
- **Processing.** Transcoding, metadata, embeddings and RAG indexing run as a Convex workflow (`@convex-dev/workflow`, already a dependency). Admin shows each item's status: queued, processing, live or failed, with retry.
- **Bulk import.** Upload a manifest, see a diff against what's live, and apply only the changes.
- **Scripts.** The old scripts become thin callers of the same mutations for CI and bulk jobs, so the admin and the scripts can't drift apart.

**Other admin views, later:** user lookup and support, moderation and feedback queues (`feedback`, `productFeedback`, `escalation`), feature flags and dev overrides, cron and job health. Each is a separate small PR.

**Billing gap.** RevenueCat entitlements are tied to the app stores, so web and desktop need a separate decision: RevenueCat Web Billing or Stripe. This doesn't block the migration.

---

## 4. Phases

### Phase 1: Foundation, staged in `xolace_workspace` before any app code moves

`xolace_workspace` is the staging area for the tooling. Its output gets copied onto the migration branch in Phase 2, commit B. Several agents can work in parallel because the workstreams touch different files. The Expo spike (1F) starts first, because Phase 2 depends on it.

| Stream | Work | Done when |
|---|---|---|
| **1A Tooling** | Pin bun. Put React (one version: 19.3.0), TS, vitest, convex-test, `ai` and Next in the catalog. Make React a peer dependency in shared packages. Remove `lint-staged` from `.husky/pre-commit` (it's broken today). Turn on Biome `vcs.useIgnoreFile`. (Already done: the nested fumadocs `biome.json` has been removed.) Drop the 25 template skills (D9). Rename the apps as in D3. Move `src-tauri` into `apps/desktop`. Scaffold `apps/admin`. Ignore `ios/`, `android/` and `src-tauri/target`. Standardise script names across packages: `dev`, `build`, `check-types`, `test`, `lint`, `codegen`. Fix the turbo config: replace `globalDependencies: [".env*"]` with per-task `inputs` and `env`, add `test` and `codegen` tasks, turn on the remote cache. | `bun install --frozen-lockfile && turbo run check-types lint test` passes on a clean clone |
| **1B CI** | `ci.yml` with these parts:<br>• affected-only runs via `turbo --affected`, falling back to running everything when unsure<br>• one aggregate required check<br>• `concurrency` cancel and least-privilege permissions<br>• actions pinned by SHA<br>• a codegen-drift check (`convex codegen` followed by `git diff --exit-code`)<br>• `bun audit` and semantic PR titles | A test PR goes green; a docs-only PR skips build and test |
| **1C Collaboration** | CODEOWNERS (repo-relative paths), PR template (Problem / Change / Verification / Model and harness), issue templates, CONTRIBUTING with a table of which tests to run when, Conventional Commits, `VISION.md` | Files reviewed by you |
| **1D Agent experience** | Root `AGENTS.md`:<br>• repo map<br>• "Hit every surface" checklist: mobile, web, desktop, TUI, Convex contract, docs<br>• "Ways to hurt yourself": never deploy to the prod Convex, never run repo-wide checks while iterating, never commit secrets<br>• a Verifying section<br><br>Also:<br>• `.agents/rules/*`<br>• per-package `AGENTS.md`<br>• `CLAUDE.md` = `@AGENTS.md`<br>• `scripts/check-changed.ts`: checks only the files changed since main, using the same mapping as CI<br>• `scripts/setup-worktree.ts`: links `.env` files, assigns ports per worktree, gives each worktree its own Convex dev deployment, writes setup marker files | An agent in a fresh worktree can run `bun run check:changed` without further setup |
| **1E Backend package** | Set up `exports`, `"type": "module"`, `convex.json`, a vitest config with edge-runtime and convex-test, a `test:local` guard copied from convex-credits, and an explicit env check in `auth.config.ts` instead of `!`. Delete the placeholder backend (agent, chat, privateData, healthCheck), which gets replaced in Phase 2. | `turbo run test -F @xolace/backend` passes |
| **1F Spike: Expo in the monorepo** | Using the isolated linker, put the **real** dependency set from `xolace_app/package.json` into `apps/mobile`. Run `expo-doctor`, `expo prebuild`, and build a dev client on iOS and Android. Run `expo install --check`, and confirm there's only one copy each of react, react-native and expo-modules-core in the app. Check that config plugins resolve, that `buildFromSource expo-image-manipulator` works, and that patches apply from the root. Check the monorepo `.easignore` and an EAS dev build from the subdirectory. | Dev client boots on the simulator; one EAS build succeeds. **This gates Phase 2.** |

### Phase 2: The move (one agent, run sequentially, checked by me)

Run it in a fresh clone of `xolace_app` (e.g. `repos/xolace`), on a `migration/monorepo` branch cut from `dev` after the freeze (D7).

1. **Commit A: moves only, no edits.**
   - `git mv src assets modules metro-stubs app.config.ts eas.json metro.config.js tsconfig.json vitest.setup.ts .argent/flows → apps/mobile/`
   - `git mv convex → packages/backend/convex`
   - `git mv scripts/{kindling,library} → packages/backend/scripts/`
   - `git rm` these:
     - the 3 tracked `.argent/recordings/*.mp4`
     - `lint-output.txt`, `sampleData.jsonl`, `reset-project.js`, `.expo-shared/`
     - the example/extras demo code, `theme.css`, `panelui*.json`, `.gstack/`
     - **all the excluded bloat:** `.agents/`, `.claude/`, `.windsurf/`, `.junie/`, `.trae/`, `.agent/`, `.gemini/`, `.posthog/skills/`, `agent/`, `skills-lock.json`, `docs/`, `reference/`, `research/`, and the loose planning markdown files.
   - Move `CHANGELOG.md` and `VERSION` to `apps/mobile/`.
   - `git mv docs/deprecations.md packages/backend/DEPRECATIONS.md`. It is the one file kept from `docs/`, because it is the live list of backward-compatibility shims for app versions still in the stores. The backend rules point at this path.
2. **Commit B: add the workspace scaffold.** Bring in the Phase 1 output: root config, `apps/web`, `apps/admin`, `apps/desktop`, `apps/cli`, `apps/docs`, `packages/ui`, `packages/config`, `.github`, `AGENTS.md`.
3. **Commit C: wiring.**
   - Split `package.json` so mobile deps go to `apps/mobile` and server deps plus Convex components go to `packages/backend`.
   - Move `patchedDependencies` and `trustedDependencies` to the root.
   - Codemod `@/convex/` → `@xolace/backend/convex/`. Keep the `@/src/*` alias unchanged (about 1,700 imports), and change it later in a separate PR.
   - Merge Metro config: Sentry base → purchases stub resolver → uniwind (18 themes). Leave Expo's automatic monorepo settings alone, with no manual `watchFolders` or `nodeModulesPaths`, as the Expo docs say.
   - Split vitest into backend (edge-runtime, evals, coverage thresholds) and mobile (node + RN mocks).
   - Fix the 2 `import.meta.glob` paths that point into component modules in node_modules.
   - Rewrite CI path filters, including the eval gates → `packages/backend/convex/ai/**`.
   - Merge `.gitignore` and `.easignore`.
4. **Commit D: format only** with `ultracite fix`, recorded in `.git-blame-ignore-revs`. Lint problems that can't be auto-fixed go into a tracked list and get fixed in later PRs; they don't block the move.
5. **Version bumps**, each in its own PR with device testing: expo patch versions; uniwind 1.11 → 1.12 (re-cut or drop the patch); `@clerk/expo` 4.6 → 4.12; backend `ai` 6 → 7. Remove the unused `@tanstack/react-query`, `@convex-dev/react-query` and `@convex-dev/agent`.
   *Status 2026-10-27:* uniwind is at 1.13.0 (#617), `@clerk/expo` at 4.14, `ai` at 7 (root catalog), and the three unused packages are gone. Expo is on 58.0.16.

**Done when:**
- all of the roughly 1,158 tests pass
- the dev client runs the full app on iOS and Android against the dev Convex deployment
- an EAS preview build succeeds
- `convex dev` from `packages/backend` deploys with no schema diff
- CI is green
- `git log --follow apps/mobile/src/app/_layout.tsx` shows the full history

### Phase 3: Release pipelines

**Status:** done · 2026-10-24, apart from "Left" below. Shipped in:
- #625 `ci(backend): run the eval gates on PRs to dev and main`
- #626 `feat(repo): release Convex from GitHub Actions, then mobile, web and admin` (`release.yml`; the root `vercel.json` is gone)
- #627 `feat(desktop): release pipeline with CSP, updater and tagged builds`
- #628 `feat(mobile): add the EAS release pipeline, fingerprint runtime and production guard`
- #629 `docs: compare React Native desktop and Tauri for the desktop app` (verdict: keep Tauri; `docs/research/desktop-platform.md`)
- #630 `docs(repo): fix the dev Convex URL in the release guide`

**First release:** the first `dev` → `main` release went out on 2026-10-25 (#638). Its `release.yml` run deployed prod Convex, then web and admin to Vercel Production, and started the EAS mobile release (mobile 1.15.0, the first store build on the fingerprint runtime). Whether that build cleared store review is tracked in EAS, not here.

**Left:**
- **Desktop releases are dormant** until 4e: the static export is blocked by `@clerk/nextjs`'s `ClerkProvider`, which uses server actions. Tagging also needs the signing secrets listed in `desktop-release.yml` (Tauri updater, Apple, Windows).
- **Deferred edge case:** deploy hooks build the tip of `main`, not the commit that was released. Two quick merges can build web/admin from a commit whose backend hasn't deployed yet. Later fix: deploy with the Vercel CLI (`VERCEL_TOKEN`) at an explicit SHA.

- **Order: backend first, then clients.** Each release job runs `convex deploy` before any OTA or web deploy. Backend changes must stay compatible with mobile binaries already in users' hands.
- **Mobile:** an Expo fingerprint check on each PR labels native changes. On merge to main, an EAS Workflow (from clarity and amber) runs `fingerprint` and then `get-build` against the production channel:
  - if a compatible store build exists, JS-only changes ship as an `eas update` (OTA);
  - otherwise it builds and submits to TestFlight and Play internal.
  - Production uses `runtimeVersion.policy: fingerprint`; dev and preview keep `appVersion`.
- **Convex:** deploy from a single place: `.github/workflows/release.yml` on every push to `main` runs `convex deploy` to prod (key in the GitHub `production` environment), then starts the clients: the EAS mobile release when mobile files changed, and Vercel deploy hooks for web and admin. Vercel's own Git deploys of `main` are off, and web and admin are plain builds that read `NEXT_PUBLIC_CONVEX_URL` and fail if a deploy key is present. *(Changed 2026-10-23 from "Vercel's web build runs `convex deploy`", so the backend never depends on a client build. Setup: `docs/setup/release.md`.)*
- **Staging backend:** a separate Convex project, `xolace-staging`, whose production deployment is staging, on the Clerk dev instance (`pk_test_…`). `.github/workflows/staging.yml` deploys it on every push to `dev` (GitHub environment `staging`, its own `CONVEX_DEPLOY_KEY`). Both workflows check which key they hold, so the prod and staging keys can't be swapped. Behind the repo variable `STAGING_MOBILE_OTA` (off by default, since it spends EAS quota), the same run publishes an OTA to the EAS `preview` channel. Vercel Preview (web and admin) and the EAS `preview` environment point at staging. *(Changed 2026-10-24 from "previews use the owner's personal dev deployment", so `dev` has a shared backend that matches its code. Setup: `docs/setup/staging.md`.)*
- **Desktop:** tag-triggered `tauri build` plus the updater. Set a real identifier and a CSP that allows `*.convex.cloud` and the Clerk domain.
- **Live evals gate:** carry over the existing intensity and talk eval gates.

### Phase 4: More clients on the shared backend

- **4a** Run the auth spikes from §3.
- **4b** Backend: add the second auth provider plus a `getMe` query. In Clerk, set up the OAuth app.
- **4c** Web: real product screens and the `/connect` page; `packages/shared` gets created when web first needs it.
- **4d** TUI: `xolace login`, then reactive views.
- **4e** Desktop: PKCE plus keychain storage.
- **4f** Admin: the `adminQuery`/`adminMutation` builders and role claim first, then content ingestion (§3a), then the other admin views.

Steps 4c, 4d, 4e and 4f can run in parallel. 4f needs only 4b's role claim, not the OAuth spikes, so it can start first.

**Status 2026-10-27:**
- **4f admin v1: done.** The `adminQuery`/`adminMutation`/`adminAction` builders, the role claim, the content UI on Convex, R2 uploads, bulk import and the search index page shipped in #642–#645, #647 and #650. Build order, decisions and what's still open: `docs/plan/admin-v1.md`. The later admin views (users and support, moderation and feedback queues, feature flags, job health) are not started.
- **4a: done** (2026-10-27): all six spikes pass; results under §3 "Results".
- **4b: done.** `auth.config.ts` adds the OAuth provider when `CLERK_OAUTH_CLIENT_ID` is set, and `users.getMe` returns who is signed in (#653). The OAuth apps exist in both Clerk instances and the variable is set on dev, staging, previews and prod (`docs/setup/oauth-clients.md`). OAuth tokens carry no `role` claim, so admin stays web-only.
- **4d: in progress.** `xolace login` (browser + PKCE on a loopback port, `--device` and the default over SSH), `logout` and `whoami`, the session in the keychain with a `0600` file fallback, a refreshing `fetchToken` for `ConvexReactClient`, and a first live view of `getMe`. Login goes straight to Clerk; the web `/connect` page waits for 4c. Left: more views, and shipping the binary with built-in prod config (today it reads `XOLACE_*` env).
- **4c, 4e: not started.** Web is still the scaffold placeholder. 4e stays blocked on the `ClerkProvider` static-export problem (see Phase 3 "Left").
- Next: 4c (web) can start alongside the rest of 4d.

### Phase 5: Deeper refactors, later and one PR each

**Status 2026-10-27:** not started.

- `@/*` alias → `./src/*`.
- Untangle the feature cycles: `purchases` ↔ `talk` ↔ `settings` and `library` ↔ `browse` / `kindling`. Turn `purchases` into an entitlements module.
- Add an import-cycle test and knip with `includeEntryExports`.

---

## 5. Testing and E2E

### 5.1 Tiers

These become the table in CONTRIBUTING.md.

| Tier | Command | What it covers | Runs in |
|---|---|---|---|
| Changed only | `bun run check:changed` | format, lint, typecheck and sibling tests for files changed since main | locally / agents, while iterating |
| Unit + Convex | `bun run test` (`turbo run test --affected`) | convex-test (edge-runtime), pure TS logic, RN logic with mocks. Offline. Includes a **security suite** (see 5.3). | every PR (GitHub Actions) |
| Local Convex integration | `bun run test:local` | against a local backend; refuses to run against cloud deployments (the convex-credits guard) | local, nightly |
| Web / admin E2E | `bun run test:e2e -F @xolace/web` · `-F @xolace/admin` | Playwright + `@clerk/testing` against the **E2E Convex deployment**, reset and seeded first | PRs touching web, admin or backend |
| Mobile E2E (blocking) | the 17 existing `.argent/flows` | **E2E build** (5.2) on a simulator | PRs touching mobile or backend (EAS Workflow) |
| Mobile E2E (exploratory) | an argent agent run with a goal built from the PR title, body and changed files | same build; **never blocks the PR**, only reports | same PRs |
| Live evals | `test:evals:*` | model behaviour (intensity, talk) | PRs touching `convex/ai/**` |

### 5.2 Mobile E2E build (from clarity and amber)

- **Separate `e2e` EAS profile.** It's a Release simulator build, not the dev client, with these settings:
  - `APP_VARIANT=preview` and `EXPO_PUBLIC_E2E=1`
  - **expo-updates disabled**, so an OTA can't swap the bundle under test
  - pointed at the dev Clerk instance and the **E2E Convex deployment**
- **Test sign-in uses no password.** A `testID="e2e-sign-in"` button appears only in E2E builds that use a `pk_test_` Clerk key. It signs in a `+clerk_test` email with Clerk's fixed test code `424242`, so no password is ever shipped in the bundle. If the config is wrong, a `testID="e2e-config-error"` screen shows, and that counts as a harness failure, not an app bug.
- **Production guard.** `assertProductionEnvironment()` runs in `apps/mobile/app.config.ts`, and an equivalent runs in the Next build. The production build fails if any of these hold:
  - an `E2E`, seed or mock flag is set
  - the Clerk key isn't `pk_live_`
  - the Convex URL isn't production
  - an `EXPO_PUBLIC_*` value looks like a secret

  The guard has its own unit test.
- **PR builds are fast.** The workflow fingerprints the app and looks for an existing build with that fingerprint (`get-build`).
  - If the native code didn't change, it **repacks** the new JS onto the existing binary, which takes minutes.
  - Otherwise it does a full build.
  - Repacking is only for E2E builds, never store builds.

### 5.3 Backend state for E2E

- **A dedicated E2E Convex deployment.** E2E never shares the dev deployment or a shared account.
- **Test-only Convex functions.** `packages/backend/convex/testing.ts` holds internal mutations `seedUser`, `resetUser` and `seedContent`. They are idempotent, built from fixed IDs and a seeded random generator, and keyed to the test identity. They **refuse to run** unless the Convex env var `E2E_ENABLED=1` is set, which is true only on that deployment.
- **How tests call them.** Playwright's `globalSetup` and the argent flows' setup step call these through `convex run`. Each run starts from a known state, with no cleanup after.
- **Security suite in convex-test** (from clarity's `test-security`):
  - one user can't read or change another user's data (`withIdentity`)
  - anonymous calls to HTTP routes get a 401 (`t.fetch`)
  - `api.admin.*` rejects anyone without the admin role
  - concurrent calls to quota and idempotent mutations behave correctly (`Promise.allSettled`)

### 5.4 Where each pipeline runs

- **GitHub Actions** runs the fast PR checks: Biome, typecheck, vitest/convex-test with `--affected`, codegen drift, web/admin Playwright. These run first, because they're cheap.
- **EAS Workflows** (`.eas/workflows/`) runs anything that builds mobile: the PR E2E build, argent flows, the exploratory run, and release.
- **One PR comment.** A single summary comment gathers the results: pass/fail, screenshots, recordings and junit. Artifacts are uploaded.
- **Optional label-gated OTA preview.** Adding the `preview-approved` label publishes the PR to EAS branch `pr-<n>` from an EAS environment that holds no secrets, and posts a QR code (the clarity pattern).
- **Per-PR Convex preview backend.** *(Built 2026-10-24 ahead of the E2E work, on its own label `preview-backend`: `.github/workflows/pr-preview.yml`, previews in the `xolace-staging` project, web/admin previews via the Vercel CLI, mobile still to come. Setup: `docs/setup/pr-previews.md`.)* PR previews of web/admin and preview OTAs use staging, which runs `dev`'s backend, so a PR's own backend changes aren't in its preview. Staging stays the shared `dev` backend; per-PR previews are only for testing a labelled PR's backend changes. When the label is added, a PR workflow:
  1. runs `convex deploy --preview-create pr-<n>` with a Convex **preview** deploy key (GitHub secret), then seeds it through the §5.3 test functions;
  2. points the `pr-<n>` OTA preview at that deployment;
  3. deploys a web preview against it through the Vercel CLI (`VERCEL_TOKEN`), since Vercel's Git previews can't know the URL.

  Needs: a Convex plan with preview deployments, and project-level default env vars for preview deployments (Clerk issuer, PostHog, model keys), because each one starts empty. Previews are deleted when the PR closes. Only on the label, never on every PR.

### 5.5 Proof required in PRs (goes into AGENTS.md)

Before reproducing a bug, pick the kind of evidence it needs:
- **Visual:** before/after screenshots.
- **Timing or animation:** a recording.
- **Logic:** a failing test that then passes.

Also:
- State what the simulator **can't** prove: microphone and voice, purchases, push, native auth sheets.
- Use argent: `describe` before tapping, and stop simulator sessions when done.

**Not copied:**
- passwords embedded in the bundle (amber)
- shared test accounts with best-effort cleanup
- unpinned `@latest` tools in CI
- a headless agent fix loop that runs with permissions bypassed in the production EAS environment with a write token (clarity); revisit later, scoped and without production secrets
- vision-only assertions where adding a `testID` would fix the problem

---

## 6. Risks to watch

1. **Duplicate React or native module versions.** Expo supports Bun workspaces, but not two copies of React, React Native or an Expo module in one app. Handled by one React version in the catalog, peer dependencies in shared packages, and the Phase 1F spike, which must pass before anything moves.
2. **EAS uploads the whole repo.** `.easignore` sits at the root, the root `postinstall` must not fail without secrets, and paths are relative to `apps/mobile`.
3. **Branches in flight.** Handled by the freeze in D7.
4. **Formatting churn hiding real diffs.** Handled by D5, a separate commit listed in the blame-ignore file.
5. **The Tauri sign-in trap.** It works against a Clerk dev instance and fails in prod. Test against prod early (spike 4a).
6. **Feature cycles in mobile.** Left alone during the move and fixed in Phase 5.

---

## 7. How the agents split the work

- **Phase 1:** after the 1F spike starts, streams 1A–1E run as parallel agents, each in its own worktree and owning its own files. Streams that share a file (1A and 1B on `turbo.json` and `package.json`) are merged in order.
- **Phase 2:** one agent, run sequentially, because it's one atomic move with the history needing to stay intact. I review each commit before the next one.
- **Phase 4:** parallel agents for web, TUI and desktop once 4a and 4b land.

Every agent works on a branch and opens a PR. Nothing goes to `main` or prod Convex without your review.
