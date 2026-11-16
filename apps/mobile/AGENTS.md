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
  New code always passes a `variant` (`type-<variant>`: `display`, `title`, `headline`,
  `body`, `callout`, `footnote`, `caption` … in `src/design/type.ts`); `weight` and
  `italic` pick the theme's role. Without a `variant` AppText is the old one (body face,
  size from classes), kept for the screens the redesign hasn't replaced.
- **Fonts:** each theme picks a font pair (`fonts` in `src/design/themes.ts`, pairs in
  `src/design/font-pairs.ts`: Bricolage/Figtree, Space Grotesk/DM Sans, Nunito). Outside
  AppText use the role classes (`font-normal`, `font-semibold`, `font-display-bold`,
  `font-italic` …), the fixed faces (`font-mirror`, `font-letter`, `font-reader`,
  `font-poster` …) or `useThemeFaces()` for style-only props. Never a numeric
  `fontWeight` or `fontStyle: "italic"` with them: each weight is its own family.
  `src/design/fonts.ts` loads them: the pairs at launch (`useLaunchFonts`), a fixed face
  on the screen that draws it (`useFixedFaces`). Switch themes only through
  `setThemeWithFonts`. A new face goes in `font-sources.ts`. `cn` (`src/lib/cn.ts`)
  treats every `font-*` face as one group, so a later face class replaces an earlier one.
- **Images:** `expo-image` only.
- **Styling:** Uniwind `className`; `cn()` to merge, `tv()` for variants.
  `StyleSheet.create()` only when unavoidable. Inline dynamic styles are fine.
  Shape and space tokens (`global.css`): `rounded-row` 12, `rounded-tile` 20,
  `rounded-card` 24, `rounded-hero` 36 (all continuous corners), `p-gutter` 16,
  `gap-module` 14, `mt-section` 22, `shadow-card`.
- **Colors:** CSS variables (`--background`, `--foreground`, `--accent`, ...), never
  hex, even inline. Every theme defines the same variables. `useThemeColor` from
  `heroui-native` for JS values. A fixed palette is allowed only for the listed
  "printed object" surfaces (quotes poster, vent, auth, Lantern reader pages, Talk's
  voice orbs), still as tokens in `global.css`.
