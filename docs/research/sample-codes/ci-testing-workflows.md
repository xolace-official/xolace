# CI/CD, testing and developer-workflow research — sample codes

Researched 2026-10-09 from the three reference apps in
`src/components/extras/sample-codes/` (abbreviated below as `amber/`,
`clarity/`, `oyelo/` — e.g. `amber/e2e.config.ts` means
`src/components/extras/sample-codes/amber-main/e2e.config.ts`). Xolace paths are
repo-relative. `path:N` is a line number, `path:N-M` a range.

Bottom line: Xolace already has strong unit/backend tests and a real local E2E
artifact (Argent flows). The gaps are in CI: no typecheck gate, no CI-runnable E2E,
no deterministic sign-in for automation, and manual build/OTA routing. Amber and
Clarity both solve those four things on EAS Workflows, and their files can be
adapted almost line for line.

---

## 1. Xolace today

| Area | State | Evidence |
|---|---|---|
| CI | One GitHub Actions file: ESLint + Vitest with coverage. No typecheck, no build, no E2E, no deploy. | `.github/workflows/ci.yml:9-54` |
| CI branches | Triggers on `[dev, default]`. `default` is not a branch here (main branch is `dev`), and `bun-version: latest` is unpinned. No `concurrency` cancel. | `.github/workflows/ci.yml:3-7,18-21` |
| Typecheck | No `typecheck` script. `tsc` never runs in CI. The root tsconfig covers `**/*.ts` and there is a separate `convex/tsconfig.json`. | `package.json:20-45`, `tsconfig.json:14-25`, `convex/tsconfig.json` |
| Lint | `expo lint` with Convex plugin (type-aware for `convex/**`), react-perf, react-native rules. | `eslint.config.js:1-40` |
| Format | No Prettier or other formatter. | `package.json` (no prettier dep) |
| Unit/backend tests | Vitest 4 + `convex-test` 0.0.56, 113 test files under `convex/` and `src/`, coverage floor on `convex/**`, CI retry 1, live LLM evals behind `RUN_EVALS=1`. | `vitest.config.ts:11-52`, `package.json:31-35`, `convex/test/auth.test.ts:30,87` |
| E2E | Argent YAML flows: 17 flows (517 lines) for starter suggestions, follow-up and Lantern. Each run's result is written up in `docs/qa/*.md`. Local only: needs a signed-in dev client, Metro running and `__DEV__` Dev tools. | `.argent/flows/*.yaml`, `docs/qa/starter-suggestions-e2e.md:7-19`, `docs/qa/follow-up-haptics-e2e.md:1-8` |
| E2E auth | OAuth-only (Apple/Google native sheets), so automation cannot sign in. Flows assume an account is already signed in. | `src/features/auth/use-provider-sign-in.ts:64-67`, `docs/qa/starter-suggestions-e2e.md:22-24` |
| Seed/test hooks | Server side: `convex/devTools.ts` gated by `DEV_TOOLS_ENABLED`. Client side: Settings → Account Dev tools rows, only under `__DEV__`. | `convex/devTools.ts:1-21`, `src/features/settings/components/dev-tools-section.tsx:3` |
| EAS profiles | `development`/`preview`/`production` with `APP_VARIANT` + channel. No `environment` key, no simulator/E2E profile, no iOS submit config. Android submit uses a local service-account JSON. | `eas.json:6-37` |
| Env | EAS env vars pulled locally with `eas env:pull` before each build. Builds are manual. | `docs/eas-build-flow.md:1-110` |
| OTA | `runtimeVersion.policy: "appVersion"`. OTAs are published by hand (1.13.0 shipped as "OTA Update"). | `app.config.ts:299-304`, `CHANGELOG.md:9` |
| Versioning | Three different versions: `package.json` 1.11.0, `app.config.ts` 1.13.0, `VERSION` 1.3.0.0. `appVersionSource: remote` handles build numbers. | `package.json:4`, `app.config.ts:59`, `VERSION`, `eas.json:4` |
| Release workflow | No EAS Workflows (`.eas/` does not exist), no fingerprinting, no TestFlight automation, no PR previews. | — |
| Store metadata | ASO is in docs only. No `store.config.json` / EAS Metadata. | `docs/aso-metadata-v2.md` |
| Patches | Uses `package.json` `expo.install.exclude` and `autolinking.buildFromSource`, with `//` comments explaining why. No `patches/` directory. | `package.json:5-18` |
| Hooks | No husky/lefthook pre-commit. | repo root listing |
| Agent docs | Large `CLAUDE.md`, `agents.md`, `skills-lock.json`, `.claude/rules`, an Argent environment-inspector agent, `docs/agents/*` (issue tracker, triage labels). | `CLAUDE.md`, `agents.md:1-5`, `docs/agents/triage-labels.md` |
| PR template | Checklist asks for lint but not tests, typecheck or an E2E artifact. | `.github/pull_request_template.md` |

**Biggest gaps, ranked:** (1) no CI-runnable E2E and no automation sign-in; (2) no
`tsc` gate; (3) build and OTA routing are manual and runtime versioning is
appVersion-based; (4) no PR preview path; (5) version-string drift.

Note: `CLAUDE.md` says "E2E not setup yet", but Argent flows plus `docs/qa/*`
already give a repeatable local artifact. What is missing is a **hermetic, CI-run**
E2E.

---

## 2. Per-app inventory

### 2a. amber-main (Expo SDK 58 + Convex + Clerk)

