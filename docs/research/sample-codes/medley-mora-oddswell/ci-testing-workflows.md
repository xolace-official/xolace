# CI/CD, testing and developer-workflow research: Medley, Mora, Oddswell

Researched 2026-10-14. Sample apps live outside the repo in
`/Users/nathan/Developer/XolaceInc/sample apps/`, abbreviated below:

- `medley/` = `Medley-main` (Expo SDK 57, Supabase, Sentry, Maestro, EAS Workflows)
- `mora/` = `Mora-main` (Expo SDK 58 preview, Supabase anonymous auth, Expo API routes)
- `oddswell/` = `oddswell-main` (Expo SDK 56, OpenAI via Expo API routes, `server/`)

Xolace paths are repo-relative. `path:N` is a line number, `path:N-M` a range.

**Baseline:** `docs/research/sample-codes/ci-testing-workflows.md` (2026-10-09,
from amber/clarity/oyelo). This doc does not repeat its recommendations. It refers
to them by their IDs (G1–G6, S1–S7, N1–N12, §4.x).

Bottom line: these three apps add less on testing than amber and clarity did. Mora
has a small `bun test` suite, Oddswell has no tests at all, and Medley says
"No test runner is currently configured". **Medley's CI is the strongest thing
here.** It runs Maestro on EAS, runs Argent as an agentic QA gate in CI, has a
Sentry release-health sentinel, and verifies each regression fix red → green. The
first two answer the question the prior doc left open in §4.2 (which E2E runner).
Mora adds two cheap gates: a "generated file is in sync" check and expo-doctor plus
export. Oddswell is mostly a list of things not to copy.

---

## 1. Delta: Xolace since 2026-10-09

