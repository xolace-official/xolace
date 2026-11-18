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
  voice orbs, look glows, aurora and leave scrim, Today's sky and light, Today's
  Reflect-card doors and light, Today's kindling and campfire firelight, Connect's avatar
  art and Xolace flame), still as tokens in `global.css`. Today's sky is the hour's, not
  the theme's, and its gradient stops stay strings in `features/today/sky/` because
  worklets interpolate them. Connect's art is content a person or the brand wears, the
  same in every theme.
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

Every feature folder created from now on (each redesigned screen's folder and any new
feature) has this shape, and so does every old one a screen PR or a sweep reworks. The closest
example today is `src/features/reach-me-on/`'s model, data hooks and tests; its
`components/` folder is the legacy layout.

```
src/features/<feature>/
  copy.ts                  every user-facing string, as one object
  <feature>-model.ts       pure: data in, what to show out. No React, no Convex
  <feature>-model.test.ts
  use-<feature>.ts         the data hook: the one file that calls Convex, PostHog, the toast
  <screen>-data.tsx        the screen's provider: its { state, actions } type, the context,
                           use<Screen>(), and <Screen>Data, which fills it from the data hook
  <feature>-screen.tsx     composes the parts, which read the provider (~100 lines)
  screens.ts               its entries in the (protected) stack
  <area>/                  parts, named for the screen area they draw (hero/, link-steps/)
  dev/                     fixtures, and states.tsx: the screen's dev states
  AGENTS.md                only for rules the code can't show
```

- **Data hook.** Returns `{ state, actions }`; errors, retries, analytics and toasts
  live there, so parts only draw. A big feature has one per screen. Its second
  adapter is the fixtures in `dev/`, which feed tests and dev states (see "Dev states").
- **Model.** Whatever turns data into what to show is a pure function in the model,
  tested with vitest: the fastest feedback in the app.
- **State.** Server truth: Convex, through the data hook. Device-only for one feature:
  that feature, via `src/lib/storage/unified-storage.ts`. App-wide (theme, account
  flags): `src/store`. One screen's UI: `useState`, or the feature's provider when
  parts share it.
- **Folders by area.** Sub-folders name a part of the screen; a part and its hook sit
  together. A big feature splits by screen (`letters/{write,read,shelf}/`), with the
  pieces they share at its root.
- **Names.** The root glossary's words in file, function and type names. A new folder
  takes its final name directly (`today`, `you`, `letters`); where an old folder holds
  the name (`reflect`, `settings`, `session-end`…), the screen PR replaces it in place.
  No `<name>-v2` folders.
- **Replacing old code.** There is no flag: a screen PR points the route shim at the new
  screen and deletes the old screen code it replaces, plus anything only that code used.
  New code never imports an old folder (one still on `LEGACY_FEATURES`), and old code
  never imports a ported one; the PR that replaces or deletes a folder takes it off the
  list. When a folder is replaced in place while other old screens still use parts of
  it, the same PR first moves those parts down a layer (`src/lib`,
  `src/components/shared`), so nothing imports a half-replaced folder.
- **Composition.** Features meet in routes, not screens: a ported feature imports only
  itself, lower layers (`src/lib`, `src/components/shared`, kits in
  `src/components/<kit>`) and `SHARED_FEATURES` (`purchases`). A piece two features
  need moves down a layer.
- **Root screens.** A feature's stack entries and options go in its `screens.ts`;
  `src/features/navigation/root-screens.ts` spreads them.
- **Enforced** by `src/features/import-cycles.test.ts` for every folder not on
  `LEGACY_FEATURES` in `feature-shape.ts` (the old folders: `REPLACED_FEATURES`, which
  screen PRs replace, and `RESTYLED_FEATURES`, which the sweep reworks; both only shrink);
  `bun run check:changed` warns on `.tsx` over 200 lines. Porting a prototype screen:
  the `port-screen` skill.

## Dev states

A dev build opens any registered screen state on fixtures, with no backend and no data set
up by hand: `xolace://dev/<feature>/<state>`, or Account › Dev tools › Dev states for the
list. Dev builds only, signed in and past intake (the routes sit in `(protected)`). The
worked example is `reach-me-on`: `reach-sheet-data.tsx` and `dev/`.