| Piece | What it does | Path |
|---|---|---|
| Scripts | `lint`, `typecheck` (`tsc --noEmit`), `test` (`node --experimental-strip-types --test tests/*.test.mjs`), `e2e` (`e2e run`), `e2e:explore` | `amber/package.json:75-85` |
| Pinned E2E deps | `e2e` 0.15.2, `@e2e-dev/mobile` 0.9.0, `@e2e-dev/eas` 0.2.0, pinned exact and bumped together | `amber/package.json:65-70`, `amber/.eas/workflows/README.md:116-117` |
| E2E config | TesterArmy `e2e`. iOS target. When `E2E_EAS_BUILD_ID` is set, each run leases a **hosted EAS Simulator**; otherwise it uses the local booted sim (`E2E_DEVICE`). App id is overridable (`E2E_APP_ID`). `context` gives facts about the app to the agent; reporters are list/junit/markdown; two agents (fast model for scripted `act`, stronger model for `explore`). | `amber/e2e.config.ts:7-72` |
| E2E suite | One serial group: clear keychain, open, tap `dev-login-button`, skip onboarding by testID, assert tabs. Then save a note, wait for AI processing with `vision: 'only'`, extract the title with a zod schema, clean up (best effort). `unique()` marks per-run values so the trace cache can still replay. | `amber/e2e/amber.e2e.ts:57-161` |
| Trace cache | `.e2e/cache/*.json` is committed. It holds recorded `agent.act` steps that CI replays with no model calls (read-only in CI). Rest of `.e2e/` is gitignored. | `amber/.e2e/cache/*.json`, `amber/.gitignore:52-56`, `amber/.eas/workflows/README.md:83-95` |
| E2E build profile | `e2e`: iOS simulator, `environment: development`, `APP_VARIANT=preview`, `EXPO_PUBLIC_E2E=1`. | `amber/eas.json:26-37` |
| Test-account sign-in | "Dev login" button shown when `__DEV__ \|\| EXPO_PUBLIC_E2E==='1'`. It runs a Clerk password sign-in for `dev+clerk_test@example.com` with `EXPO_PUBLIC_DEV_PASSWORD`, which is **embedded in the bundle**. | `amber/src/components/onboarding/welcome.tsx:59-61`, `amber/src/app/(auth)/sign-in.tsx:27-59`, `amber/.eas/workflows/README.md:107-112` |
| PR E2E workflow | EAS Workflow with path filters and concurrency cancel. Steps: `fingerprint` → `get-build` (same fingerprint) → `repack` (JS-only change, minutes) or full `build` → run suite (blocking) → agentic `explore` built from PR title, body and changed files (non-blocking) → `summarize` → `upload_artifact` → `github-comment`. | `amber/.eas/workflows/pr-e2e.yml:12-185` |
| CI helpers | `pr.mjs` (parse PR JSON), `explore-goal.mjs` (turn PR into an explore goal), `summarize.mjs` (report.json → PR markdown) | `amber/e2e/ci/pr.mjs:1-17`, `amber/e2e/ci/explore-goal.mjs:1-33`, `amber/e2e/ci/summarize.mjs:1-53` |
| Deploy workflow | On push to main: `checks` (typecheck+test) → `fingerprint` → `get-build` (store build, same fingerprint, completed only) → **OTA `update`** if one exists, else `build` + `testflight`. Manual `force_native` input. | `amber/.eas/workflows/deploy-to-testflight.yml:1-88` |
| Runtime policy | `fingerprint` for production, `appVersion` for dev/preview | `amber/app.config.ts:47-56` |
| Workflow docs | README explains each workflow, one-time setup, quirks, and how to re-record the cache | `amber/.eas/workflows/README.md:1-117` |
| Pinned build image | `macos-tahoe-26.6-xcode-27.1` on every iOS profile | `amber/eas.json:10-12,19-21,30-32`; reason in `amber/CLAUDE.md:42-45` |
| Fingerprint hygiene | Advice to keep JS-only tokens out of files that config plugins read, so PRs repack instead of rebuilding | `amber/CLAUDE.md:116-119` |
| Unit tests | `node:test` + `assert` against pure TS modules with dependency-injected fixtures | `amber/tests/app-lock-controller.test.mjs:1-20` |
| Patches | bun `patchedDependencies`: Clerk Android Gradle dep, expo-widgets | `amber/package.json:91-94`, `amber/patches/*.patch` |
| Argent | Perf flows (swipe burst/regression/profile, baseline) plus before/after React profiler reports committed as artifacts | `amber/.argent/flows/*.yaml`, `amber/.argent/artifacts/item-swiping/after-react.md` |
| Agent config | `CLAUDE.md` imports `@AGENTS.md`. AGENTS.md says "Expo HAS CHANGED, read versioned docs" and has a Convex AI block. Skills are pinned via `skills-lock.json` (source + hash) and mirrored to `.agents/` and `.claude/`. `.codex/config.toml` adds Clerk + Expo MCP; `.vscode/mcp.json` adds Argent; `.claude/settings.json` enables the expo plugin. | `amber/CLAUDE.md:5`, `amber/AGENTS.md:1-17`, `amber/skills-lock.json:1-40`, `amber/.codex/config.toml:1-5`, `amber/.vscode/mcp.json`, `amber/.claude/settings.json` |
| Env template | `.env.example` separates client `EXPO_PUBLIC_*` values from Convex-side secrets | `amber/.env.example:1-11` |

### 2b. clarity-main (Expo SDK 57 + Convex + Clerk + RevenueCat)