| Area | Change | Evidence |
|---|---|---|
| AI eval gate in CI | **New.** `intensity-gate.yml` runs the live intensity eval on PRs that touch the classifier model, prompt, or offset files. It fails hard when `ANTHROPIC_API_KEY` is missing ("a skipped gate would read green"). None of the three samples has anything like it. | `.github/workflows/intensity-gate.yml:1-58`, commit `bf9a876` (2026-10-10, #533) |
| `ci.yml` | Unchanged: still `[dev, default]`, `bun-version: latest`, no typecheck. G1 is still open. | `.github/workflows/ci.yml:3-7,18-21` |
| EAS / OTA | Unchanged: no `.eas/`, no `e2e` profile, `runtimeVersion.policy: "appVersion"`. | `eas.json:6-37`, `app.config.ts:302-304` |
| E2E | Unchanged: 17 Argent flows, still local-only. No `.maestro/`. | `.argent/flows/*.yaml`, `.gitignore:59-61` |
| testIDs | **Measured for the first time: zero `testID=` in `src/`.** Every flow today selects on visible text or accessibility labels. | `grep -rn 'testID=' src` → 0 |
| Sentry | Already integrated, though the prior doc never mentioned it. Org `xolace-inc`, project `react-native`, Session Replay at 10% / 100% on error. The `environment` is chosen by `__DEV__` alone, so preview and TestFlight builds report as `production`. | `app.config.ts:266-272`, `src/app/_layout.tsx:41-57` |
| Theme wiring | **Drift found** by the check proposed in R1: `src/themes/alpha.css` defines `alpha-light`/`alpha-dark` but is not imported in `global.css` and not registered in `metro.config.js` or `ThemeName`. `CLAUDE.md` still lists `alpha` as a theme. | `src/themes/alpha.css:3,103`, `src/global.css:23-36`, `metro.config.js:44-64`, `src/context/app-theme-context.tsx:14-35` |

---

## 2. Per-app inventory

### 2a. medley/ (Expo SDK 57 + Supabase + Clerk + Sentry)

| Area | What they do | Evidence |
|---|---|---|
| Unit tests | None. AGENTS.md says "No test runner is currently configured". The only script is `lint` (`expo lint --fix`). | `medley/AGENTS.md:24`, `medley/package.json:6-12` |
| Lint/format | ESLint with expo + prettier + react-compiler + tanstack-query plugins. Prettier config is committed. | `medley/eslint.config.js:8-26`, `medley/.prettierrc:1-11` |
| E2E: Maestro | `.maestro/regressions/` holds one flow per production bug, named after its Sentry short ID. The header comment records the Sentry URL, the bug, and the user path. Assertions use user-facing text or testIDs. | `medley/.maestro/regressions/README.md:1-16` |
| Maestro smoke | `000-smoke.yaml`: `launchApp clearState` → `assertVisible "Get Started"`. It keeps the suite non-empty. | `medley/.maestro/regressions/000-smoke.yaml:1-7` |
| Bug-derived flow | `react-native-2d.yaml` catches a cold-launch main-thread hang by bounding the first frame with `extendedWaitUntil … timeout: 4000`. It notes that Maestro ≥2 rejects `assertVisible`+`timeout`. It runs unauthenticated **because "No test account is seeded in CI"**. | `medley/.maestro/regressions/react-native-2d.yaml:13-29` |
| Maestro on EAS | Native `type: maestro` job with `build_id`, `flow_path`, `record_screen: true`, `retries: 1`. | `medley/.eas/workflows/release-captain.yml:136-144`, `medley/.eas/workflows/deploy.yml:67-75` |
| Main-push sweep | Every push to main: OTA to the `preview` channel, rebuild the "surfboard" preview build only when the fingerprint changes, a simulator build plus the full Maestro sweep. On failure it dispatches the triage agent and posts to Slack. | `medley/.eas/workflows/deploy.yml:1-102` |
| Release router | `v*` tag → fingerprint → `get-build` (production). Native code unchanged: changelog → `type: doc` report → `require-approval` → `update` to production with Sentry sourcemaps. Native code changed: store and simulator builds → Maestro gate + agentic QA gate → report → approval → `submit` → Sentry release. | `medley/.eas/workflows/release-captain.yml:1-281` |
| Agentic QA gate | On `runs_on: macos-medium`, a headless `claude -p` session with Argent as MCP drives the simulator `.app`. The prompt lays out a fixed checklist. The **contract** is that the agent writes `qa-artifacts/verdict.json`; a missing verdict counts as a failure. Artifacts upload with `if: always()`. | `medley/.eas/workflows/release-captain.yml:146-204`, `medley/.agents/release-qa-prompt.md:1-82` |
| Gate hardness | The QA gates feed into the human approval through `after:`. They do not block on their own. The README says how to make them hard (`needs:`). | `medley/.eas/workflows/release-captain.yml:231-237`, `medley/.eas/workflows/README.md:77-81` |
| Release sentinel | Runs hourly on cron. A zero-dependency Node script polls Sentry release health: crash-free sessions/users, `firstRelease` issues, `is:regressed`, and a last-hour spike. Thresholds come from env vars, and the script exits non-zero if the gate itself breaks. When the release is unhealthy it posts to Slack, dispatches triage, and runs an agentic on-device repro. | `medley/.eas/workflows/release-sentinel.yml:1-183`, `medley/scripts/release-health-gate.mjs:1-50,179-217` |
| Stateless dedup | Before acting, the sentinel searches GitHub for an open PR, an issue, or an `agent/<id>` branch for the top Sentry issue, so each issue fires only once. | `medley/.eas/workflows/release-sentinel.yml:60-84` |
| Triage agent | Sentry issue + Session Replay → root cause (Seer is consulted best-effort) → minimal fix → Maestro flow → a "Lessons" entry in AGENTS.md → PR labelled `agent-fix`. If it cannot find the cause with confidence, it opens an issue instead of guessing. | `medley/.agents/triage-prompt.md:25-96`, `medley/AGENTS.md:54-56` |
| Red → green | On the `agent-fix` label: run the Maestro suite on the pre-fix simulator build (it must fail), then on the PR build (it must pass), then comment the verdict. | `medley/.eas/workflows/agent-fix-verify.yml:1-63` |
| PR previews ("channel surfing") | Each PR publishes an OTA update to a channel named after its branch. Testers on the **release-mode** preview build scan a QR code that deep-links to an in-app switcher (`Updates.setUpdateRequestHeadersOverride`). If the fingerprint changed, a new build is made and linked. Branch deletion tears down the channel and update branch. | `medley/.eas/workflows/preview.yml:1-109`, `medley/hooks/use-update-channel.ts:1-58`, `medley/.eas/workflows/cleanup-preview.yml:1-27`, `medley/eas.json:12-18` |
| Simulator profile | `simulator` profile on its own `simulator` channel. Nothing publishes to that channel, so it never receives an OTA. | `medley/eas.json:19-28` |
| Agent docs | `CLAUDE.md` only points to `AGENTS.md`. The workflow README explains the whole loop, the env vars, the tunables, and how to adopt it elsewhere. Argent is in the VS Code MCP config. | `medley/CLAUDE.md:1-3`, `medley/.eas/workflows/README.md:1-100`, `medley/.vscode/mcp.json` |
| Drift / defects | AGENTS.md says "Expo 54" while the package is on `^57`. Two files reference `post-release-regression.yml`, which does not exist (the sweep lives in `deploy.yml`). The README says to pin `claude-code`/`argent`, but the workflows install `@latest`. Simulator QA builds use `environment: production`. | `medley/AGENTS.md:7` vs `medley/package.json:29`, `medley/.maestro/regressions/README.md:9`, `medley/.eas/workflows/agent-fix-verify.yml:9-10`, `medley/.eas/workflows/README.md:98` vs `release-captain.yml:161`, `medley/.eas/workflows/deploy.yml:62` |

### 2b. mora/ (Expo SDK 58 preview + Supabase anonymous auth + Expo API routes)

| Area | What they do | Evidence |
|---|---|---|
| Scripts | `typecheck`, `test` (`bun test src`), `check` = typecheck && lint && test, `theme:generate`, `theme:check` | `mora/package.json:5-16` |
| Release checklist | The README lists the pre-merge commands: `bun run check`, `theme:check`, `bunx expo-doctor`, `bunx expo export --platform all` | `mora/README.md:21-26` |
| Theme drift check | `globals.css` is the single palette source. The script regex-parses the `@variant light/dark` blocks into `src/theme/colors.ts`. `--check` throws if the committed file differs. | `mora/scripts/generate-theme.ts:1-23`, `mora/docs/design-system.md:7` |
| Unit tests | 8 `bun:test` files (394 lines) for pure logic: serving math, calendar edges, draft reconciliation against replayed tool results, persistence through `mock.module` of the storage engine. | `mora/src/features/chat/transcript.test.ts:21-27`, `mora/src/stores/persistence.test.ts:1-40` |
| API-route tests | Request schemas reject bad input **before any provider call**: system-role messages, oversize history, oversize bodies (413), remote image URLs (SSRF guard). | `mora/src/server/ai/request.test.ts:1-49` |
| Auth for testing | Supabase anonymous sign-in during onboarding. Every API route requires a bearer token (`authenticated()` wrapper). This gives automated and manual testers a real token without credentials. | `mora/src/contexts/auth-context.tsx:40-43`, `mora/src/screens/onboarding-screen.tsx:48`, `mora/src/server/auth.ts:16-33`, `mora/README.md:9` |
| Evidence doc | `docs/verification.md` contains: dated environment, each command with its result, a "behavior vs. how verified" table, API smoke results (401/400/200), a manual byte-scan of the exported bundle for 6 private credentials, an explicit **remaining release checks** list, and a 10-step repeatable manual regression. | `mora/docs/verification.md:1-74` |
| CI | Minimal EAS Workflows: every push to main builds and submits iOS to TestFlight (no fingerprint, no checks), and every PR publishes a preview update. **No workflow runs `check`.** No GitHub Actions. | `mora/.eas/workflows/build-and-submit.yml:1-21`, `mora/.eas/workflows/preview.yml:1-12` |
| Agent docs | None (no AGENTS.md or CLAUDE.md). Supabase MCP is in `.mcp.json`. | `mora/` listing, `mora/.mcp.json` |
| Env template | `.env.example` splits public `EXPO_PUBLIC_*` values from server-only keys, with "Never use an EXPO_PUBLIC_ prefix for these" | `mora/.env.example:1-21` |

### 2c. oddswell/ (Expo SDK 56 + OpenAI via Expo API routes)

| Area | What they do | Evidence |
|---|---|---|
| Tests / CI | **None.** Scripts are start/run/lint only. No `.github/`, no `.eas/`, no test files, no typecheck script. | `oddswell/package.json:5-11`, `oddswell/` listing |
| Structured LLM output | Responses API `json_schema` with `strict: true`. Hand-written JSON schemas set `additionalProperties: false`. | `oddswell/app/api/analysis/mma+api.ts:146-171`, `oddswell/server/schemas.ts:1-60` |
| Deterministic post-processing | Model output is never shown raw. It goes through em-dash stripping, probability normalization, a market/model blend that **overrides** the model's headline number, `validateAndRepairFightResult`, and then a `repairsApplied` count that lowers the confidence score. | `oddswell/app/api/analysis/mma+api.ts:183-255`, `oddswell/utils/combatValidation.ts:1-40`, `oddswell/utils/copySanitize.ts:1-30` |
| Research cache | In-memory TTL cache with in-flight dedup | `oddswell/server/researchCache.ts:1-37` |
| API "auth" | `+middleware.ts` compares `x-api-secret` to `API_SECRET`. The client sends `EXPO_PUBLIC_API_SECRET`, which means the secret is **shipped in the bundle**. `httpClient` falls back to `EXPO_PUBLIC_OPENAI_API_KEY`. | `oddswell/app/+middleware.ts:10-20`, `oddswell/core/api-client.ts:44`, `oddswell/server/httpClient.ts:13-18`, `oddswell/.env.local.example` |
| Native workarounds | Config plugins that carry an upstream issue link and a "remove once fixed" condition (dev-launcher build cycle, dSYM copy) | `oddswell/plugins/with-fix-dev-launcher-cycle.js:1-19`, `oddswell/plugins/with-ios-embedded-framework-dsyms.js:1-15` |
| Agent docs | Short AGENTS.md that routes to a Cursor project skill. The skill uses progressive-disclosure reference files and `disable-model-invocation: true`. | `oddswell/AGENTS.md:1-32`, `oddswell/.cursor/skills/sports-analysis-ai/SKILL.md:1-30` |

### 2d. How this changes the prior doc's runner choice (§4.2)

The prior doc said Maestro is "not used by any sample" and that "no sample runs
Argent in CI". **Medley now gives evidence for both.** It runs a deterministic
Maestro suite through EAS's native `type: maestro` job, and it runs Argent in CI
on an EAS macOS worker under a headless Claude agent with a verdict contract
(`medley/.eas/workflows/release-captain.yml:136-204`). Revised recommendation:
**Maestro for the blocking regression suite, Argent for the agentic and local
QA layer.** TesterArmy (option B) becomes optional. Xolace's Argent flows use
text selectors, `await visible`, `assert hidden` and `run` sub-flows
(`.argent/flows/starter-rows.yaml:1-30`), which map almost one to one onto
Maestro's `tapOn`, `extendedWaitUntil`, `assertNotVisible` and `runFlow`.

---

## 3. Recommendations

Effort: **S** < half a day, **M** 1–3 days, **L** a week or more. Most of these
depend on prior G2 (automation sign-in), G4 (`e2e` profile) and S1 (seed hooks)
for anything behind auth.

### Strong

#### R1. `theme:check`: enforce CLAUDE.md's theme rules in CI (S)
- **Source:** `mora/scripts/generate-theme.ts:20-23` (a `--check` mode that throws on drift), `mora/docs/design-system.md:7`.
- **Why:** CLAUDE.md requires that "all themes must define the same set of variables" and gives a 4-place checklist for adding a theme (CSS file, `global.css` import, `metro.config.js` `extraThemes`, `ThemeName`). Nothing enforces either. Xolace doesn't need Mora's generator, because `useThemeColor` reads tokens at runtime, but it does need Mora's check.
- **Adopt:** `scripts/theme-check.mjs`. I ran it against the repo today: 20 variants, 60 tokens each, and it flagged one real issue, `src/themes/alpha.css is not imported in src/global.css`.
  ```js
  // scripts/theme-check.mjs: CLAUDE.md "Adding themes" + "same set of variables", enforced.
  import { readFileSync, readdirSync } from 'node:fs';
  import { join } from 'node:path';
  const root = process.argv[2] ?? '.';
  const read = (p) => readFileSync(join(root, p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const errors = [];
  // 1. every theme file on disk is imported by global.css
  const imported = [...read('src/global.css').matchAll(/@import\s+"\.\/(themes\/[^"]+)"/g)].map((m) => `src/${m[1]}`);
  const onDisk = [];
  const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).forEach((e) =>
    e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.css') && onDisk.push(join(d, e.name)));
  walk('src/themes');
  for (const f of onDisk) if (!imported.includes(f)) errors.push(`${f} is not imported in src/global.css`);
  // 2. every @variant defines the same --vars as base `light`
  const variants = new Map();
  for (const f of ['src/global.css', ...imported])
    for (const m of read(f).matchAll(/@variant\s+([\w-]+)\s*\{([^}]*)\}/g))
      variants.set(m[1], { f, vars: new Set([...m[2].matchAll(/(--[\w-]+)\s*:/g)].map((x) => x[1])) });
  const ref = variants.get('light')?.vars ?? new Set();
  for (const [name, { f, vars }] of variants) {
    const missing = [...ref].filter((v) => !vars.has(v));
    if (missing.length) errors.push(`${name} (${f}) missing ${missing.join(', ')}`);
  }
  // 3. every non-base variant is registered in metro extraThemes and the ThemeName union
  const metro = read('metro.config.js'), ctx = read('src/context/app-theme-context.tsx');
  for (const name of variants.keys()) {
    if (name === 'light' || name === 'dark') continue;
    if (!metro.includes(`'${name}'`)) errors.push(`${name} missing from metro.config.js extraThemes`);
    if (!ctx.includes(`'${name}'`)) errors.push(`${name} missing from ThemeName`);
  }
  console.log(`${variants.size} variants, ${ref.size} tokens each`);
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(errors.length ? 1 : 0);
  ```
  Add `"theme:check": "node scripts/theme-check.mjs"` and a CI step. First decide what to do with `alpha.css`: wire it up, or delete it and remove it from CLAUDE.md.
- **Catches:** a new theme missing a token, so a HeroUI component falls back silently. Also a theme that was added but never registered, and doc drift. This complements prior S5 (hex/`Text` drift), which looks at components rather than themes.
- **Ceiling:** the regex assumes `@variant` blocks contain no nested braces, which holds for every theme today. If a theme starts nesting rules, switch the parse to `postcss`.

#### R2. One `check` script plus expo-doctor and an export gate in CI (S)
- **Source:** `mora/package.json:13`, `mora/README.md:21-26`, `mora/docs/verification.md:10-14`.
- **Why:** Lint and Vitest never bundle the app. A Metro resolution failure (a missing `.ios.tsx`/`.android.tsx` sibling, a broken `@/src` alias in a client file, a Uniwind config error) only shows up at `eas build` time. That costs a build slot and about 20 minutes. `expo export` finds the same class of failure in a few minutes on Linux. `expo-doctor` checks SDK version alignment, and that matters given the `expo.install.exclude` and `buildFromSource` pins (`package.json:5-18`).
- **Adopt:**
  ```jsonc
  // package.json
  "typecheck": "tsc --noEmit && tsc --noEmit -p convex",   // prior G1
  "check": "bun run typecheck && bun run lint && bun run test && bun run theme:check"
  ```
  ```yaml
  # .github/workflows/ci.yml (new job)
  bundle:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:   # app.config.ts requireEnv() throws without these (app.config.ts:3,294-296); public values only
      EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME: ci-placeholder
      EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID: ci-placeholder
      EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID: ci-placeholder
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: 1.3.x }
      - run: bun install --frozen-lockfile
      - run: bunx expo-doctor
      - run: bunx expo export --platform ios --platform android --output-dir dist
      - run: node scripts/scan-bundle.mjs dist   # R3
  ```
- **Gotchas:** start `expo-doctor` as `continue-on-error: true` and look at what it reports. The deliberate `exclude` pins should be skipped, but confirm that on the first run before making the job required. Leave out `--platform web` unless the web target is meant to build.
- **Catches:** broken bundles before `eas build`, and SDK version drift after a `bunx expo install`.

#### R3. Scan the exported bundle for server secrets (S)
- **Source:** `mora/docs/verification.md:50` (a manual "byte scan of 47 exported client files" for 6 credentials). The anti-pattern this guards against: `oddswell/server/httpClient.ts:13-18` (an `EXPO_PUBLIC_OPENAI_API_KEY` fallback), `oddswell/core/api-client.ts:44` (an `EXPO_PUBLIC_API_SECRET` sent from the client).
- **Why:** Prior G3 rejects bad env *names* at config time. This check looks at the actual shipped JS, so it also catches a secret that reached the bundle through an import chain or an inlined constant.
- **Adopt:** `scripts/scan-bundle.mjs`:
  ```js
  import { readFileSync, readdirSync, statSync } from 'node:fs';
  import { join } from 'node:path';
  // Server-only key shapes. Public keys (pk_*, EXPO_PUBLIC_*) are expected in the bundle.
  const PATTERNS = [/sk-ant-[\w-]{20,}/, /sk-proj-[\w-]{20,}/, /\bsk_(live|test)_\w{20,}/, /\bsntrys_\w{20,}/, /\bphx_\w{20,}/, /\b(prod|dev):[\w-]+\|[\w=]{20,}/];
  const files = [];
  const walk = (d) => readdirSync(d).forEach((n) => { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : /\.(js|hbc|map|json)$/.test(n) && files.push(p); });
  walk(process.argv[2] ?? 'dist');
  const hits = files.flatMap((f) => { const s = readFileSync(f, 'latin1'); return PATTERNS.filter((r) => r.test(s)).map((r) => `${f}: ${r}`); });
  hits.forEach((h) => console.error(`✗ secret-shaped string in ${h}`));
  console.log(`${files.length} files scanned`);
  process.exit(hits.length ? 1 : 0);
  ```
- **Catches:** an Anthropic/OpenAI/Clerk-secret/Sentry/PostHog-personal/Convex-deploy key in client JS. Xolace has all of those providers (`package.json:47-71`), so the surface is real even though all model calls are server-side by rule (`CLAUDE.md` Cognition Layer).

#### R4. Maestro regression suite on EAS, one flow per `docs/bug-log.md` entry (M)
- **Source:** `medley/.maestro/regressions/README.md:1-16`, `medley/.maestro/regressions/react-native-2d.yaml:1-29`, `medley/.eas/workflows/deploy.yml:58-75`, `medley/.agents/triage-prompt.md:58-67`.
- **Why:** Xolace already keeps a rich bug log with root causes (`docs/bug-log.md:18-421`), and CLAUDE.md sends agents there first. What it lacks is a guard that keeps each fixed bug fixed. Several entries can be expressed as a Maestro flow: dead buttons on Android, a hang on the rate-limit screen, a spinner that never ends. Maestro runs on EAS with no model cost and handles both iOS and Android (`android.buildType: apk` in the profile, as in `medley/eas.json:25-27`).
- **Adopt:**
  - `.maestro/regressions/000-smoke.yaml`. It needs no auth, so it works before G2 lands:
    ```yaml
    # Baseline: cold launch reaches the onboarding promise screen within 8s.
    # Source text: src/features/onboarding/components/screens/PromiseScreen.tsx:114
    appId: com.xolaceincorg.xolace.preview   # APP_VARIANT=preview, the e2e profile (prior G4)
    ---
    - launchApp:
        clearState: true
        clearKeychain: true                   # Clerk sessions survive reinstall (prior §4.1 #4)
    - extendedWaitUntil:
        visible: "I.d like that"              # Maestro text is regex; avoids the curly-apostrophe mismatch
        timeout: 8000
    ```
  - `.eas/workflows/regressions.yml`:
    ```yaml
    name: regressions
    on:
      push: { branches: [dev] }
      schedule: [{ cron: '0 6 * * *' }]
      workflow_dispatch: {}
    jobs:
      build_sim:
        type: build
        environment: development      # NOT production: Medley's deploy.yml:62 would point E2E at prod Convex
        params: { platform: ios, profile: e2e }
      regressions:
        type: maestro
        needs: [build_sim]
        params:
          build_id: ${{ needs.build_sim.outputs.build_id }}
          flow_path: .maestro/regressions
          record_screen: true
          retries: 1
    ```
  - Add a `**Regression flow:** .maestro/regressions/<slug>.yaml` line to the bug-log entry template (CLAUDE.md "Debugging"). New entries carry a flow whenever the bug is reproducible in a simulator.
- **Gotchas:**
  - Xolace has **zero testIDs** (§1). Flows will lean on copy, and copy changes. Add testIDs along the smoke path first (prior §4.1 #5).
  - Use `extendedWaitUntil` for timing-bound checks; Maestro ≥2 rejects `assertVisible` with a timeout (`medley/.maestro/regressions/react-native-2d.yaml:21-23`).
  - Anything behind auth needs G2 + S1. Medley never solved this and only covers unauthenticated paths (`react-native-2d.yaml:16-18`).
  - Keep Argent flows for haptics and Dev-tools-driven QA. Translate a flow only when it guards a bug.
- **Catches:** recurrence of known bugs, launch crashes and hangs, OTA bundles that crash a fresh install.

#### R5. Run QA in CI on an EAS macOS worker: first the existing Argent flows, then an agentic verdict gate (M)
- **Source:** `medley/.eas/workflows/release-captain.yml:146-204`, `medley/.agents/release-qa-prompt.md:1-82`.
- **Why:** Medley shows Argent running headless on an EAS `macos-medium` worker against a downloaded simulator `.app`. That opens a cheaper path than prior §4.2 option B: **run the 17 existing flows in CI without translating them**, once G2/G4/S1 make them independent of `__DEV__` and a signed-in device (`docs/qa/starter-suggestions-e2e.md:18-21`).
- **Adopt (phase A, deterministic):** a job that installs pinned `@swmansion/argent@<ver>`, boots a headless sim, installs the `.app`, and runs `argent flow run <suite>` (the command from `docs/qa/starter-suggestions-e2e.md:14-16`). Upload the logs as artifacts. *Unverified:* that `argent flow run` works without an MCP client attached. Test it locally with no Claude session open before wiring CI.
- **Adopt (phase B, agentic):** copy Medley's verdict contract exactly, because it shares a principle with Xolace's own `intensity-gate.yml:45-53` (a skipped gate must not read as green):
  ```yaml
  - id: verdict
    run: |
      [ -f qa-artifacts/verdict.json ] || { echo "no verdict = fail"; exit 1; }
      STATUS=$(node -p "require('./qa-artifacts/verdict.json').status || 'fail'")
      [ "$STATUS" = "pass" ] || exit 1
  ```
  The prompt checklist for Xolace: cold start → automation sign-in → Home composer → submit the fixed prompt → mirror card rendered (structure only, never the copy) → Lantern → Settings → a theme switch. Write screenshots to `qa-artifacts/`.
- **Gotchas:**
  - Pin `@anthropic-ai/claude-code` and `@swmansion/argent`. Medley's README asks for pinning, but its workflows install `@latest` (`medley/.eas/workflows/README.md:98` vs `release-captain.yml:161`).
  - `${{ }}` does not resolve in step-level env on EAS workers. Medley finds the `.app` under `$TMPDIR` instead (`release-captain.yml:164-172`) and guards against literal `${{` in its script (`medley/scripts/release-health-gate.mjs:29-34`).
  - `--dangerously-skip-permissions` is only acceptable on an ephemeral worker with repo-scoped secrets (`medley/.eas/workflows/agent-triage.yml:42-46`). Use `CLAUDE_CODE_OAUTH_TOKEN` without `ANTHROPIC_API_KEY` (`medley/.eas/workflows/agent-triage.yml:6-10`). Note that Xolace's intensity gate already uses `ANTHROPIC_API_KEY` in GitHub Actions; keep the two in separate environments.
- **Catches:** visual and flow breakage that a fixed script would miss. The verdict JSON plus screenshots also give CLAUDE.md the repeatable artifact it asks for.

#### R6. Sentry release-health sentinel → GitHub issue (S, then M)
- **Source:** `medley/.eas/workflows/release-sentinel.yml:1-183`, `medley/scripts/release-health-gate.mjs:1-232`.
- **Why:** Xolace already pays for the inputs: Sentry plus Session Replay are live (`src/app/_layout.tsx:41-57`, `app.config.ts:266-272`). Nobody watches release health automatically, and fingerprint-routed OTAs (prior G6) make shipping faster, which raises the stakes.
- **Adopt (phase 1, S):** copy `release-health-gate.mjs` as is; it has zero dependencies and is configured by env vars (`SENTRY_ORG=xolace-inc`, `SENTRY_PROJECT=react-native`). Copy the sentinel's `health` + `dedup` + `alert` jobs, but replace Slack and `agent-triage` with `gh issue create --label needs-triage`, so it feeds Xolace's existing triage roles (`docs/agents/triage-labels.md`). **Phase 2 (M):** after R4 and R7, dispatch an agent the way Medley does.
- **Gotchas:**
  - **Fix the Sentry environment first.** `environment: __DEV__ ? 'development' : 'production'` (`src/app/_layout.tsx:44`) puts preview and TestFlight crashes into production health. Derive it from `APP_VARIANT` (pass it through `extra` in `app.config.ts`).
  - Release names must follow `bundleId@version+build`, which the Expo plugin produces (`medley/.eas/workflows/README.md:95-97`). The three variant bundle ids keep the variants apart.
  - Tune `MIN_SESSIONS` (default 50) to Xolace's real daily sessions, or the gate will always return "insufficient data" (`medley/scripts/release-health-gate.mjs:179-181`).
- **Catches:** a crash spike or new issues after an OTA within an hour, instead of when a user complains.

#### R7. Red → green proof for regression fixes (M)
- **Source:** `medley/.eas/workflows/agent-fix-verify.yml:1-63`.
- **Why:** A regression flow only has value if it fails without the fix. This is the "write down how it can fail" rule from CLAUDE.md, enforced mechanically. It applies to human fixes too, not just agent fixes.
- **Adopt:** a `regression-fix` label triggers two `type: maestro` jobs: the base branch's latest `e2e` simulator build (via `get-build`), then a fresh PR build, followed by a `github-comment` with both outcomes. **Improve on Medley:** point `flow_path` at *only the new flow* for the RED run. Medley's RED run uses the whole directory (`agent-fix-verify.yml:25-32`), so any unrelated failing flow "proves" reproduction. Also note that `get-build` there has no fingerprint or commit filter (`agent-fix-verify.yml:18-23`), so "pre-fix" really means "latest".
- **Catches:** tests that pass for the wrong reason, and fixes that don't fix.

### Nice to have

#### R8. Channel-surfing PR previews on a release-mode build (S/M; extends prior S2)
- **Source:** `medley/hooks/use-update-channel.ts:1-58`, `medley/.eas/workflows/preview.yml:45-109`, `medley/.eas/workflows/cleanup-preview.yml:1-27`, `medley/eas.json:12-18`.
- **What's new vs. S2:** Clarity's preview loads into a dev client. Medley's loads into a **Release** preview build, so reviewers see real performance and Hermes behaviour without Metro. It also rebuilds on its own when the fingerprint changes and cleans up channels when the branch is deleted. Keep Clarity's label gate and secrets-free environment from S2. Xolace is on SDK 57 (`package.json:77`), the same as Medley, so `setUpdateRequestHeadersOverride` is available.
- **Gotcha:** under `runtimeVersion: appVersion` (`app.config.ts:302-304`), an update from a PR that changed native code still *matches* the installed build and crashes it. Surfing is only safe after G6 moves to the fingerprint runtime policy. Gate the switcher with `!__DEV__ && EXPO_PUBLIC_CHANNEL_SURF === '1'`, as Medley does (`use-update-channel.ts:16-17`).

#### R9. Approval-gated release with a `type: doc` report and a store-gap checkpoint (S; extends prior G6)
- **Source:** `medley/.eas/workflows/release-captain.yml:49-89,206-237` (changelog job, `doc` report, `require-approval`).
- **Xolace twist:** the store-gap rule says backend deploys before the binary, and prior G6 notes that Convex deploy is in no workflow. Add a `require-approval` job **before** the OTA/submit job whose `doc` lists `git diff --name-only <prev-tag>..HEAD -- convex/` and asks "was `convex deploy --prod` run and are all removed args on the Pending Deprecations ledger?". That makes the CLAUDE.md rule a click in the pipeline.

#### R10. Template for `docs/qa/*.md` evidence (S)
- **Source:** `mora/docs/verification.md:5-14,52-72`.
- **Adopt:** `docs/qa/_template.md` with: environment (build, device, deployment, tool versions); commands run with results; a "behaviour | how verified" table; **"Not verified / remaining release checks"**; and steps to repeat. Xolace's QA docs already have run and repeat sections (`docs/qa/starter-suggestions-e2e.md:7-19`). The explicit not-verified list is the missing piece, and it is what keeps sign-off docs honest about AI non-determinism, haptics and OAuth (prior §4.1 #7).

#### R11. Production telemetry on deterministic LLM output repairs (S)
- **Source:** `oddswell/app/api/analysis/mma+api.ts:183-255`: the model's output is normalized and repaired, and the `repairsApplied` count lowers confidence.
- **Why:** Xolace's evals run before merge (`convex/ai/prompts/__evals__/harness.eval.ts:1-30`, `intensity-gate.yml`), but nothing measures prompt drift in production between eval runs. Xolace already has validators such as `validateQuote` (`convex/ai/quotesQuality.ts:47`). Count each rejection or repair as a PostHog event (`@posthog/convex`, `package.json:68`). A rising rate is an early eval signal from real traffic, and it never logs content (privacy-first).

---

## 4. Outside-the-box ideas

1. **A backward-compatibility smoke for the store gap.** Keep the simulator `e2e` build of the *last store-published* version, tagged in EAS. Before `convex deploy --prod`, run `000-smoke` + sign-in + one reflection against the dev deployment that already has the new functions. This is Medley's "run the old build against new code" idea (`agent-fix-verify.yml:18-32`) aimed at the Deferred Deprecations rule. It catches a removed arg or a narrowed union (the `daily_quotes.reaction` case in CLAUDE.md says that one "throws rather than degrading").
2. **A local `/regress <sentry-id>` skill instead of a CI agent.** Medley's triage prompt (`medley/.agents/triage-prompt.md:25-72`) works just as well run locally with the developer's own Sentry access. It writes the Maestro flow plus a bug-log entry. You get most of Medley's loop with no CI secrets and no `--dangerously-skip-permissions`.
3. **A theme screenshot matrix.** With 20 variants, one Maestro or Argent run per release could screenshot three key screens in each theme (deep-linking the theme via S1's seed route) into one contact-sheet artifact. Mora reviewed its whole reference set as contact sheets (`mora/docs/verification.md:22`). This catches contrast bugs that R1's token check can't see.
4. **A dedicated "dead" channel instead of `updates.enabled=false`.** Medley's simulator profile uses channel `simulator`, which nothing ever publishes to (`medley/eas.json:19-28`). That is a zero-code way to keep QA builds deterministic. It's fine as a stopgap until prior G4's config change lands.
5. **Hard versus soft gates as an explicit decision.** Medley documents a single line to flip QA from advisory to blocking (`medley/.eas/workflows/README.md:79-81`). Xolace could adopt the same convention: start every new gate as advisory with `continue-on-error`, and promote it once it has run green on N consecutive runs. The intensity gate is already blocking, so that precedent is there.

---

## 5. Ranked shortlist

| Rank | Item | Effort | Why this order |
|---|---|---|---|
| 1 | R1 `theme:check` | S | Already written and run; it found the `alpha.css` drift today |
| 2 | R2 `check` + expo-doctor + export job (with prior G1) | S | Finds bundle failures before build minutes are spent |
| 3 | R3 bundle secret scan | S | A few lines on top of R2's export; protects a privacy-first app |
| 4 | R6 phase 1 sentinel → GitHub issue (plus the Sentry `environment` fix) | S | Sentry is already paid for and live |
| 5 | R4 Maestro smoke + regression sweep on EAS | M | The smoke flow works before G2; it grows with bug-log |
| 6 | R10 QA evidence template | S | Documentation only; makes sign-offs comparable |
| 7 | R5 Argent flows in CI, then the agentic verdict gate | M | Needs G2/G4/S1; reuses the 17 flows |
| 8 | R7 red → green for `regression-fix` PRs | M | Needs R4 |
| 9 | R9 approval + store-gap checkpoint | S | Comes with prior G6 |
| 10 | R8 channel surfing | S/M | Needs the fingerprint runtime policy from G6 first |
| 11 | R11 repair telemetry | S | Low cost; signal value grows with traffic |

### Skip

- **Medley's autonomous triage → fix PR loop in CI** (`agent-triage.yml`): it is premature until R4 and R7 exist. A fix agent without a verified regression flow is a guess. Use idea 2 (local skill) first.
- **Mora's anonymous auth as an E2E strategy** (`mora/src/contexts/auth-context.tsx:40-43`): there is no Clerk equivalent in this stack. Adding a guest path would be a product and privacy change made for testing's sake. Prior G2 (`+clerk_test` OTP) already gives automation a real token.
- **Mora's generated `colors.ts`** (`mora/scripts/generate-theme.ts:19-22`): Xolace reads tokens at runtime with `useThemeColor`, so there is nothing to generate. Take only the `--check` idea (R1).
- **`bun test` / `mock.module` unit tests** (`mora/src/stores/persistence.test.ts:1-40`): Vitest + convex-test is already stronger, and CLAUDE.md prefers E2E over writing more unit tests.
- **Mora's push-to-main → TestFlight with no checks or fingerprint** (`mora/.eas/workflows/build-and-submit.yml:1-21`): this is a weaker form of prior G6.
- **Oddswell's shared-secret middleware and the `EXPO_PUBLIC_*` key fallback** (`oddswell/app/+middleware.ts:10-20`, `oddswell/server/httpClient.ts:13-18`): any secret in the bundle is public. R3 exists to catch exactly this.
- **Oddswell's Cursor skill and progressive-disclosure agent docs** (`oddswell/.cursor/skills/sports-analysis-ai/SKILL.md`): Xolace's `CLAUDE.md` + `docs/foundation/` + skills already cover this. Prior N8 covers the one-screen summary.
- **A "paths in CLAUDE.md exist" doc-drift lint**: I tried it. All 7 hits on `CLAUDE.md` were false positives (relative names such as `_layout.tsx`, or `xolace.md` that lives in `docs/foundation/`). R1 catches the one real drift (`alpha`) more precisely.
- **Medley's per-PR preview on every PR without a gate** (`medley/.eas/workflows/preview.yml:8-12`): it runs untrusted PR code in the `preview` environment. Keep Clarity's label gate (prior S2).