- **Provider.** A screen and its parts read data and act only through the feature's
  provider (`<screen>-data.tsx`, `use(Context)`): no part calls a data hook, Convex,
  PostHog, the toast or a store that acts (the paywall) itself. Hooks that only draw
  (theme colours, layout, a part's own `useState`) stay in the part. The route wraps
  the screen in `<Screen>Data`, which fills the provider from the data hook; a dev
  state fills it from fixtures. Same `{ state, actions }` type, so the screen can't
  tell, and a tap in a dev state never reaches the backend. A fixture's actions do
  nothing unless the state needs a tap.
- **Add a state:** one entry in `devStates` in the feature's `dev/states.tsx`
  (`DevState`, `src/dev/dev-state.ts`: `id`, `title`, `Screen`, optional header
  `options`), with literal string ids. `src/dev/discovered.ts` finds every
  `dev/states.tsx` with `require.context`, so nothing central changes and parallel
  PRs don't touch the same lines. Fixtures sit beside it in `dev/`; the tests import
  them too (test files are outside the import graph). A big feature's `dev/` per screen
  folder all register under the feature, may share each other's fixtures, and keep ids
  unique across the feature.
- **Open one:** argent `open-url` or `xcrun simctl openurl <udid>
  xolace://dev/<feature>/<state>`. A state with `headerShown: false` has no back
  button: swipe back on iOS, system back on Android.
- **Mistakes** fail in CI: `src/dev/states-files.test.ts` reads every `dev/states.tsx`
  and runs the registry's rules (path, kebab-case ids, one id per feature). At run time
  a bad file is left out and listed on the index; the rest still open.
- **Release builds** have none of it: the `(protected)` layout routes `dev` only under
  `Stack.Protected guard={__DEV__}`, and the route shims reach `src/dev` only through
  `__DEV__ ? require(...) : null`, which Expo's transform (babel-preset-expo, then
  `@expo/metro-config`'s constant folding) removes before Metro collects
  dependencies. `import-cycles.test.ts` is the static guard: it fails when anything
  else imports dev code (`devCodeInReleaseGraph`) or a feature's `dev/` is imported
  from outside that feature's `dev/` folders and `src/dev` (`devImportsFromOutside`).

## Tabs and the root seams

The tabs are Today · Explore · Connect · You (`TABS`, `src/features/navigation/tabs.ts`,
drawn by `components/app-tabs.tsx`). "/" is still Reflect, outside the tabs, until the
Today and Reflect screen PRs move the landing. There is no flag: a screen PR replaces the
old screen outright. Where a screen PR adds to the shell:

- **A tab's content:** its route shim, `src/app/(protected)/(tabs)/<tab>/index.tsx`, hosts
  the old screen that did the job (Explore: the Browse hub) until the tab's screen PR
  swaps it. Today, Connect and You are swapped. The tab's label and icon are its `TABS`
  entry.
- **A root screen:** an entry in the feature's `screens.ts` (see "Root screens").
- **A host:** an entry in `ROOT_HOSTS` (`src/features/navigation/hosts.ts`). A host is a
  component the `(protected)` layout keeps mounted above the stack while someone is
  signed in, whatever screen is up: it listens and renders nothing, or draws over every
  screen (the arrivals moment). It is not a route: nothing navigates to it and it has no
  options, which is what a root screen is. A host that opens a screen navigates to that
  screen's route. Hosts are siblings after the native stack, so they can't draw over a
  natively presented screen (the player, a form sheet) and position themselves
  absolutely. The layout maps the list; don't edit its lines.
- **A path that moved** (`/discovery`, `/browse/**`, `/browse-player`, `/profile`,
  `/profile/insights`, `/kindling-announcement`, `/timeline/**`; next, `/streak-held`): `MOVED` in
  `src/features/navigation/moved-paths.ts` says where each lives now, a tab or a root
  screen, and whether its subpaths moved too (`subtree`) or one subpath moved somewhere of
  its own (`paths`: `/profile/insights` → `/you/steadiness`). Its
  `MovedRoute` shim at the old path (plus `[...rest]` for subpaths, and an entry in
  `navigation/screens.ts`) sends links and old payloads there; `moved-paths.test.ts`
  checks all three.
- **Navigating to a route that may already be in the stack** (a tab, Reflect): use
  `<ReturnTo href />` (`src/lib/return-to.tsx`) or `router.dismissTo`, never `<Redirect>`,
  `router.replace` or `router.navigate` from a pushed screen: those stack a second copy.
  Notification taps follow the same rule (`notificationTapPlan`: home is `dismissTo("/")`,
  except on a held screen in `src/lib/held-routes.ts`, where a tap tears nothing down).

## Shared kit

The redesign's shared pieces live in `src/components/shared/`, the settings kit in
`src/components/settings-kit/`, the keyboard helpers in `src/lib/keyboard/`. Where
production had its own version, new code uses the kit's; the old one stays only for the
screens that already use it, which move over in cleanup (C1). `src/features/kit-imports.ts`
(run by `import-cycles.test.ts`) fails when ported folders, `src/design` or the kit import an
older piece.

| Need | New code | Old screens only |
|---|---|---|
| Press feedback | `PressScale` (.96, cards .98, Press curve, optional `haptic`) | heroui `PressableFeedback` |
| Toast | `toast(message, opts)`, called from the data hook | heroui `useToast` |
| Segments | `Segmented` (SwiftUI on iOS, Material 3 on Android) | `SegmentedControl` |
| Form sheet | `fitSheet` (`src/lib/root-screen.ts`: fits its content, grabber, 40 pt, surface) | `legacyFitSheet` |
| Native header | `useHeaderOptions()` (`src/lib/header-options.ts`, theme faces) | `useLargeHeaderOptions` |

- **Pieces:** `Card` + `SectionHeader`, `MediaRow` + `Kicker`, `CareRow`, `Avatar`,
  `BackButton`, `GlassGroup`, `DetachedSheet` (its route takes `DETACHED_SHEET`), `RollingNumber`,
  `CountryMenu`, `Flux`, `Aura`. Settings-like pages: `SettingsHeader`, `SectionTitle`,
  `SettingsCard`, `Footnote`, `Rows`, `SwitchRow`, `OpenRow`, `TileRow`, `SettingsDialog`,
  `NameDialog`.
- **The Xolace face** is a kit: `src/components/xolace-face/` (`XolaceFace`, `useFace`, the
  poses). Where it may appear: `docs/plan/xolace-face-placements.md`.
- **Colours for native views and SVG:** `useTokenColor("danger-ink")`. Native views go in
  `ThemedHost`, which passes the theme's light or dark (`useScheme()`, `src/design/scheme.ts`).
- **Icons:** `Icon` takes an SF Symbol name, or `{ ios, android }` to draw on Android too.
  Give the kit's callers both.
- **Third-party components with `className`** come from `styled.ts` (`LinearGradient`,
  `Image`, `BlurView`), wrapped once.
- **Keyboard:** `useKeyboardLift` / `useLiftStyle` or `KeyboardSpacer` keep a bar 12 pt over
  the keyboard (`keyboard-lift-math.ts`); `useKeyboardShown` for layout that switches.
- **Toast rule:** `toast()` counts as a backend side effect (`feature-shape.ts`), so in a ported
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