| Piece | What it does | Path |
|---|---|---|
| Scripts | `typecheck` = `tsc --noEmit && tsc --noEmit -p convex` (two programs, catches `@/` alias leaking into Convex). `test` chains 11 `bun scripts/test-*.ts(x)` suites. `deploy:web` uses EAS Hosting. | `clarity/package.json:64-75`, `clarity/AGENTS.md:90` |
| Backend tests | `convex-test` with `withIdentity` for cross-account security, leases and billing gates | `clarity/scripts/test-security.tsx:3,30-32,73-79`, `clarity/scripts/test-pro.ts:1,53-68` |
| Pure-logic tests | Hand-rolled assert/section harness. Entitlement branches are tested here because a simulator cannot reach the store. | `clarity/scripts/test-entitlements.ts:1-40` |
| Simulator QA profile | `simulator` extends `preview`: iOS sim, `environment: development`, `EXPO_PUBLIC_AUTOMATION=1`, `EXPO_PUBLIC_MOCK_PRACTICE=1`, `EXPO_PUBLIC_SEED_HOOKS=1` | `clarity/eas.json:23-35` |
| Automation sign-in | **No password anywhere.** Only in an automation build, with a `pk_test_` key and a `+clerk_test` email: Clerk email-code sign-in plus Clerk's fixed dev OTP `424242`. A visible `simulator-auth-config-error` tells agents the harness is misconfigured (not an app bug). Button `testID="dev-test-sign-in"`. | `clarity/app/(auth)/sign-in.tsx:20-50,170-200,225-262`, `clarity/.eas/workflows/README.md:138-145,161-163` |
| Updates off in QA builds | `updates.enabled=false` when `EXPO_PUBLIC_AUTOMATION=1`, so a preview OTA can't swap out the deterministic bundle | `clarity/app.config.ts:86-95` |
| Production env guard | `assertProductionEnvironment` runs from `app.config.ts`. It throws if a production build carries QA flags, any `EXPO_PUBLIC_*PASSWORD/SECRET/…` value, a non-`pk_live_` Clerk key, or the wrong Convex URL. | `clarity/lib/release-config.js:1-18`, `clarity/app.config.ts:2,59` |
| Seed hook | `<scheme>://dev-seed` route behind `Stack.Protected guard={SEED_ENABLED}`. Deterministic, idempotent 45-day history; shows `testID="dev-seed-result"` "Seeded ✓". | `clarity/app/dev-seed.tsx:12-60`, `clarity/app/_layout.tsx:152,309-311` |
| Mocked native input | Scripted speech engines replace the mic in automation builds. The fix prompt states what that fixture can and cannot prove. | `clarity/hooks/use-practice-session.ts:8-14`, `clarity/.agents/fix-prompt.md:31-50` |
| Deploy workflow | Same TestFlight-or-OTA fingerprint pattern as Amber, with a note on why IPAs are never repacked | `clarity/.eas/workflows/deploy-to-testflight.yml:1-86` |
| PR preview | Fires on the `preview-approved` label. OTA goes to branch `pr-<N>` in a **secrets-free `pr-preview` EAS environment**, then a `github-comment` posts the QR code. | `clarity/.eas/workflows/pr-preview-update.yml:1-38` |
| Issue → fix agent | GitHub `repro` label → GH Action calls `eas workflow:run agent-fix.yml` → headless Claude Code reproduces on EAS Simulator (`eas simulator:*` + `agent-device`), comments, fixes, rebuilds, verifies in a second session, and opens a PR with evidence | `clarity/.github/workflows/agent-repro-dispatch.yml:1-51`, `clarity/.eas/workflows/agent-fix.yml:1-51`, `clarity/.agents/fix-prompt.md:1-200` |
| Evidence policy | Pick one evidence class before reproducing (static-visual / temporal / structural-runtime / mixed) and capture only what proves the claim. Evidence is committed under `.agents/evidence/issue-N/`. | `clarity/.agents/fix-prompt.md:66-87,187-200`, `clarity/.agents/evidence/issue-7/*.png` |
| TestFlight autofix | ASC `beta_feedback` trigger plus a 6-hourly sweep. Steps: triage agent → GitHub issues (deduped by a footer) → claim under an atomic git-ref lock (stale after 3h) → fix → chain to the next issue. | `clarity/.eas/workflows/testflight-autofix.yml:1-115`, `clarity/.eas/workflows/testflight-sweep.yml:1-77`, `clarity/scripts/testflight-drain.sh:1-112`, `clarity/.agents/triage-prompt.md:1-30` |
| AI code review | `@expo/code-review-cli` (`ecr ci`) on every PR. Base-ref checkout only, config guard `ecr verify-config`, `continue-on-error`. `/review` and `/dismiss` comment commands; agents defined in markdown. | `clarity/.github/workflows/expo-code-review.yml:1-60`, `clarity/.github/workflows/expo-code-review-command.yml:1-175`, `clarity/.github/workflows/expo-code-review-dismiss.yml:1-31`, `clarity/.expo-code-review/config.jsonc:1-60`, `clarity/.expo-code-review/agents/correctness.md`, `clarity/.expo-code-review/shared.md:1-20` |
| Store metadata | `submit.production.ios.metadataPath: ./store.config.json` (EAS Metadata: categories, age advisory, localized title/subtitle/keywords) | `clarity/eas.json:45-51`, `clarity/store.config.json:1-40` |
| Patches | bun `patchedDependencies` plus `patches/README.md` giving the why, upstream source, advisory and removal condition | `clarity/package.json:77-80`, `clarity/patches/README.md:1-14` |
| Private registry | `.npmrc` with a `${HUGEICONS_TOKEN}` env token, also fed to the GH Action install | `clarity/.npmrc`, `clarity/.github/workflows/agent-repro-dispatch.yml:34-37` |
| Drift audit | Grep commands in AGENTS.md that count hardcoded hex, fontSize, radius and spacing values | `clarity/AGENTS.md:28-41` |
| Observability contract | Event catalog doc with schema version and eventId dedupe | `clarity/docs/observe-events.md:1-20` |
| Review artifacts | Security/readiness review written as a report with a decision and evidence | `clarity/output/security-review/report.md:1-15` |
| Agent memory | `.codex/MEMORY.md` "Project Environment" with commands, profiles, auth model and CI topology in one screen | `clarity/.codex/MEMORY.md:1-17` |
| Hooks | Claude/Codex `Stop`/`SessionEnd` hooks upload traces (hackathon-specific, not reusable) | `clarity/.claude/settings.json`, `clarity/.codex/hooks.json:1-15` |

### 2c. oyelo-main (native SwiftUI, XcodeGen)

