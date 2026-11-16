# @xolace/mobile

Expo SDK 58 app (iOS + Android) on Expo Router, Clerk (`@clerk/expo`) and Convex.
Moved in from `xolace_app` in Phase 2 (`src/`, `assets/`, `modules/`,
`app.config.ts`, `eas.json`).

## Commands

- Dev server: `bun run dev:mobile` from the root (`expo start --clear`); in a worktree
  add `-- --port <metro from .xolace/ports.json>`.
- Native dev build: `bun run ios` / `bun run android` (needed after adding a native module).
- Add an Expo package: `bunx expo install <pkg>` (picks the SDK-compatible version).
- Check: `bun run check:changed` from the root; `bun run check-types` here.
- Tests: `bun run test` here (vitest, node + RN stubs in `vitest.setup.ts`).

## Boundaries

- May import: `@xolace/backend/api`, `@xolace/backend/dataModel`, and allowlisted
  client-safe backend modules. Nothing else from the backend.
- Must not import: `@xolace/ui` (web-only), other apps, `api.admin.*`.
- One React / React Native / expo-modules-core copy: see `.agents/rules/expo-monorepo.md`.

## Conventions

- **Text:** never `Text` from `react-native`; use `AppText` (`src/components/shared/app-text`).
- **Images:** `expo-image` only.
- **Styling:** Uniwind `className`; `cn()` to merge, `tv()` for variants.
  `StyleSheet.create()` only when unavoidable. Inline dynamic styles are fine.
- **Colors:** CSS variables (`--background`, `--foreground`, `--accent`, ...), never
  hex, even inline. Every theme defines the same variables. `useThemeColor` from
  `heroui-native` for JS values. A fixed palette is allowed only for the listed
  "printed object" surfaces (quotes poster, vent, auth, Lantern reader pages, Talk's
  voice orbs), still as tokens in `global.css`.
- **Themes:** new theme = CSS file in `src/themes/` with `<name>-light`/`-dark`
  variants, import in `global.css`, register in `metro.config.js` `extraThemes`, add to
  the `ThemeName` union and `toggleTheme`.
- **Platform code:** `.ios.tsx` / `.android.tsx` / `.web.tsx`; Uniwind `ios:`/`android:`.
- **UI kit:** HeroUI Native first; bottom sheets via `@gorhom/bottom-sheet`.
- **State:** see "Feature shape". Backend calls live in the feature's `use-*.ts` data
  hook, never in components.
- **Convex reads with user-driven args** (paging, filters, tabs): `useStableQuery` /
  `useStablePaginatedQuery`, so the UI doesn't blank while new args load.
- **Reanimated:** `.get()` / `.set()` on shared values, never `.value`.
- **Feature layering:** feature folders never import each other in a loop.
  Hubs (`settings`, `reflect`) import the features they compose; those features
  never import back. A piece two features share moves down: to the feature that owns
  the concept, or to `src/lib` / `src/components/shared`. `purchases` is the
  entitlements module (`usePlusEntitlement`, `usePaywall`) and imports no other
  feature; a paywall that needs feature data gets it as a prop from its route.
  `src/features/import-cycles.test.ts` enforces all three, and its failure lists
  the imports to move.
- **Unused code:** `bun run knip` from the root (config in `knip.jsonc`). An
  export kept on purpose before anything uses it gets a `/** @public <why> */` tag.
- **Files** under ~200 lines; imports via the `@/` alias (`@/*` → `./src/*`; `@/assets/*` and `@/modules/*` keep their top-level folders).
- **Variants:** `APP_VARIANT` (development/preview/production) picks the bundle id
  (`com.xolaceincorg.xolace.dev` / `.preview` / base). Plain `ios`/`android` builds the
  production id; use the variant scripts.

## Feature shape

Every redesign (v2) feature folder, and every old one a sweep reworks, has this shape.
`src/features/reach-me-on/` is the closest example today.

```
src/features/<feature>/
  copy.ts                  every user-facing string, as one object
  <feature>-model.ts       pure: data in, what to show out. No React, no Convex
  <feature>-model.test.ts
  use-<feature>.ts         the data hook: the one file that calls Convex, PostHog, the toast
  <feature>-screen.tsx     composes the parts and reads the hook (~100 lines)
  screens.ts               its entries in the (protected) stack
  <area>/                  parts, named for the screen area they draw (hero/, link-steps/)
  dev/                     fixtures and dev states
  AGENTS.md                only for rules the code can't show
```