- **Themes:** one registry, `src/design/themes.ts`; never hand-write a theme name
  list or `${id}-${mode}`. To add a theme: add an entry to `THEMES` with only the
  values it changes (production-style palettes go in `src/design/theme-values.ts`),
  run `bun run themes` here, restart Metro with `--clear` (`extraThemes` is read at
  start; it rewrites `src/uniwind-types.d.ts`), commit the regenerated
  `src/themes/themes.generated.css`, `src/design/theme-names.generated.json` and the
  type files (`src/themes/type.generated.css`, `src/design/type-classes.generated.ts`).
  The generator (`scripts/themes/build.ts`) fills shared values, derives the
  redesign's extras (`subtle`, `*-ink`, `*-wash`, `heavy-*`, `glass` …) and stops if
  a variable is missing or undeclared; its test fails if the committed files drift.
  A new variable: add it to `REQUIRED` there and map a class name in `global.css`.
  Never rename a theme id or drop a variant: users have them saved
  (`preferences.colorTheme`, the store's `previousTheme`). Switch themes through
  `themeVariant(id, mode)`, `oppositeVariant`, `NIGHT_VARIANT`, `findVariant`.
- **Platform code:** `.ios.tsx` / `.android.tsx` / `.web.tsx`; Uniwind `ios:`/`android:`.
- **UI kit:** the shared kit ("Shared kit" below) first, then HeroUI Native; bottom
  sheets via `@gorhom/bottom-sheet`, sheets that are routes via `fitSheet`.
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

Every feature folder created from now on (the redesign's v2 folders and any new
feature) has this shape, and so does every old one a sweep reworks. The closest
example today is `src/features/reach-me-on/`'s model, data hooks and tests; its
`components/` folder is the legacy layout.

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
- **Enforced** by `src/features/import-cycles.test.ts` for every folder not on
  `LEGACY_FEATURES` in `feature-shape.ts` (today's folders; the list only shrinks);
  `bun run check:changed` warns on `.tsx` over 200 lines. Porting a prototype screen:
  the `port-screen` skill.

## Shared kit

The redesign's shared pieces live in `src/components/shared/`, the settings kit in
`src/components/settings-kit/`, the keyboard helpers in `src/lib/keyboard/`. Where
production had its own version, new code uses the kit's; the old one stays only for the
screens that already use it, which move over in cleanup (C1).

| Need | New code | Old screens only |
|---|---|---|
| Press feedback | `PressScale` (.96, cards .98, Press curve, optional `haptic`) | heroui `PressableFeedback` |
| Toast | `toast(message, opts)`, called from the data hook | heroui `useToast` |
| Segments | `Segmented` (SwiftUI on iOS, Material 3 on Android) | `SegmentedControl` |
| Form sheet | `fitSheet` (`src/lib/root-screen.ts`: fits its content, grabber, 40 pt, surface) | `legacyFitSheet` |
| Native header | `useHeaderOptions()` (`src/lib/header-options.ts`, theme faces) | `useLargeHeaderOptions` |

- **Pieces:** `Card` + `SectionHeader`, `MediaRow` + `Kicker`, `CareRow`, `Avatar`,
  `BackButton`, `GlassGroup`, `DetachedSheet` (a transparent-modal route), `RollingNumber`,
  `CountryMenu`, `Flux`, `Aura`. Settings-like pages: `SettingsHeader`, `SectionTitle`,
  `SettingsCard`, `Footnote`, `Rows`, `SwitchRow`, `OpenRow`, `TileRow`, `SettingsDialog`,
  `NameDialog`.
- **Colours for native views and SVG:** `useTokenColor("danger-ink")`. Native views go in
  `ThemedHost`, which passes the theme's light or dark (`useScheme()`, `src/design/scheme.ts`).
- **Icons:** `Icon` takes an SF Symbol name, or `{ ios, android }` to draw on Android too.
  Give the kit's callers both.
- **Third-party components with `className`** come from `styled.ts` (`LinearGradient`,
  `Image`, `BlurView`), wrapped once.
- **Keyboard:** `useKeyboardLift` / `useLiftStyle` or `KeyboardSpacer` keep a bar 12 pt over
  the keyboard (`keyboard-lift-math.ts`); `useKeyboardShown` for layout that switches.
- **Toast rule:** `toast()` counts as a backend side effect (`feature-shape.ts`), so in a v2
  folder only `use-*.ts` calls it. `ToastBridge` in `root-provider.tsx` hands it HeroUI's
  manager.
- **Before first use:** each kit file is a knip `entry` (`knip.jsonc`) and its exports carry
  `@public`. The first screen that imports a file deletes its line there.

## Motion and haptics

The redesign's motion lives in `src/design/`: `springs.ts` (the named springs, press and
breath on Reanimated), `ease.ts` (their react-native-ease twins), `ease-loops.ts`,
`ease-breath.ts`, `entering.ts` (`riseIn`, `fadeUp`) and `motion.ts` (loop timing for the
hour). Night timing follows `useSessionMode().isNight`, which is re-read when the app comes to
the foreground, not by the minute like the prototype's clock.

- **Ease for loops only.** An infinite loop goes on Ease (`loopProps`, `loopOrSettle` in
  `ease-loops.ts`; `breathProps`, `usePhasedBreath` in `ease-breath.ts`): a Reanimated loop
  writes props every frame, an Ease loop costs nothing at rest. Enters, fades, presses,
  colour toggles, chips and swaps stay on Reanimated. `fadeUpProps` and `stateTransition` exist only for the prototype pieces
  already on Ease; don't move another state-driven animation over.
- **`src/design/ease.ts` is the only import of `react-native-ease`**, types included. The
  legacy feature folders and three listed files predate it (`EASE_LEGACY_FILES` in
  `src/features/motion-imports.ts`, which only shrinks); move them over when their screens
  are redone.
- **Reduced motion:** read `useEffectiveReducedMotion()` and pass it as `reduced`. It puts
  the in-app setting first and follows the OS when that is "system", while signed out and
  while preferences load. Never use Reanimated's `useReducedMotion` (the OS value at launch).
  The OS value comes from one app-wide store (`src/lib/motion/os-reduced-motion.ts`), right
  from the first render. Ease ignores Reduce Motion, so every Ease helper takes `reduced`:
  enters become the 200 ms fade, loops rest at `from`. Reduced, `press()` applies its value
  at once.
- **Play as chosen.** Reanimated decides again for itself (`ReducedMotionConfig` in the
  protected layout, the OS elsewhere), which would snap a fade the helpers chose, or snap
  everything for someone who chose "full". So every animation the helpers start carries
  `reduceMotion: ReduceMotion.Never` (`PLAY_AS_CHOSEN` in `springs.ts`). Do the same in any
  animation you write that already took `reduced` into account.
- **Ease 0.9 gotchas:** a loop restarts only on remount (key it with `useLoopRun(running,
  periodMs)`); a view mounted `paused` never starts its loop, so stop by settling, not `paused`;
  no `borderColor` (the border turns black: wrap a plain bordered `View`) and no `skewX`.
  argent's recorder misses Ease-only motion; record with `xcrun simctl io recordVideo`.
- `src/features/import-cycles.test.ts` enforces the import and reduced-motion rules for
  `src/design`, `src/components/shared` and every non-legacy feature.
- **Haptics:** `@/lib/haptics` only (iOS CoreHaptics patterns, Pulsar presets on Android),
  or a Pulsar `Presets.*` call where production uses one; never `expo-haptics` or a second
  vocabulary. `haptics.test.ts` pins each name's feel per platform. The prototype already
  calls these names; its old-to-new table is the prototype's
  `design/review/haptics-match-prod/NOTES.md`.
  A preset played straight from a tap belongs in the `preloadPresets` list in
  `src/app/_layout.tsx`.

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