| Piece | What it does | Expo equivalent for Xolace | Path |
|---|---|---|---|
| XcodeGen `project.yml` | Declarative project; the generated `.xcodeproj` is committed | Continuous Native Generation (`app.config.ts` + config plugins, `expo prebuild`), which Xolace already uses | `oyelo/project.yml:1-40`, `oyelo/AGENTS.md:11` |
| Unit tests (41 files) | XCTest over Core/Providers/Import | Vitest + convex-test (already in Xolace) | `oyelo/OyeloTests/*.swift` |
| UI tests (27 files) | XCUITest with launch args `--uitesting`, `--reset-test-state`, `--preview-library`, `-appearance dark`, Dynamic Type size | Build-time `EXPO_PUBLIC_AUTOMATION` + deep-link/seed hooks + E2E runner (§4) | `oyelo/OyeloUITests/OyeloUITests.swift:6-30,67-229` |
| Test-state isolation | Under `--uitesting`: separate UserDefaults suite, separate data dir, **separate Keychain service**; Pro unlock is forced by a flag and StoreKit is bypassed | Namespace the Zustand/kv-store and SecureStore keys under the automation flag; clear the keychain at test start (`amber/e2e/amber.e2e.ts:62-63`) | `oyelo/Oyelo/App/OyeloApp.swift:26-59`, `oyelo/Oyelo/Core/KeychainStore.swift:4-12`, `oyelo/Oyelo/Core/ProStore.swift:22-33` |
| Screenshot artifacts | `XCTAttachment(screenshot:)` with `.keepAlways` in the xcresult | E2E runner screenshots/videos uploaded as CI artifacts (`amber/.eas/workflows/pr-e2e.yml:168-174`) | `oyelo/OyeloUITests/FirstListenUITests.swift:98-101`, `oyelo/OyeloUITests/ArchiveUITests.swift:218-223` |
| StoreKit testing | `Oyelo.storekit` local products, scheme `storeKitConfiguration`, `SKTestSession` purchase/refund tests | RevenueCat (Xolace uses `react-native-purchases` `^10.4.0`): unit-test entitlement logic as in `clarity/scripts/test-entitlements.ts:1-40`; add an automation-only entitlement override like Oyelo's `--pro-unlocked`. A `.storekit` file in the Xcode scheme needs a config plugin (not shown in any sample). | `oyelo/Oyelo.storekit`, `oyelo/project.yml:116-147`, `oyelo/OyeloTests/ProStoreTests.swift:55-75` |
| swift-format | Root config, 2 spaces / 100 columns; formatting-only commits kept separate | Prettier (+ `prettier-plugin-tailwindcss` for className ordering); Xolace has none | `oyelo/.swift-format:1-18`, `oyelo/AGENTS.md:13` |
| Localization pipeline | String Catalogs; `scripts/sync-strings.sh` extracts keys; `LocalizationCatalogTests` fails on missing or stale translations; `TRANSLATION.md` has tone, never-translate list, glossary and plurals | Xolace has `expo-localization` but no i18n catalogue. Equivalent: i18next/Lingui JSON catalogs + an extraction script + a Vitest coverage check (same shape as `LocalizationCatalogTests`) + a TRANSLATION.md | `oyelo/scripts/sync-strings.sh:1-53`, `oyelo/OyeloTests/LocalizationCatalogTests.swift:1-40`, `oyelo/TRANSLATION.md:1-46`, `oyelo/docs/LOCALIZATION.md:1-30` |
| ASO doc | Field-by-field listing with character counts and keyword rationale | `store.config.json` via EAS Metadata (`clarity/eas.json:49`) | `oyelo/docs/ASO.md:1-30` |
| Web | Vite marketing site under `apps/web` | Clarity's `expo export --platform web` + EAS Hosting (`clarity/package.json:70-73`) | `oyelo/apps/web/package.json` |
| CI | **None** (no `.github`, no Xcode Cloud config in repo) | — | `oyelo/` listing |

---

## 3. Recommendations

Effort: **S** < half a day, **M** 1–3 days, **L** a week or more.

### Great

#### G1. Add a typecheck gate (app + Convex) and fix the CI triggers — S
- **Source:** `clarity/package.json:67`, `clarity/AGENTS.md:90`, `amber/package.json:81`, `amber/.eas/workflows/deploy-to-testflight.yml:23-35`.
- **Why:** Lint and Vitest don't run the type checker over `src/`. Clarity's two-program check catches the `@/` alias in `convex/`, which typechecks at the root and then fails at `convex deploy`.
- **Adopt:**
  ```jsonc
  // package.json scripts
  "typecheck": "tsc --noEmit && tsc --noEmit -p convex"
  ```
  ```yaml
  # .github/workflows/ci.yml
  on:
    pull_request: { branches: [dev, main] }   # 'default' is not a branch here
    push: { branches: [dev] }
  concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }
  jobs:
    typecheck:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: oven-sh/setup-bun@v2
          with: { bun-version: 1.3.x }        # pin; 'latest' drifts
        - run: bun install --frozen-lockfile
        - run: bun run typecheck
  ```
- **Gotchas:** `convex/_generated` must be committed (or run `convex codegen`) for `-p convex` to resolve. Expect a first-run backlog of errors; fix them before making the job required. Typed routes need `.expo/types` (generate it with `expo customize tsconfig` or a short `expo start --offline` run, or exclude it).

#### G2. Automation-only Clerk sign-in with the `+clerk_test` fixed OTP — M
- **Source:** `clarity/app/(auth)/sign-in.tsx:20-50,170-200,225-262`, `clarity/.eas/workflows/README.md:138-145,161-163`. Contrast with `amber/src/app/(auth)/sign-in.tsx:27-38`, which bundles a password (`amber/.eas/workflows/README.md:109-111`). **Use Clarity's approach.**
- **Why:** Xolace is OAuth-only (`src/features/auth/use-provider-sign-in.ts:64-67`). No E2E runner can drive Apple/Google sheets, which is why the current flows assume a pre-signed-in device (`docs/qa/starter-suggestions-e2e.md:16-24`). Without this, CI E2E is impossible.
- **Adopt:** in `src/features/auth/` add `use-automation-sign-in.ts`:
  ```ts
  const AUTOMATION = process.env.EXPO_PUBLIC_AUTOMATION === '1';
  const DEV_INSTANCE = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_') === true;
  const EMAIL = process.env.EXPO_PUBLIC_E2E_EMAIL?.trim();
  export const AUTOMATION_EMAIL =
    AUTOMATION && DEV_INSTANCE && EMAIL && /\+clerk_test(?:_|@)/i.test(EMAIL) ? EMAIL : null;
  // signIn.emailCode.sendCode({ emailAddress }) -> verifyCode({ code: '424242' }) -> signIn.finalize()
  // then call users.getOrCreate as the provider path does.
  ```
  Render a `testID="automation-sign-in"` button on the auth screen only when `AUTOMATION_EMAIL` is set. Render `testID="automation-auth-config-error"` when `AUTOMATION` is on but the guard fails.
- **Gotchas:**
  - Enable **Email verification code** on the Clerk *development* instance (`clarity/.eas/workflows/README.md:142-145`).
  - `users.getOrCreate` takes `authProvider: "apple" | "google"` (`convex/users.ts:86`). Widening it to add `"email"` is a safe, back-compatible change under CLAUDE.md's Good-to-know rules. The other option is to pass a provider hint.
  - `@clerk/expo` v4 API names (`signIn.emailCode.*`) match Clarity's `^4.6.0` (`clarity/package.json:6`) and Xolace's `^4.6.1`.