- **Data hook.** Returns `{ state, actions }`; errors, retries, analytics and toasts
  live there, so parts only draw. A big feature has one per screen. Its second
  adapter is the fixtures in `dev/`, which feed tests and dev states.
- **Model.** Whatever turns data into what to show is a pure function in the model,
  tested with vitest: the fastest feedback in the app.
- **State.** Server truth: Convex, through the data hook. Device-only for one feature:
  that feature, via `src/lib/storage/unified-storage.ts`. App-wide (theme, account
  flags): `src/store`. One screen's UI: `useState`, or the feature's provider when
  parts share it.
- **Folders by area.** Sub-folders name a part of the screen; a part and its hook sit
  together. A big feature splits by screen (`letters/{write,read,shelf}/`), with the
  pieces they share at its root.
- **Names.** The root glossary's words in file, function and type names. A v2 folder
  takes the final name where it's free (`today`, `you`, `letters`) and `<name>-v2`
  where an old folder holds it, renamed once the old one is deleted.
- **Composition.** Features meet in routes, not screens: a v2 feature imports only
  itself, lower layers (`src/lib`, `src/components/shared`, kits in
  `src/components/<kit>`) and `SHARED_FEATURES` (`purchases`). A piece two features
  need moves down a layer.
- **Root screens.** A feature's stack entries and options go in its `screens.ts`;
  `src/features/navigation/root-screens.ts` spreads them.
- **Enforced** for v2 folders by `src/features/import-cycles.test.ts` (rules and the
  v2 list in `feature-shape.ts`); `bun run check:changed` warns on `.tsx` over 200
  lines. Porting a prototype screen: the `port-screen` skill.

## Release

- `.eas/workflows/release.yml` (manual/CLI only, no push trigger): fingerprint →
  `get-build` per platform → OTA to channel `production` if a compatible store build
  exists, else build + submit (TestFlight, Play internal). Started by
  `.github/workflows/release.yml` after the prod Convex deploy; by hand: `bunx eas-cli workflow:run release.yml`
  here (`-F force_native=true` for new binaries). Agents never run it.
- `.eas/workflows/preview-update.yml` (manual/CLI only): OTA to channel `preview`
  with the EAS `preview` environment (staging backend). Started by
  `.github/workflows/staging.yml` after the staging Convex deploy, only when the repo
  variable `STAGING_MOBILE_OTA` is `true`. Agents never run it. Setup:
  `docs/setup/staging.md`.
- Production `runtimeVersion` is `{ policy: "fingerprint" }`; development and preview
  keep `appVersion`. Store builds from before the switch (shipped `1.14.0`) get no
  fingerprint-runtime OTAs.
- `fingerprint.config.js` drops JS-only `extra` keys (Google client ids, PostHog,
  RevenueCat) so per-environment values don't fake a native change, and adds the
  root `patches/`. Adding an `extra` key a config plugin reads? Keep it hashed. The
  `native-change` PR label comes from `.github/workflows/mobile-fingerprint.yml`.
- `release/production-guard.ts` runs from `app.config.ts` for production EAS builds
  and `eas update` exports (`APP_VARIANT=production` plus `EAS_BUILD` or
  `NODE_ENV=production`). It fails on E2E/seed/mock flags, a non-`pk_live_` Clerk key,
  a non-prod Convex URL, or a secret-looking `EXPO_PUBLIC_*` value. Fix the EAS
  `production` environment, never the guard, unless the rule itself is wrong.

## Gotchas

- Secrets (`google-services.json`, `GoogleService-Info.plist`, service-account JSON)
  are gitignored; prefer EAS file env vars. `app.config.ts` reads
  `GOOGLE_SERVICES_JSON` (an EAS file env var) before the local copy; workflow builds
  have only the env var. Client env is `EXPO_PUBLIC_*` only and is public: never put
  a secret there.
- `ios/` and `android/` are generated by prebuild and ignored.
- After bumping a package Metro resolves specially (uniwind, react-native), restart
  Metro with `--clear`. `expo run:ios` keeps the old cache, which can keep serving the
  previous version's files (seen as a `get NativeModules` stack overflow on uniwind 1.12).
- Simulators can't prove: microphone/voice, purchases, push, native auth sheets.
  Say so in the PR. Use argent: `describe` before tapping, stop your sessions after.