#### G3. Production env guard in `app.config.ts` — S (prerequisite for G2)
- **Source:** `clarity/lib/release-config.js:1-18`, `clarity/app.config.ts:59`.
- **Why:** `APP_VARIANT` alone decides the bundle id (`docs/eas-build-flow.md:131-133`). A stray `EXPO_PUBLIC_AUTOMATION=1` from `.env.local` could otherwise ship a test-login button to the store.
- **Adopt:** `src/lib/release-config.js` (CommonJS, because `app.config.ts` loads it before Metro) asserting that, when `APP_VARIANT==='production'`: no `EXPO_PUBLIC_AUTOMATION`/`EXPO_PUBLIC_SEED_HOOKS`/`EXPO_PUBLIC_E2E_EMAIL`, Clerk key starts with `pk_live_`, and `EXPO_PUBLIC_CONVEX_URL` equals the prod deployment. Call it on the first line of the default export in `app.config.ts`.
- **Gotcha:** `requireEnv` is "softened" locally (`docs/eas-build-flow.md:118-120`). Keep this guard hard, but only when `APP_VARIANT==='production'`.

#### G4. A dedicated `e2e` EAS profile with Updates disabled — S
- **Source:** `clarity/eas.json:23-35`, `amber/eas.json:26-37`, `clarity/app.config.ts:86-95`.
- **Adopt:**
  ```jsonc
  "e2e": {
    "extends": "preview",
    "distribution": "internal",
    "environment": "development",          // dev Clerk (pk_test_) + dev Convex
    "ios": { "simulator": true },
    "android": { "buildType": "apk" },
    "env": { "APP_VARIANT": "preview", "EXPO_PUBLIC_AUTOMATION": "1", "EXPO_PUBLIC_SEED_HOOKS": "1" }
  }
  ```
  In `app.config.ts`: `updates: { url, enabled: process.env.EXPO_PUBLIC_AUTOMATION === '1' ? false : undefined }`.
- **Gotchas:**
  - `preview` uses Google OAuth credentials for `.preview` (`CLAUDE.md` Build Variants). That doesn't matter here, since the automation path skips Google.
  - Add `EXPO_PUBLIC_E2E_EMAIL` (public, not secret) to the EAS `development` environment.
  - Xolace's profiles have no `environment` key today. Workflow jobs (`fingerprint`, `update`) need an explicit `environment:` (`amber/.eas/workflows/deploy-to-testflight.yml:39,82`).

#### G5. PR E2E on EAS Workflows: fingerprint → repack/build → run → artifact → PR comment — M/L
- **Source:** `amber/.eas/workflows/pr-e2e.yml:12-185`, `amber/e2e/ci/*.mjs`, `amber/.eas/workflows/README.md:47-117`.
- **Why:** This turns "repeatable artifact" from a markdown write-up into a CI artifact (junit + report.json + screenshots/video) attached to every PR. Repack makes JS-only PRs take minutes (`amber/.eas/workflows/pr-e2e.yml:65-77`).
- **Adopt:** `.eas/workflows/pr-e2e.yml`, copied from Amber. Change branches to `[dev]`, path filters to `src/**, convex/**, modules/**, assets/**, e2e/**, app.config.ts, eas.json, package.json, bun.lock`, profile to `e2e`, and env to `APP_VARIANT: preview` + `EXPO_PUBLIC_AUTOMATION: '1'`. The runner is the decision in §4.
- **Gotchas:**
  - The env in the `fingerprint` job must match the build profile exactly, or `get-build` never matches (`amber/.eas/workflows/pr-e2e.yml:46-53`).
  - Use `E2E_EAS_BUILD_ID`, not `EAS_BUILD_ID` (`amber/e2e.config.ts:12-14`).
  - The EAS image has `bun` but no `bunx`, so use `bun x` (`amber/.eas/workflows/pr-e2e.yml:119`).
  - Job env values must be strings, so wrap them in `toJSON()` (`amber/.eas/workflows/pr-e2e.yml:97-99`).
  - EAS Simulator sessions bill until stopped (`clarity/.agents/fix-prompt.md:135-140`).
  - Connect the GitHub repo to the EAS project, or `pull_request` never fires (`amber/.eas/workflows/README.md:37-39`).

#### G6. TestFlight-or-OTA deploy with fingerprint runtime — M
- **Source:** `amber/.eas/workflows/deploy-to-testflight.yml:1-88`, `clarity/.eas/workflows/deploy-to-testflight.yml:1-86`, `amber/app.config.ts:47-56`, `clarity/.eas/workflows/README.md:3-32`.
- **Why:** Xolace decides "OTA or binary" by hand under an `appVersion` runtime (`app.config.ts:302-304`). Fingerprint routing makes it impossible to OTA JS that needs new native code, which matters given the custom Skia pin and `buildFromSource` workarounds (`package.json:5-18`).
- **Adopt:** `.eas/workflows/deploy.yml` on push to `main` (or a `release/*` tag). The `checks` job runs `bun run typecheck && bun run test`, then fingerprint → get-build → `update` or `build`+`testflight`. Add the Android equivalent: a `submit` job with `profile: production` (Amber and Clarity are iOS-only). Set `runtimeVersion.policy` to `fingerprint` for production only.
- **Gotchas:**
  - Changing the policy needs one new store binary before OTAs reach anyone (`amber/.eas/workflows/README.md:11-16`).
  - Never repack store binaries (`clarity/.eas/workflows/deploy-to-testflight.yml:3-5`).
  - **Convex deploy is not in these workflows** (`amber/.eas/workflows/README.md:20-21`). Xolace's store-gap rule (`CLAUDE.md` Deferred Deprecations) means `convex deploy` must run *before* the app job and stay manual or be gated.
  - Use EAS-stored submit credentials instead of the local `./xolace-7e7265d6b904.json` (`eas.json:32-34`, gitignored at `.gitignore:46`). Clarity gets ASC keys from the EAS credentials service (`clarity/.eas/workflows/README.md:105-106`).

### Strong

#### S1. Deterministic seed hooks for E2E — M
- **Source:** `clarity/app/dev-seed.tsx:12-60`, `clarity/app/_layout.tsx:152,309-311`, `oyelo/Oyelo/App/OyeloApp.swift:41-52`.
- **Why:** Xolace's seeding lives in Dev tools rows that only render under `__DEV__` (`docs/qa/starter-suggestions-e2e.md:16-34`). A Release-style `e2e` build has no `__DEV__`, so CI flows can't reach them.
- **Adopt:** `src/app/(protected)/dev-seed.tsx` behind `Stack.Protected guard={process.env.EXPO_PUBLIC_SEED_HOOKS === '1'}`. It reads `?scenario=new-user|follow-up-due|…` and calls the existing `convex/devTools.ts` mutations, which stay server-gated by `DEV_TOOLS_ENABLED` (`convex/devTools.ts:17-21`). Show `testID="dev-seed-result"`. Reuse the existing "as new user"/"real gate" logic so Argent flows and CI share it.
- **Gotcha:** keep both gates (build flag *and* server env). Never expose `internalMutation`s like `seedXolacer` (`convex/devTools.ts:190-196`).

#### S2. Label-gated PR preview OTA in a secrets-free environment — S
- **Source:** `clarity/.eas/workflows/pr-preview-update.yml:1-38`.
- **Why:** Reviewers can scan a QR code into a dev client to try a PR without a build. Running in a secrets-free env with a maintainer label means untrusted PR code never sees secrets.
- **Adopt:** copy the file. `branch: pr-${{ github.event.pull_request.number }}`, `environment: pr-preview` holding only public `EXPO_PUBLIC_*` (Clerk `pk_test_`, dev Convex URL, PostHog public token), and `base.ref == 'dev'`.
- **Gotcha:** custom EAS environments need the Production plan (`clarity/.eas/workflows/pr-preview-update.yml:13-18`). Under `appVersion` runtime, a preview build installed from 1.13.0 only accepts updates whose runtime matches.

#### S3. Commit E2E outputs as artifacts, summarized on the PR — S
- **Source:** `amber/e2e/ci/summarize.mjs:1-53`, `amber/.eas/workflows/pr-e2e.yml:159-185`, `amber/.gitignore:52-56`, `amber/.argent/artifacts/item-swiping/after-react.md`.
- **Why:** This is the "verifiable and repeatable artifact" CLAUDE.md asks for: junit + report.json + media in the run, a markdown digest on the PR, and `docs/qa/*.md` for long-lived sign-off.
- **Adopt:** `e2e/ci/summarize.mjs` (adapt to the chosen runner's report format). Also gitignore `.argent/recordings/` (`amber/.gitignore:50`). Xolace currently ignores all of `.argent/` while force-tracking flows (`.gitignore` `.argent/` entry).

#### S4. AI code review on PRs (Expo code-review CLI) — M
- **Source:** `clarity/.github/workflows/expo-code-review.yml:1-60`, `clarity/.github/workflows/expo-code-review-command.yml:81-161`, `clarity/.expo-code-review/config.jsonc:1-60`, `clarity/.expo-code-review/shared.md:1-20`.
- **Why:** A non-blocking second reviewer grounded in the repo's `AGENTS.md`/`CLAUDE.md`. Xolace has many local review skills but nothing runs on the PR itself.
- **Adopt:** copy the three workflows and `.expo-code-review/`. Set provider `anthropic`, `tokenEnv: ANTHROPIC_API_KEY`. Add a `convex.md` agent that checks the store-gap and Cognition-Layer rules from `CLAUDE.md`.
- **Gotchas:** keep base-ref-only checkout + `ecr verify-config` (`clarity/.github/workflows/expo-code-review-command.yml:81-126`). An OAuth access token expires, so prefer an API key (`clarity/.github/workflows/expo-code-review-command.yml:136-141`).

#### S5. Design-token drift audit as a CI step — S
- **Source:** `clarity/AGENTS.md:28-41`.
- **Why:** CLAUDE.md forbids hex colors outside fixed-palette tokens and React Native `Text`/`Image` imports, but nothing enforces either.
- **Adopt:** a `bun run audit:drift` script that fails on `grep -rEn '#[0-9a-fA-F]{3,8}\b' src --include='*.tsx'` (excluding the fixed-palette modules listed in CLAUDE.md) and on `from 'react-native'` imports of `Text`/`Image`. The import rule fits better as an ESLint `no-restricted-imports` entry in `eslint.config.js`.

#### S6. Issue → reproduce → fix → verified PR agent — L
- **Source:** `clarity/.github/workflows/agent-repro-dispatch.yml:1-51`, `clarity/.eas/workflows/agent-fix.yml:1-51`, `clarity/.agents/fix-prompt.md:1-200`.
- **Why:** Xolace already has `ready-for-agent` triage labels (`docs/agents/triage-labels.md`). The fix prompt's evidence policy and "no fix without a repro" rule (`clarity/.agents/fix-prompt.md:66-87,156-168`) also work well as guidance for local agents today.
- **Adopt (phase 1, S):** copy the evidence-class policy into `docs/agents/` and reference it from `CLAUDE.md`. **Phase 2 (L):** after G2/G4/S1, wire `ready-for-agent` → EAS `agent-fix.yml` using `CLAUDE_CODE_OAUTH_TOKEN`.
- **Gotchas:** `--dangerously-skip-permissions` is only acceptable on an ephemeral VM with repo-scoped tokens (`clarity/.eas/workflows/agent-fix.yml:44-47`). Don't set `ANTHROPIC_API_KEY` alongside the OAuth token (`clarity/.eas/workflows/agent-fix.yml:15-17`).

#### S7. EAS Metadata (`store.config.json`) — S/M
- **Source:** `clarity/eas.json:45-51`, `clarity/store.config.json:1-40`. Oyelo's `docs/ASO.md:5-20` shows why character counts matter.
- **Why:** Moves `docs/aso-metadata-v2.md` into a versioned, reviewable file that `eas metadata:push` applies.
- **Adopt:** `eas metadata:pull` once to bootstrap. Set `submit.production.ios.metadataPath`.

### Nice to have

| # | What | Source | Xolace adoption | Effort |
|---|---|---|---|---|
| N1 | TestFlight feedback → triage → queued autofix with a git-ref lock | `clarity/.eas/workflows/testflight-autofix.yml:1-115`, `clarity/.eas/workflows/testflight-sweep.yml:1-77`, `clarity/scripts/testflight-drain.sh:21-112` | Only after S6 is stable. Needs the ASC connection in EAS. | L |
| N2 | Agentic "explore" pass from the PR title/body/changed screens, non-blocking | `amber/e2e/ci/explore-goal.mjs:1-33`, `amber/.eas/workflows/pr-e2e.yml:141-157` | Add once the scripted suite is green. Restrict it from destructive actions (`amber/e2e.config.ts:63-70`). | S |
| N3 | Patch convention: bun `patchedDependencies` + `patches/README.md` (why, upstream, removal condition) | `clarity/package.json:77-80`, `clarity/patches/README.md:1-14`, `amber/package.json:91-94` | Use `bun patch <pkg>` when needed; keep README entries. Xolace's `//` comment style (`package.json:6,13`) already does the "why". | S |
| N4 | Pin the EAS build image per profile | `amber/eas.json:10-12`, `amber/CLAUDE.md:42-45` | Pin when an SDK/Xcode mismatch bites (fits the `buildFromSource` history at `package.json:13`). | S |
| N5 | Prettier formatting, with formatting-only commits kept separate | `oyelo/.swift-format:1-18`, `oyelo/AGENTS.md:13` | `prettier` + `prettier-plugin-tailwindcss`, plus a `format:check` CI job | S |
| N6 | Localization pipeline (extract → catalog → coverage test → TRANSLATION.md) | `oyelo/scripts/sync-strings.sh:1-53`, `oyelo/OyeloTests/LocalizationCatalogTests.swift:1-40`, `oyelo/TRANSLATION.md:1-46` | Only if Xolace localizes; `expo-localization` is installed (`package.json:97`) but there is no catalogue. Mental-health copy would need a tone/glossary doc like `oyelo/TRANSLATION.md`. | M |
| N7 | Store-free purchase testing | `oyelo/OyeloTests/ProStoreTests.swift:55-75`, `oyelo/Oyelo/Core/ProStore.swift:22-33`, `clarity/scripts/test-entitlements.ts:1-40` | Automation-only entitlement override under `EXPO_PUBLIC_AUTOMATION` so E2E can see Plus screens. Keep entitlement logic in pure functions (Xolace already has `src/features/purchases/plus-offer-policy.test.ts`). | S |
| N8 | One-screen "Project Environment" memory for agents | `clarity/.codex/MEMORY.md:1-17`, `amber/CLAUDE.md:25-37` | Add a short "Commands & CI" block at the top of `CLAUDE.md`: typecheck/test/e2e and which workflow does what. | S |
| N9 | Pinned agent skills (source + hash) | `amber/skills-lock.json:1-40` | Xolace already has `skills-lock.json`; fine as is. | — |
| N10 | Single version source | `amber/eas.json:3-4`, `clarity/eas.json:3-4` | Make `app.config.ts` read `version` from `package.json` and drop or regenerate `VERSION`. Fixes the 1.11.0 / 1.13.0 / 1.3.0.0 drift. | S |
| N11 | Web export to EAS Hosting | `clarity/package.json:70-73` | Only if a marketing web route is wanted. | S |
| N12 | Committed perf baselines (Argent profiler reports) | `amber/.argent/flows/app-wide-performance-baseline.yaml`, `amber/.argent/artifacts/item-swiping/*.md` | Store before/after profiler output next to perf PRs. | S |

Not worth adopting:
- Amber's bundled `EXPO_PUBLIC_DEV_PASSWORD` (G2 is strictly better).
- Clarity's trace-upload Stop hooks, which are specific to a hackathon (`clarity/.claude/settings.json`).
- Amber's `node --test` harness and Clarity's hand-rolled asserts. Xolace's Vitest + convex-test setup is already stronger (`vitest.config.ts:11-52`).

---

## 4. Proposed E2E plan for Xolace

### 4.1 Principles (drawn from the samples)
1. **Hermetic auth:** `+clerk_test` email + fixed OTP, only in automation builds with `pk_test_` (`clarity/app/(auth)/sign-in.tsx:20-50`). No password, no OAuth sheet.
2. **Release-style build, not Metro:** a simulator `e2e` profile with Updates disabled (`clarity/eas.json:23-35`, `clarity/app.config.ts:90`), so CI does not depend on `__DEV__` or a dev server.
3. **Deterministic data:** seed via deep link → server-gated dev mutations (`clarity/app/dev-seed.tsx:12-23`; Xolace `convex/devTools.ts:17-21`). Every test seeds what it needs and cleans up what it creates (`amber/e2e/amber.e2e.ts:37-55`).
4. **Fresh device per run:** clear the keychain, because Clerk sessions survive reinstalls (`amber/e2e/amber.e2e.ts:62-63`). Isolate local storage, as Oyelo's UI-test namespace does (`oyelo/Oyelo/App/OyeloApp.swift:35-46`).
5. **Select by testID:** add `testID`s to auth, tab bar, composer, follow-up chips and Dev seed result (`amber/e2e/amber.e2e.ts:66-74`; `clarity/app/(auth)/sign-in.tsx:254`).
6. **Artifact or it didn't happen:** junit + report + media uploaded, a PR comment summary, and long-lived sign-offs in `docs/qa/` (`amber/.eas/workflows/pr-e2e.yml:159-185`; Xolace `docs/qa/*.md`).
7. **Say what the fixture can't prove:** AI-pipeline nondeterminism, haptics, push and real OAuth need device/manual checks, recorded as in `clarity/.agents/fix-prompt.md:31-50` and Xolace `docs/qa/follow-up-haptics-e2e.md:5-6`.

### 4.2 Runner choice

| Option | Pros | Cons | Sample evidence |
|---|---|---|---|
| **A. Keep Argent flows locally + add an EAS CI runner** | The 17 existing flows stay the local authoring/QA tool, and the team already knows them | Argent needs a host simulator plus its MCP server; no sample runs Argent in CI | `.argent/flows/*`, `amber/.argent/flows/*` (local perf only) |
| **B. TesterArmy `e2e` on EAS Simulators** (Amber) | Proven end to end on Expo + Convex + Clerk. Leases hosted iPhones, can judge by vision, keeps a trace cache for zero-model CI replay, produces junit/markdown, and has an explore mode | Costs model calls (AI Gateway key), canary-pinned dependencies, iOS only in the sample | `amber/e2e.config.ts`, `amber/e2e/amber.e2e.ts`, `amber/.eas/workflows/pr-e2e.yml` |
| **C. `agent-device` via `eas simulator:exec`** (Clarity) | Plain shell, no MCP; good for agent repro/fix loops | No assertion framework; meant for agents, not a regression suite | `clarity/.agents/fix-prompt.md:101-140` |
| D. Maestro (EAS has a native job type) | Deterministic YAML close to Argent's, no model cost, Android + iOS | **Not used by any sample.** Claims about it come from outside these codebases. | — |

**Recommendation:** start with **B** for CI, because it is the only pattern proven end to end in a sample with the same stack. Keep **A** as the local authoring/QA loop. When translating Argent flows, map `tap: {text}` to `screen.getByTestId(...)` and `await: visible` to `expect(...).toBeVisible()`. Revisit D if model cost or flakiness becomes a problem, since the YAML flows translate almost one to one.

### 4.3 Phased rollout

**Phase 0 — prerequisites (S, 1 day)**
- G1 typecheck gate. G3 production env guard.
- Add `EXPO_PUBLIC_E2E_EMAIL=xolace-e2e+clerk_test@<domain>` to EAS `development`. Create that user in the Clerk dev instance and enable email code there.
- Widen `users.getOrCreate`'s `authProvider` to accept `"email"` (`convex/users.ts:86`; safe under CLAUDE.md's backwards-compatibility rules).

**Phase 1 — automation build (M, 2–3 days)**
- G2 automation sign-in in `src/features/auth/`. G4 `e2e` profile + `updates.enabled=false`.
- S1 `dev-seed` route with scenarios that cover today's flows: `new-user` (starter suggestions), `follow-up-due` (follow-up suite), `lantern-entry`.
- Storage isolation: under `EXPO_PUBLIC_AUTOMATION`, prefix the Zustand persist key (`src/lib/storage/unified-storage.ts`). The runner clears the keychain at start.
- Add `testID`s along the smoke path.
- Verify locally: `eas build -p ios --profile e2e`, install on a sim, then drive it with the existing Argent tooling.

**Phase 2 — first CI suite (M, 2–3 days)**
- `e2e.config.ts` adapted from `amber/e2e.config.ts:1-72`:
  ```ts
  const easBuildId = process.env.E2E_EAS_BUILD_ID;
  const iphone = mobile({
    platform: 'ios',
    device: easBuildId ? easSimulators({ buildId: easBuildId, tags: ['pr-e2e'] }) : process.env.E2E_DEVICE,
    videoTouches: easBuildId ? false : undefined,
  });
  const app = { bundleId: process.env.E2E_APP_ID ?? 'com.xolaceincorg.xolace.preview' };
  const context = `Xolace is a reflection app. Signed out, the auth screen shows an
  "Automation sign-in" button (testID automation-sign-in). Tabs: Home, Browse, Connect, Settings.
  Home's composer says "Tap to begin writing". Mirrors are AI-generated, so judge them by
  meaning, never exact text.`;
  export default {
    tests: 'e2e/**/*.e2e.ts', targets: [{ name: 'ios', engine: iphone, app }],
    workers: 1, reporters: ['list', 'junit', 'markdown'], agents: { default: { /* model, tools, context */ } },
  } satisfies E2EConfig;
  ```
- `e2e/smoke.e2e.ts`, one serial group (`amber/e2e/amber.e2e.ts:57-78` shape): clear keychain → open → automation sign-in → finish intake/onboarding by testID → assert tabs. Then `xolace://dev-seed?scenario=new-user` → assert the starter bubble rows (the existing `starter-rows` case). Then `follow-up-due` → assert check-in chips (the existing `follow-up-chips` case).
- Reflect pipeline test: submit a fixed prompt and `agent.waitFor('a mirror card is shown and no loading state', { vision: 'only', timeout: 120_000 })`, as Amber waits on AI processing (`amber/e2e/amber.e2e.ts:111-121`). Assert structure, never copy.
- `.eas/workflows/pr-e2e.yml` as in G5. Commit `.e2e/cache/` and gitignore the rest (`amber/.gitignore:52-56`).

**Phase 3 — hardening (S–M)**
- Make the suite a required check on `dev`. Add a weekly cron full run plus Android (`android.buildType: apk` profile).
- S3 PR summary comment. N2 explore pass (non-blocking).
- Point `docs/qa/*.md` at CI runs (run URL + artifact) instead of local Argent runs. Keep Argent for haptics/device checks.

**Phase 4 — agent loop (L, optional)**
- S6: the `ready-for-agent` label dispatches a fix agent that reuses the same `e2e` build, automation sign-in and seed hooks to reproduce and verify, following Clarity's evidence policy.

### 4.4 Failure modes to design for (per CLAUDE.md's "write down how it can fail")
1. Automation sign-in ships to prod → G3 guard throws at config time; the button also requires `pk_test_`.
2. A preview OTA replaces the E2E bundle → `updates.enabled=false` in automation builds (`clarity/app.config.ts:86-91`).
3. Fingerprint mismatch makes every PR do a full build → fingerprint job env identical to the profile (`amber/.eas/workflows/pr-e2e.yml:49-53`); keep JS-only tokens out of plugin-read files (`amber/CLAUDE.md:116-119`).
4. Shared test account fills with data → idempotent seeds plus best-effort cleanup (`amber/e2e/amber.e2e.ts:37-55,123-124`). Ideally a `devTools.resetE2EAccount` mutation gated by `DEV_TOOLS_ENABLED`.
5. Nondeterministic AI output → assert by vision and meaning, with `unique()` params (`amber/e2e/amber.e2e.ts:88-121`). LLM quality stays in `test:evals` (`package.json:35`).
6. Elements missing from the accessibility tree (sheets, tab/pushed screens) → testIDs on inner nodes plus position taps (`amber/e2e/amber.e2e.ts:12-35`); Xolace saw the same with Argent (`docs/qa/starter-suggestions-e2e.md:45-50`).
7. Leaked billable simulator sessions → let the runner own the lease (`amber/e2e.config.ts:7-11`); manual sessions always `simulator:stop` (`clarity/.agents/fix-prompt.md:135-140`).
8. Seed hooks reachable in production → build flag + `Stack.Protected` + server `DEV_TOOLS_ENABLED`, all three (`clarity/app/_layout.tsx:309-311`, `convex/devTools.ts:17-21`).
9. Backend/UI skew during CI → E2E runs against the dev Convex deployment. Push Convex changes for the PR to dev first, or the test exercises stale functions. Document this in the workflow README as Amber does for its setup (`amber/.eas/workflows/README.md:107-117`).
