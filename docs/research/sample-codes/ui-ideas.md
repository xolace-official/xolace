# Native-feel UI ideas from the sample apps

Research date: 2026-10-09. Source apps live in `src/components/extras/sample-codes/`.
Path shorthand used throughout:

- `A/` = `src/components/extras/sample-codes/amber-main/` (Expo **SDK 58**, RN 0.88, Unistyles)
- `C/` = `src/components/extras/sample-codes/clarity-main/` (Expo **SDK 57**, the same stack versions as Xolace: RN 0.86.3, Reanimated 4.5.1, screens 4.26, keyboard-controller 1.21.9)
- `O/` = `src/components/extras/sample-codes/oyelo-main/` (native SwiftUI, iOS 26 APIs)
- Unprefixed paths are Xolace (`package.json`: expo ^57.0.18, expo-router 57.0.17).

**Version note.** Clarity matches Xolace's SDK, so its code ports almost unchanged. Amber is one SDK ahead.
Before you copy from Amber, check each API against `node_modules/expo-router/build/**` (57.0.17). I verified these:
`NativeTabs` (Xolace imports it from `expo-router/unstable-native-tabs`; Amber's import is `expo-router/native-tabs`),
`NativeTabs.BottomAccessory` (`node_modules/expo-router/build/native-tabs/NativeTabs.d.ts:26`),
`minimizeBehavior` and `role` (`.../native-tabs/types.d.ts:69,280`),
`Link.Trigger withAppleZoom`, `Link.Preview`, `Link.Menu` and `Link.AppleZoomTarget` (`.../link/elements.d.ts:259`),
`Stack.Title`, `Stack.SearchBar` and `Stack.Toolbar` (`.../layouts/stack-utils/`),
`scrollEdgeEffects` (`.../react-navigation/native-stack/types.d.ts`), and
`sheetAllowedDetents: 'fitToContents'` (same file, line 644).
`@expo/ui@57.0.14` is in `node_modules` only as a dependency of expo-router. It is **not** a direct dependency in `package.json`. Run `bunx expo install @expo/ui` before you import it.
`@expo/ui@57` names its SwiftUI switch `Toggle`, not `Switch` (`node_modules/@expo/ui/build/swift-ui/index.d.ts`).
`expo-screen-capture`, `expo-local-authentication` and `expo-widgets` are **not installed**.

---

## 0. What Xolace already does well (do not regress)

| Area | Xolace today | Notes |
|---|---|---|
| Native tabs | `src/components/app-tabs.tsx:28-73`: `NativeTabs` with SF and Material icons, a badge, and a soft-press haptic on `tabPress` | More native than Clarity's custom JS glass tab bar (`C/components/glass-tabs/glass-tab-bar.tsx`). **Do not port Clarity's tab bar.** |
| Haptics | `src/app/_layout.tsx:54-70` preloads Pulsar presets. `src/lib/haptics/` has 16 named semantic patterns | Richer than any sample. Amber and Clarity call raw `expo-haptics`. Oyelo hand-tunes `UIImpactFeedbackGenerator` intensities (`O/Oyelo/Features/OyeloHaptics.swift`). |
| Native header menus | `src/components/shared/overflow-menu.tsx` and `src/features/browse/components/browse-filter-menu.tsx` use `Stack.Toolbar.Menu`. `src/features/xolacer-chat/components/chat-action-sheet.tsx:38` uses a bottom `Stack.Toolbar` | Same API family Amber uses. |
| Form sheets | `src/app/(protected)/_layout.tsx:22-37`: rating and Xolacer edit are native `formSheet`s | Amber and Clarity go further with `fitToContents` (see S1). |
| Reduced motion | `src/lib/motion/use-effective-reduced-motion.ts`: a tri-state in-app override combined with the OS flag | Better than the samples, which read only the OS (Amber's motion tokens use `ReduceMotion.System`; Clarity does the same). Any motion code you lift must be re-pointed at this hook (see G5). |
| Already lifted from Clarity | `src/features/insights/top-blur.tsx` (progressive blur), `src/features/insights/glass.tsx` (GlassSurface and tick gauge), `src/features/insights/domain-list.tsx` and `detail-card.tsx` | Both lifts stay inside `features/insights/`. G4 below suggests promoting them. |
| Large titles + glass | `src/lib/navigation-options.tsx:12-52` | Already handles iOS 18 vs 26 (`headerBlurEffect` only when liquid glass is unavailable). |
| A11y | 266 `accessibilityLabel` and 198 `accessibilityRole` uses under `src/`. `src/helpers/hooks/use-accessability-info.ts` tracks reduce-transparency | The tracked reduce-transparency value is not yet used by the glass surfaces (see S8). |

---

## 1. Per-app inventory

### 1.1 Amber (`A/`): a native-first Expo "save it for later" app

**Navigation and chrome**
- A native-tabs layout that hides the tab bar while scrolling down (`minimizeBehavior="onScrollDown"`). It uses the iOS search-role tab and sets Android Material colours explicitly (indicator, ripple, labelled mode): `A/src/app/(app)/(tabs)/_layout.tsx:5-56`.
- Header toolbar buttons are native bar items (`Stack.Toolbar.Button`). They fire a light haptic manually because native items run no JS on press-in. The title is a custom component via `Stack.Title asChild`: `A/src/app/(app)/(tabs)/(home)/_layout.tsx:17-61`.
- The iOS 26 soft scroll edge, `scrollEdgeEffects: { top: 'soft' }`: `A/src/app/(app)/_layout.tsx:57-66` and `A/src/app/(app)/(tabs)/(home)/_layout.tsx:34-36`.
- One helper gives a transparent header on iOS and an opaque bar on Android: `A/src/lib/header-options.ts:7-11`.
- `formSheet` + `sheetAllowedDetents: 'fitToContents'` + grabber for Add, New Space and Manage Spaces. `modal` for Profile and `fullScreenModal` for Camera: `A/src/app/(app)/_layout.tsx:67-117`.
- Stack animation becomes `'fade'` under Reduce Motion: `A/src/app/(app)/_layout.tsx:37`.
- `NavThemeProvider` feeds the theme palette into React Navigation's theme and keeps the native root background in sync (`SystemUI.setBackgroundColorAsync`), so there is no white flash on push or zoom: `A/src/app/_layout.tsx:22-52`.
- A native search bar via `Stack.SearchBar`, debounced, with empty and no-result states: `A/src/app/(app)/(tabs)/(search)/index.tsx:42-62`.

**Cards, previews, menus, transitions**
- Each feed card is a `Link` with `Link.Trigger withAppleZoom={!reducedMotion}` + `Link.Preview` (iOS peek) + `Link.Menu` (native context menu with SF icons and destructive actions): `A/src/components/item-card.tsx:112-249`.
- The zoom target lands on the first masonry cell (`Link.AppleZoomTarget`): `A/src/components/masonry-feed.tsx:24-32`. On the detail hero, the target is only the pushed item: `A/src/components/item-detail.tsx:145`.
- Space tiles use the same Link/zoom/menu pattern, and delete is confirmed with a native `Alert`: `A/src/app/(app)/(tabs)/(spaces)/index.tsx:137-143,191-224`.
- The "…" overflow menu calls `ActionSheetIOS` on iOS and a Jetpack Compose `DropdownMenu` (`@expo/ui`) on Android. The Compose host mounts only while the menu is open: `A/src/components/ui/action-menu.tsx:11-26` and `A/src/components/ui/action-menu.android.tsx:13-46`.
- The detail screen is a horizontally paging `FlashList` through the siblings of the list it came from. Route params are debounce-written, because each `setParams` re-renders the whole native stack (about 16 ms). Delete slides to a neighbour first, then removes the item: `A/src/app/(app)/item/[id].tsx:63-152,261-277,324-336`.
- The suggestion decision bar enters with `SlideInDown`, not a fade, because a `GlassView` whose ancestor mounts at opacity 0 never renders (expo/expo#41024): `A/src/app/(app)/item/[id].tsx:338-355`.

**Motion system**
- One token file: durations (feedback 120, state 180, enter 250, exit 200, screen 400), Emil-style curves, `dampingRatio` springs (settle, drag, sheet) and press scale 0.97. Opacity-only presets stay on under Reduce Motion: `A/src/theme/motion.ts:9-91`.
- The rules ("never default spring, never ease-in, no per-row entrances in virtualized lists, tab switches stay native") are in `A/docs/design-system.md` (Motion section).
- A Skia per-glyph blurred text morph for headers whose title changes. Layout and reconciliation are pure and bounded to 48 glyphs: `A/src/components/animated-text.tsx:33-60` and `A/src/lib/text-morph.ts:1-94`.
- A swipe-card deck with a UI-thread haptic latch (one haptic per pan, at the commit threshold): `A/src/lib/tidy/use-single-haptic-on-pan.ts:13-34`, `A/src/lib/tidy/card-animation.tsx:44-80` and `A/src/components/tidy/tidy-hints.tsx:18-29` (an arc that fills as the drag approaches commit).

**Loading, splash, onboarding**
- One splash for every loading state. A breathing wordmark covers launch, background and lock. A hold counter (`show`/`keep`) keeps it up until nothing is loading. It exits once, with a grow-and-fade. A layout effect raises it before iOS takes the app-switcher snapshot: `A/src/lib/splash.tsx:23-149`.
- The welcome screen slides up and away *over* the real next screen after sign-in: `A/src/lib/welcome-transition.tsx:15-46`.
- A plain native launch screen (canvas colour only) via a config plugin: `A/plugins/with-plain-splash.js`.
- The empty state fades in (opacity only): `A/src/components/empty-state.tsx:11-18`.

**Privacy and security**
- An optional Face ID / Touch ID lock. It keeps a SecureStore proof with `requireAuthentication`, relocks on background or inactive, and never treats the biometric result as a credential: `A/src/lib/app-lock-storage.ts:1-14`, `A/src/lib/app-lock.tsx:76` and `A/docs/biometric-app-lock.md:17-30`.
- **App-switcher protection.** `ScreenCapture.enableAppSwitcherProtectionAsync(1)` blurs the iOS snapshot. On Android, `preventScreenCaptureAsync` sets `FLAG_SECURE`: `A/src/lib/app-lock-storage.ts:69-78`.
- A lock/privacy screen with a recovery path: `A/src/components/privacy-screen.tsx`.

**Controls and theming**
- A capsule `Button`. It uses interactive Liquid Glass where available, so the system owns the press. Otherwise it is solid with a 0.97 scale. Loading dims the button instead of swapping in a spinner, so nothing reflows. It sets accessibility state for disabled and busy: `A/src/components/ui/button.tsx:28-123`.
- An SF Symbol name maps to a Material glyph, so screens pass one name. `useToolbarIcon` renders Material glyphs to image sources for the Android toolbar: `A/src/components/ui/symbol.tsx:17-110`.
- A native SwiftUI toggle on iOS (the comment notes that RN's `Switch` mis-sizes on iOS 26) and a themed RN `Switch` on Android: `A/src/components/biometric-setting.tsx:34-58`.
- Settings group and row primitives: `A/src/components/settings-list.tsx:9-60`.
- A note-colour radio row with `accessibilityRole="radiogroup"`/`"radio"` and a selection haptic: `A/src/app/(app)/add.tsx:31-73`.
- The composer prefills from the clipboard when the clipboard holds a URL. On Android it delays autofocus until the sheet settles: `A/src/app/(app)/add.tsx:~165-187`.
- A manual "Check for updates" row with a themed `reloadAsync` screen and a version footer: `A/src/components/update-setting.tsx:15-81`.
- Dev and preview builds get distinct app icons: `A/app.config.ts:30-39`.
- An Android `colorAccent` from the theme (cursor and dialog tint): `A/plugins/with-android-accent.js`.

**Native extras**
- A progressive-blur native module that drives a **private** `CAFilter` (base64-obfuscated): `A/modules/progressive-blur/ios/ProgressiveBlurView.swift:4-12`. Xolace already covers this with public APIs (`src/features/insights/top-blur.tsx`), so do not adopt it.
- Home-screen widgets written in `@expo/ui` SwiftUI and Glance via `expo-widgets` (SDK 58, patched): `A/src/widgets/recent-saves-widget.tsx:1-30` and `A/patches/expo-widgets@58.0.9.patch`.
- App Intents and Siri shortcuts: `A/app-intents/*.swift` and `A/src/lib/app-intents.tsx`.

### 1.2 Clarity (`C/`): an Expo speech coach on the same SDK as Xolace

**Navigation and chrome**
- The nav theme takes the palette **and fonts** (headers and back labels use the app font), plus `SystemUI.setBackgroundColorAsync`: `C/app/_layout.tsx:159-189`.
- Modal headers on iOS are transparent with a progressive blur as `headerBackground`. On Android they are opaque, with `headerBackVisible: false` because the close button covers it: `C/app/_layout.tsx:221-244,283-296`.
- `ModalCloseToolbar` uses the iOS `Stack.Toolbar.Button icon="xmark"`, which iOS 26 renders as a glass circle. On Android it is a `Stack.Toolbar.View` with a 40 pt circle: `C/components/modal-close-toolbar.tsx:21-49`.
- A route-based `formSheet` with `fitToContents` and a grabber for word detail. When its data is missing, the screen dismisses itself: `C/app/session/_layout.tsx:52-60` and `C/app/session/word-detail.tsx:28-40`.
- A status-bar progressive blur over the tabs: `C/app/(tabs)/_layout.tsx:24-36`.
- A tab-bar minimize-on-scroll spring with direction hysteresis (±3 px), clamped against rubber-band flicker: `C/components/glass-tabs/minimize-context.tsx:57-91`. Xolace gets the same effect natively with `minimizeBehavior`.

**Glass rules learned the hard way**
- Never animate opacity on an ancestor of `GlassView`; it stops rendering: `C/components/glass-tabs/fading-tab-slot.tsx:35-41`, `C/components/splash/intro-reveal.tsx:35-38` and `C/components/ui/glass-surface.tsx:27-28`.
- Do not nest `GlassView` inside `GlassView`: `C/components/ui/primary-button.tsx:37-41`.
- Interactive glass must not clip, because the press response grows past the bounds: `C/components/ui/glass-surface.tsx:40-44`.
- Put the `Pressable` around the `GlassView`, not inside it: `C/components/header-actions.tsx:81-82`.
- `GlassContainer` merges adjacent capsules fluidly: `C/components/header-actions.tsx:80-107`.

**Motion and reveal**
- Named springs, one job each (`onboarding`, `snap`, `settle`, `glide`): `C/constants/motion.ts:7-35`.
- Intro reveal: content staggers in under the fading splash at numbered slots. A `fade:false` mode exists for glass content: `C/components/splash/intro-reveal.tsx:40-96`.
- The Lottie splash has a `hold` that waits on the last frame until the account's onboarding state is known, plus a fallback timer so it can never wedge: `C/components/splash/splash-overlay.tsx:20-113` and `C/app/_layout.tsx:333-339,388-399`.
- `AnimatedRoundedNumber` renders a SwiftUI `Text` with `contentTransition('numericText')` (native rolling digits) on iOS and a metrics-matched RN `Text` elsewhere: `C/components/animated-rounded-number.ios.tsx:13-38` and `C/components/animated-rounded-number.tsx:29-50`.
- A UI-thread live waveform: a frame callback samples mic level into a ring buffer: `C/components/session/live-waveform.tsx:51-73`.
- A selection haptic on each chart cursor step while scrubbing: `C/components/analytics/score-chart.tsx:223`.

**Onboarding and forms**
- An in-place pager. One shared `position` drives both the page slide and the segmented progress fill, so Back interrupting a spring stays in sync. Visited pages stay mounted to keep drafts. Inactive pages are hidden from accessibility. It has a progressbar `accessibilityValue` and Android back handling: `C/components/onboarding/onboarding-flow.tsx:34-155`.
- The CTA rides the keyboard frame-for-frame (`useReanimatedKeyboardAnimation`), clamped so it never moves *down* on Android floating or hardware keyboards: `C/components/onboarding/onboarding-screen.tsx:30-80`.
- A permission primer: "our screen explains, the system dialogs ask". A denial swaps the CTA to Settings and leaves an option to continue without it: `C/components/onboarding/pages/microphone.tsx:33-44`.
- Settings is a modal with a native header and toolbar, a native `Switch` and an `Alert` for sign-out and delete: `C/app/settings.tsx:183-248,399-419`.

**Errors and empty states**
- The themed error fallback says nothing technical and calls `resetError` to remount: `C/components/observe-error-fallback.tsx:22-45`. It is mounted via `ObserveErrorBoundary` at the root: `C/app/_layout.tsx:345`.
- An empty-state card states plainly that there is no data instead of faking some: `C/components/empty-state-card.tsx:18-19`.

### 1.3 Oyelo (`O/`): a native SwiftUI read-it-later audio app

**Navigation and containers**
- `NavigationSplitView` handles compact and regular widths. A floating mini player sits in a safe-area inset or overlay, with a measured clearance passed to scroll views: `O/Oyelo/App/RootView.swift:40-100`.
- The mini player is a glass capsule. It expands in place, scrubs, swipes the header to skip, and fires a keyframe "attention pulse" when playback starts elsewhere. It falls back to an opaque fill under **Reduce Transparency**: `O/Oyelo/Features/PlayerView.swift:3-110` (fallback at `:93`, pulse at `:109`).
- An inbox banner: a glass toast that slides in from the top with an action and a dismiss: `O/Oyelo/App/RootView.swift:349-383`.
- Sheets use `.presentationDetents([.medium, .large])` and switch to `[.large]` only at accessibility text sizes: `O/Oyelo/Features/FollowBlogSheet.swift:32-42` and `O/Oyelo/Features/NowPlayingView.swift:71-83`.

**Lists**
- `.searchable` in the navigation drawer: `O/Oyelo/Features/LibraryView.swift:254-258`.
- Leading swipe (full-swipe Restore) and trailing swipe (Delete, no full swipe), plus a context menu, plus **mirrored `accessibilityAction`s**: `O/Oyelo/Features/ArchivedItemsView.swift:33-60`.
- `ContentUnavailableView` empty states with a primary action: `O/Oyelo/Features/LibraryView.swift:184-245`.
- An **undo bar instead of a confirmation** for archive. It stays visible twice as long under VoiceOver (12 s vs 6 s). At accessibility sizes it switches from a capsule to a stacked layout: `O/Oyelo/Features/LibraryView.swift:226,801-826`.
- `.refreshable` on feeds: `O/Oyelo/Features/FollowedBlogsView.swift:84,267`.
- Range selection by dragging the selection gutter: `O/Oyelo/Features/LibraryView.swift:197-205`.

**Micro-interactions**
- A symbol replace transition on the play/pause glyph: `O/Oyelo/Features/SharedViews.swift:151`.
- `numericText` content transition on stats: `O/Oyelo/Features/UsageView.swift:373`.
- A variable-colour symbol effect for "generating": `O/Oyelo/Features/LibraryView.swift:939`.
- Haptics only follow explicit actions, with tuned intensities: `O/Oyelo/Features/OyeloHaptics.swift:3-17`.
- A one-time welcome haptic of three soft pulses (0.15, 0.45 and 0.8 s). It is cancelled on background or navigation and skipped under Reduce Motion: `O/Oyelo/Features/OnboardingHapticPlayer.swift:5-48`.
- A decorative wave whose clock sleeps when the view is offscreen, backgrounded or paused, or when Reduce Motion is on. It honours Increase Contrast and Dynamic Type: `O/Oyelo/Features/OnboardingWaveView.swift:20-50`.

**Retention, system integration**
- `ReviewPromptPolicy` allows one request per marketing version and at least 120 days between requests. It fires only after an earned moment (a favourite) and never on TestFlight: `O/Oyelo/App/ReviewPromptPolicy.swift:1-27` and `O/Oyelo/App/RootView.swift:280-299`.
- The onboarding notification page is skipped when iOS already answered: `O/Oyelo/Features/OnboardingView.swift:85-93`.
- "Listen later" reminders use local notifications and a native `DatePicker`, with an Open Settings recovery when notifications are denied: `O/Oyelo/Features/ReminderView.swift:17-83` and `O/docs/USAGE-AND-REMINDERS.md`.
- Alternate app icons (Pro): `O/Oyelo/Features/AppIconView.swift:5-79` and `O/Oyelo/Resources/AppIcon-*.icon/`.
- A widget (`O/OyeloActivity/OyeloRecentPlaybackWidget.swift`), a share extension (`O/OyeloShare/ShareViewController.swift`) and App Intents (`O/docs/APP-INTENTS.md`).

---

## 2. Ranked ideas

Effort: **S** is under half a day, **M** is 1–3 days, **L** is a week or more. "Installed" means the dependency is already in Xolace's `package.json`.

### Great

#### G1. App-switcher privacy cover, then an optional Face ID lock
- **Source:** `A/src/lib/app-lock-storage.ts:69-78` (screen capture), `A/src/lib/app-lock.tsx:76` (AppState relock), `A/src/lib/splash.tsx:126-135` (cover raised in a layout effect, ahead of the iOS snapshot), `A/docs/biometric-app-lock.md`.
- **Why it matters:** Xolace is a mental-health journal. Today the iOS app switcher shows the last screen, often a mirror or a reflection, in plain view. The foundation's privacy standard ("reflections private by default") and rule 8 ("discreet by default, never reveal what someone is carrying") are in `docs/foundation/xolace-for-agents.md`. A native blur in the switcher is what Notes, banking and journaling apps do, so it reads as trustworthy. Xolace has nothing like it today: `expo-screen-capture` and `expo-local-authentication` are not in `package.json`.
- **Applies to:** the whole app, especially reflect (`src/app/(protected)/index.tsx`), timeline, the Lantern reader and chat.
- **Sketch:**
  1. **Phase 1 (S):** run `bunx expo install expo-screen-capture`. In `src/providers/`, add a tiny `PrivacyCover` that calls `enableAppSwitcherProtectionAsync(…)` once at boot. Gate it behind a Settings → Data toggle that is on by default, and store the toggle in the persisted zustand slice.
  2. **Phase 2 (M/L):** add `expo-local-authentication` + `expo-secure-store` (installed) for an opt-in "Face ID lock". Port Amber's controller and storage, and render a lock screen with `AppText` and theme tokens.
- **Gotchas:**
  - On Android, protection is `FLAG_SECURE`, which also blocks screenshots and screen recording. Users who screenshot quote posters will notice. `react-native-view-shot` exports still work because they render in-app, but say so in the toggle copy. You could also offer the Android behaviour as a separate toggle.
  - Amber unmounts private routes while locked (`A/docs/biometric-app-lock.md:23`). Xolace does not persist the reflect draft: `src/store/store.ts:297-305` persists only theme and toggles. Persist the draft before you add a lock, or the lock will destroy unsent writing.
  - Rule 12: do not claim "your reflections are protected" beyond what this literally does.

#### G2. Feed the multi-theme palette into the navigation theme and the native root background
- **Source:** `A/src/app/_layout.tsx:22-52`, `C/app/_layout.tsx:159-189` (which also sets `fonts`).
- **Xolace today:** `src/app/_layout.tsx:249` passes stock `DarkTheme`/`DefaultTheme`, even though Xolace ships 12 theme variants (`src/themes/*.css`). The gap is patched screen by screen: `contentStyle: { backgroundColor }` in `src/lib/navigation-options.tsx:22,34`, `View className="flex-1 bg-background"` wrappers around stacks in `src/app/(protected)/timeline/_layout.tsx` and `src/app/(protected)/(tabs)/browse/_layout.tsx`, and transparent `contentStyle` in `src/app/(protected)/_layout.tsx:15-18`.
- **What it fixes:** the canvas behind push transitions, form sheets, overscroll bounce and the moment before JS paints all show the active theme (Quiet, Reverie and so on) instead of stock white or black. Native header back labels also pick up Space Grotesk.
- **Sketch (S):** in `_layout.tsx`, build `navTheme` from `useThemeColor('background' | 'foreground' | 'border' | 'accent')`. Call `SystemUI.setBackgroundColorAsync(background)` in an effect; `expo-system-ui` is installed. Add a `fonts` map using the SpaceGrotesk faces. Then delete the per-stack wrappers one at a time.
- **Gotchas:**
  - `useThemeColor` returns token-derived values, which keeps the no-hex rule intact.
  - Keep the explicit opaque `contentStyle` on iOS 18 (`src/lib/navigation-options.tsx:29-34` explains the ghosted-push bug) until you have verified the nav theme alone fixes it.
  - Fixed-palette surfaces (vent, quotes poster, auth) keep their own backgrounds.

#### G3. Native peek, context menu and zoom on tappable cards
- **Source:** `A/src/components/item-card.tsx:112-249`, `A/src/components/masonry-feed.tsx:24-32`, `A/src/app/(app)/(tabs)/(spaces)/index.tsx:191-224`. The Android fallback is `A/src/components/ui/action-menu.android.tsx`.
- **Xolace today:** timeline cards push imperatively with no preview or menu (`src/features/timeline/components/timeline-entry-card.tsx:41,63`). Conversation rows use long-press to raise a bottom toolbar (`src/features/xolacer-chat/components/chat-action-sheet.tsx:38`, `src/features/xolacer-chat/components/conversation-row.tsx:59-61`). Library, Browse and Discovery cards are plain pressables.
- **Why it matters:** the long-press peek and menu, and the card-to-screen zoom, are the most "this is a real iOS app" gestures there are. Today Xolace has none of them.
- **Applies to:**
  - Timeline entry → session detail: peek the mirror, menu with "Open" and "Share reflection" if consented.
  - Lantern entry cards (`src/features/library/home/entry-cards.tsx`, `hub-carousel.tsx`) → reader, with zoom from the cover.
  - Browse shelf tiles (`src/features/browse/components/shelf-tile.tsx`) → topic.
  - Connect rows: `Link.Menu` with Archive, Rest and Delete as the native menu, replacing the bottom-toolbar long-press.
- **Sketch (M):**
  1. Wrap the card in `<Link href asChild><Link.Trigger withAppleZoom={!reducedMotion}>…</Link.Trigger><Link.Preview /><Link.Menu>…</Link.Menu></Link>`.
  2. Put `Link.AppleZoomTarget` around the destination hero. In the reader that is the cover (`src/features/library/reader/`).
  3. Drive `reducedMotion` from `useEffectiveReducedMotion()`, not Reanimated's `useReducedMotion()`.
  4. Android gets no peek. Keep an explicit "…" button that uses the Compose `DropdownMenu` pattern.
- **Gotchas:**
  - `Link.Preview` renders the real destination route, so it needs to be cheap and must not fire mutations or "seen" analytics on mount. Gate those on focus.
  - The timeline also has a free-tier window (`src/features/timeline/components/timeline-upgrade-banner.tsx`). Don't preview locked content.
  - The zoom pairs on the pushed id, so capture it once (`A/src/app/(app)/item/[id].tsx:120-122`).

#### G4. iOS 26 chrome bundle: soft scroll edge, minimizing tab bar, native bar buttons, glass close button
- **Source:**
  - `scrollEdgeEffects` in `A/src/app/(app)/_layout.tsx:57-66`.
  - `minimizeBehavior="onScrollDown"` in `A/src/app/(app)/(tabs)/_layout.tsx:25`.
  - `Stack.Toolbar.Button` with a manual haptic in `A/src/app/(app)/(tabs)/(home)/_layout.tsx:17-61`.
  - `useToolbarIcon` for Android in `A/src/components/ui/symbol.tsx:87-110`.
  - `ModalCloseToolbar` in `C/components/modal-close-toolbar.tsx:21-49`.
- **Xolace today:**
  - `src/components/app-tabs.tsx:28-32` sets `disableTransparentOnScrollEdge` and does not minimize.
  - Header buttons are JS `Pressable` + `SymbolView` passed to `headerLeft`/`headerRight` in `src/app/(protected)/timeline/_layout.tsx:23-34`. The same pattern is in `src/app/(protected)/settings/_layout.tsx` and `src/app/(protected)/crisis-resources/_layout.tsx`. These miss the iOS 26 glass bar-item treatment and the larger native hit area.
- **Sketch (S each):**
  - Add `scrollEdgeEffects: { top: 'soft' }` to `useLargeHeaderOptions()` on iOS 26. Keep `headerBlurEffect` for iOS 18.
  - Add `minimizeBehavior="onScrollDown"` to `NativeTabs`. Test that `useTabBarHidden` (`src/lib/tab-bar.ts`) still composes.
  - Replace `headerLeft`/`headerRight` renderers with `<Stack.Toolbar placement="left|right"><Stack.Toolbar.Button icon="gearshape" onPress={…} /></Stack.Toolbar>` and call `playSoftPress()` in `onPress`.
  - For Android icons, Xolace already imports `@expo/material-symbols/*.xml` (`chat-action-sheet.tsx:2-6`). Reuse that, or lift `useToolbarIcon`.
- **Gotchas:**
  - Scroll edge effects need the scroll view to be the screen's *first* descendant. Overlays such as `TopBlur` must render after it (`A/src/components/header-fade.tsx:12-13`).
  - Android toolbar buttons accept only image sources (`C/components/modal-close-toolbar.tsx:16-19`).

#### G5. One motion-token module that respects Xolace's tri-state preference
- **Source:** `A/src/theme/motion.ts:9-91`, the motion rules in `A/docs/design-system.md`, and `C/constants/motion.ts:7-35`.
- **Xolace today:** spring configs are hand-tuned file by file:
  - `src/features/quotes/components/poster/star-button.tsx:17` and `action-row.tsx:20` (duplicated)
  - `src/features/session-end/components/flame-intensity-selector.tsx:25-27`
  - `src/features/feedback-tray/engine/use-keyboard-offset.ts:14-15`
  - `src/features/quotes/components/heart-burst.tsx:29`
  - `src/components/shared/animated-text.tsx:11-15`
  - `src/features/reflect/reflect-transitions.ts:21`
  - and 47 `withSpring(` call sites in total.
- **Why it matters:** related surfaces move with the same physics, so the app feels like one product. That is the Repetition and Unity principles in `CLAUDE.md`.
- **Sketch (S to create, then migrate as screens are touched):** create `src/lib/motion/tokens.ts` with `duration`, `easing` (bezier 0.23,1,0.32,1 and so on), `spring.{settle,drag,sheet,snap,glide}` written as `{ duration, dampingRatio }`, plus press scale 0.97. Add a helper like `motionFor(reduced)` that returns opacity-only variants.
- **Gotcha:** **do not** copy Amber's `reduceMotion: ReduceMotion.System`. It reads only the OS flag and ignores Xolace's in-app "reduced" or "full" override (`src/lib/motion/use-effective-reduced-motion.ts:52-63`). Pass `ReduceMotion.Never` and branch on `useEffectiveReducedMotion()` at the call site instead.

### Strong

#### S1. Small sheets become native `formSheet` routes with `fitToContents`
- **Source:** `A/src/app/(app)/_layout.tsx:67-98` (Add, New Space), `C/app/session/_layout.tsx:52-60` and `C/app/session/word-detail.tsx:28-40` (a route sheet that self-dismisses when its data is missing).
- **Xolace today:** about 15 JS sheets (HeroUI `BottomSheet` over `@gorhom/bottom-sheet`). Examples:
  - `src/features/peer-reflection/components/report-sheet.tsx`
  - `src/features/library/reader/aa-sheet.tsx`
  - `src/features/session-end/components/feedback-sheet.tsx`
  - `src/features/awareness-events/components/monthly-event-sheet.tsx`
  - `src/features/reflect/components/streak-calendar/rekindle-sheet.tsx`
  - `src/features/sit-with-this/components/swap-sheet.tsx`
- **Why it matters:** native sheets get the system spring, the glass background on iOS 26, interactive dismiss, VoiceOver escape, and the card-stack scale-back of the presenting screen. Nothing runs on the JS thread.
- **Sketch (M, per sheet):**
  - Start with the stateless, content-only sheets: report, the reader's Aa sheet, monthly event. Add `Stack.Screen name="…" options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true, contentStyle: { backgroundColor } }}`.
  - Pass ids through params and read data with Convex queries.
  - Keep gorhom for sheets that need custom backdrops (the blur overlays in `src/components/bottom-sheet-blur-overlay.tsx`) or that sit over fixed-palette surfaces.
- **Gotchas:**
  - Android resizes the sheet and can drop a keyboard opened mid-resize. Delay focus by about 350 ms (`A/src/app/(app)/add.tsx:~181-187`).
  - Sheets with text inputs need testing with `react-native-keyboard-controller`.
  - Form sheets inherit the nav theme background (see G2).

#### S2. Swipe actions, undo and mirrored accessibility actions on lists
- **Source:**
  - `O/Oyelo/Features/ArchivedItemsView.swift:33-60`: leading full-swipe Restore, trailing Delete, a context menu, plus `accessibilityAction(named:)`.
  - `O/Oyelo/Features/LibraryView.swift:801-826`: an undo bar instead of a confirm.
  - `O/Oyelo/Features/LibraryView.swift:226`: twice the dwell under VoiceOver.
- **Applies to:** Connect conversation rows (archive and unarchive in `src/features/xolacer-chat/use-conversation-row-actions.ts`, `archived-screen.tsx`), and the quotes archive (`src/features/quotes/components/archive/`).
- **Sketch (M):**
  1. Use `ReanimatedSwipeable` from `react-native-gesture-handler` (installed), or `@expo/ui/swift-ui` `SwipeActions` (iOS only, needs `@expo/ui` as a direct dependency).
  2. Fire `playSoftPress` at the commit threshold with Amber's latch (`A/src/lib/tidy/use-single-haptic-on-pan.ts`).
  3. Archive immediately and show a HeroUI toast with an "Undo" action. Keep the toast up longer when `AccessibilityInfo.isScreenReaderEnabled()` is true.
  4. Add the same actions as `accessibilityActions` on the row.
- **Gotcha:** destructive Delete keeps a confirmation. Only use undo for reversible actions (archive, rest).

#### S3. A single splash handoff, with no intermediate loader flash
- **Source:** `A/src/lib/splash.tsx:101-149` (hold counter; exits once into the real screen), `C/components/splash/splash-overlay.tsx:27-91` (`hold` with a fallback timer), `C/components/splash/intro-reveal.tsx:40-96` (content staggers in under the fade).
- **Xolace today:** the native splash hides as soon as fonts load (`src/app/_layout.tsx:238-242`). Then `<FullRippleLoader />` shows while Convex auth and the intake gate resolve (`src/app/_layout.tsx:171`). Users can see splash, then ripple, then app, which is two loading states.
- **Sketch (M):** keep `SplashScreen` up until `!isAuthLoading && !intakeGateLoading`, with a fallback timeout of about 2.5 s, as in `C/components/splash/splash-overlay.tsx:20-22`. Then cross-fade a JS cover that matches the splash art into the first screen. Optionally stagger the first screen's chrome in using `IntroReveal`-style slots.
- **Gotchas:**
  - Bound every hold with a timeout so the app can never wedge.
  - Use `fade:false` (transform only) for anything containing glass.
  - The splash background is a fixed `#040307` (`app.config.ts:182-195`), so the JS cover must match it exactly.

#### S4. Persistent mini-player for Vessa audio in `NativeTabs.BottomAccessory`
- **Source:** `O/Oyelo/Features/PlayerView.swift:3-110` and `O/Oyelo/App/RootView.swift:78-100`. The API is `NativeTabs.BottomAccessory` (`node_modules/expo-router/build/native-tabs/hooks.d.ts:22-35`).
- **Xolace today:** the player is a full-screen modal (`src/app/(protected)/_layout.tsx:41,89`). Playback state lives in the screen's hook (`src/features/browse/use-track-playback.ts:20-25` over `src/lib/audio/use-playback.ts`). Background playback is configured (`src/lib/audio/session.ts:7-11`).
- **Why it matters:** closing the player now means losing your place in the UI even though audio keeps playing. A glass mini-player above the tab bar is the Music and Podcasts pattern. It makes Kindling audio feel like part of the app, not a detour.
- **Sketch (L):**
  1. Hoist the player instance into a zustand slice or provider at `(protected)/_layout.tsx`.
  2. Render `<NativeTabs.BottomAccessory>` with title, play/pause and dismiss. Use `NativeTabs.BottomAccessory.usePlacement()` to get the inline vs regular layout.
  3. Tap opens `browse-player`.
  4. Under reduce transparency, use an opaque fill, as Oyelo does at `PlayerView.swift:93`.
- **Gotchas:**
  - The twig completion logic (`use-track-playback.ts:31-40`) must keep working when the player screen is not mounted.
  - Hide the accessory on fixed-palette and full-bleed routes.
  - This is iOS 26+. On Android, plan a custom bar above the tabs, or nothing.

#### S5. Native rolling numbers for streaks and stats
- **Source:** `C/components/animated-rounded-number.ios.tsx:13-38` and `C/components/animated-rounded-number.tsx:29-50`. The same idea in SwiftUI is `O/Oyelo/Features/UsageView.swift:373`.
- **Applies to:** the streak count (`src/app/(protected)/streak-held.tsx`, `src/features/reflect/components/streak-calendar/`), the insights dial and domain numbers (`src/features/insights/overall-dial.tsx`), and session-end counters.
- **Sketch (S):**
  1. Run `bunx expo install @expo/ui`.
  2. Copy both files to `src/components/shared/animated-number.ios.tsx` and `src/components/shared/animated-number.tsx`.
  3. Swap RN `Text` for `AppText` in the fallback.
  4. Pass `useThemeColor('foreground')` for the colour.
- **Gotchas:**
  - Give the SwiftUI `Host` a fixed-height box, because Hosts don't self-size in flex (`C/components/session/live-wpm.tsx:9`).
  - Use `ignoreSafeArea="all"` (`C/components/animated-rounded-number.ios.tsx:22-26`).
  - SwiftUI uses the system rounded face, not Space Grotesk. Decide whether that is acceptable for numerals.

#### S6. Pace the App Store review prompt
- **Source:** `O/Oyelo/App/ReviewPromptPolicy.swift:4-26` (once per marketing version, at least 120 days apart), `O/Oyelo/App/RootView.swift:284-299` (not on TestFlight, only when active, only after an earned moment).
- **Xolace today:** `src/features/session-end/components/activity-variant.tsx:109-117` calls `StoreReview.requestReview()` *every* time someone closes a session feeling "lighter". iOS silently rate-limits, which wastes the yearly quota on early sessions and TestFlight.
- **Sketch (S):** add a persisted `{ lastReviewVersion, lastReviewAt }` to the zustand slice. Check version and 120 days before calling, and skip non-production variants (`APP_VARIANT`).
- **Gotcha:** keep the "lighter" trigger. It is the right earned moment for a mental-health app and should never fire after "heavier".

#### S7. A themed route error fallback
- **Source:** `C/components/observe-error-fallback.tsx:22-45`.
- **Xolace today:** `src/app/_layout.tsx:93` re-exports expo-router's stock `ErrorBoundary`, a developer-styled screen. Sentry already captures the error.
- **Sketch (S):** export a custom `ErrorBoundary({ error, retry })` from `_layout.tsx`. Render a calm themed screen with `AppText`, a primary "Try again" that calls `retry`, and `Sentry.captureException` in an effect so reporting is not lost.
- **Gotcha:** rule 12. Do not write "your reflection is saved". Drafts are not persisted (`src/store/store.ts:297-305`).

#### S8. Promote the glass primitives to `shared/`, with a capsule glass button and a reduce-transparency fallback
- **Source:** `A/src/components/ui/button.tsx:28-123` (interactive glass; loading dims instead of a spinner), `C/components/ui/glass-surface.tsx:21-62`, `C/components/ui/primary-button.tsx:31-60`, `O/Oyelo/Features/PlayerView.swift:93`.
- **Xolace today:**
  - `GlassSurface` is feature-local in `src/features/insights/glass.tsx:20-34` and ignores Reduce Transparency, although `src/helpers/hooks/use-accessability-info.ts` already tracks it.
  - `GlassView` is used ad hoc in seven files: `src/features/quotes/components/quick-action.tsx`, `src/features/idle-menu/menu-trigger.tsx`, `src/features/trusted-bridge/components/bridge-done-button.tsx` and others.
  - `PillButton` (`src/components/shared/pill-button.tsx`) is a flat `bg-accent/10`.
- **Sketch (S/M):**
  - Move `GlassSurface` to `src/components/shared/glass-surface.tsx`.
  - Add `reduceTransparencyEnabled ? opaque surface : GlassView`.
  - Add a `GlassButton` (capsule, `isInteractive`, solid fallback with 0.97 press scale, `loading` dims) that keeps the Pulsar `playAffirmativePress`.
  - Migrate the seven ad-hoc call sites.
- **Gotchas:** the rules in §1.2 (no animated-opacity ancestor, no nested glass, interactive surfaces must not clip, `Pressable` outside). Uniwind ignores `className` on `GlassView` (`src/features/insights/glass.tsx:24`).

#### S9. Native search in Browse and Lantern
- **Source:** `A/src/app/(app)/(tabs)/(search)/index.tsx:42-62`, `A/src/app/(app)/(tabs)/_layout.tsx:49-55` (iOS `role="search"` tab), `O/Oyelo/Features/LibraryView.swift:254-258`.
- **Applies to:** the Browse hub (`src/app/(protected)/(tabs)/browse/index.tsx`) and the Lantern library. Searching the user's own reflections in the timeline would be a new backend capability and needs the rule-1 feature test.
- **Sketch (M):** add `<Stack.SearchBar placeholder="Search Lantern" onChangeText … />` to the browse stack's index screen. Debounce with the existing `src/lib/use-debounce.ts`. Hold results with `useStableQuery` (the `CLAUDE.md` rule for args that change with input). Use themed empty and no-result states.
- **Gotcha:** don't add a fourth tab with `role="search"`. The map rules limit tabs (`src/components/app-tabs.tsx:37-39`).

### Nice to have

| # | Idea | Source | Xolace target / today | Effort | Notes |
|---|---|---|---|---|---|
| N1 | Clipboard-aware, keyboard-riding composer CTA | `C/components/onboarding/onboarding-screen.tsx:30-80` (clamped `useReanimatedKeyboardAnimation`), `A/src/app/(app)/add.tsx:~165-187` | Intake steps (`src/features/intake/questionnaire/name-step.tsx` already uses keyboard-controller), trusted bridge, Xolacer edit | S | Port the "never move DOWN" clamp for Android floating keyboards. |
| N2 | Pager onboarding with continuous segmented progress and a11y progressbar | `C/components/onboarding/onboarding-flow.tsx:34-155` | Intake questionnaire (`src/features/intake/questionnaire/`) | M | Hide inactive pages from accessibility, keep visited pages mounted to retain drafts, and handle Android back. |
| N3 | Permission primer, plus skip when already answered | `C/components/onboarding/pages/microphone.tsx:33-44`, `O/Oyelo/Features/OnboardingView.swift:85-93` | Voice vent mic (`src/features/vent/`), push nudge (`src/features/session-end/components/session-end-notif-nudge.tsx`) | S | A denial swaps the CTA to Open Settings and the flow never blocks. |
| N4 | Blurred per-glyph header text morph | `A/src/components/animated-text.tsx`, `A/src/lib/text-morph.ts` | Titles that change in place: reflect state headings, the session-end phase title. Xolace's `src/components/shared/animated-text.tsx` only fades and rises characters | M | Needs `@shopify/react-native-skia` (installed) and the Space Grotesk TTFs passed to `useFont` (from `@expo-google-fonts/space-grotesk`). Respect `useEffectiveReducedMotion`. Fall back to native text at accessibility sizes, as Amber does (`A/docs/design-system.md`, Motion). |
| N5 | One haptic per pan, latched on the UI thread | `A/src/lib/tidy/use-single-haptic-on-pan.ts:13-34` | Quote deck and stacked carousels (`src/features/discovery/components/stacked-carousel.tsx`, `src/features/quotes/components/archive/quote-stack.tsx`), S2 swipes | S | Replace `Haptics.impactAsync` with `scheduleOnRN(playSoftPress)`. |
| N6 | Chart scrub haptics | `C/components/analytics/score-chart.tsx:223` | `src/components/ui/heatmap-chart/`, insights | S | Use `playTextureSelect`/`tap` per cell change. |
| N7 | Native date and hour pickers in Settings | `O/Oyelo/Features/ReminderView.swift:26-33`; `@expo/ui` `DatePicker`/`Picker` (`node_modules/@expo/ui/build/swift-ui/`) | The quiet window uses dialog radio lists (`src/features/settings/components/quiet-window-dialog.tsx:7-22`, `hour-radio-group.tsx`) | M | iOS only via SwiftUI; keep HeroUI on Android. |
| N8 | Native iOS toggle in settings rows | `A/src/components/biometric-setting.tsx:34-58` | `src/features/settings/components/settings-row.tsx:102-111` (HeroUI `Switch`) | S | SDK 57 names it `Toggle` (not Amber's `Switch`). HeroUI's switch is themed, so only do this if iOS 26 parity matters. |
| N9 | Increase Contrast and cross-fade preferences | `O/Oyelo/Features/OnboardingWaveView.swift:26`; RN `AccessibilityInfo.prefersCrossFadeTransitions()` and the `darkerSystemColorsChanged` event (`node_modules/react-native/Libraries/Components/AccessibilityInfo/AccessibilityInfo.d.ts:20,94`) | Fold `prefersCrossFadeTransitions` into `src/lib/motion/use-effective-reduced-motion.ts` so stack pushes become fades (`src/app/(protected)/_layout.tsx:85,93` already fade on reduced motion) | S | Increase Contrast could thicken muted text tokens. |
| N10 | Accessibility-size adaptations | `O/Oyelo/Features/FollowBlogSheet.swift:32-42` (sheets go large), `O/Oyelo/Features/LibraryView.swift:801-826` (capsule → stacked) | Sheets from S1 (`sheetAllowedDetents: [1]` when `fontScale >= 1.35`), toasts | S | Read `PixelRatio.getFontScale()`. |
| N11 | Alternate app icons per theme (a Plus perk) | `O/Oyelo/Features/AppIconView.swift:5-79`, `O/Oyelo/Resources/AppIcon-*.icon` | Appearance (`src/features/settings/components/screens/AppearanceScreen.tsx`); one icon per colour theme | M | Needs a community module or config plugin for `setAlternateIconName` (none installed). Verify SDK 57 support, and do the Android activity-alias work. |
| N12 | Distinct dev and preview app icons | `A/app.config.ts:30-39` | `app.config.ts:61-65` uses the same icon for every `APP_VARIANT` | S | Add a ribbon icon so dev, preview and prod builds are distinguishable on a device. |
| N13 | Android `colorAccent` from the theme | `A/plugins/with-android-accent.js` | No `plugins/` dir in Xolace. Android cursors and dialogs fall back to stock teal | S | Static, so use the default theme's accent. |
| N14 | Live mic waveform | `C/components/session/live-waveform.tsx:51-73` | Voice vent (`src/features/vent/hooks/use-vent-recorder.ts`), reflect dictation | S | Vent is a fixed palette, so pass its palette tokens. The current particles may already cover this need. |
| N15 | Welcome cover exits over the next screen | `A/src/lib/welcome-transition.tsx:15-46` | `(onboarding)` → `(auth)` handoff (`src/app/_layout.tsx:155-167`) | S | Use a fade under reduced motion. Bound it with a timeout (Amber uses 2 s). |
| N16 | Manual "Check for updates" row with a themed reload screen | `A/src/components/update-setting.tsx:15-81` | Settings version line (`src/features/settings/components/screens/SettingsScreen.tsx:63`). The auto sheet already exists (`src/components/shared/update-bottom-sheet.tsx`) | S | Show channel and update date for support triage. |
| N17 | Widgets, App Intents ("Start a reflection"), share-in | `A/src/widgets/`, `A/app-intents/`, `O/OyeloActivity/`, `O/OyeloShare/` | **Planned / Phase 3** per `docs/foundation/xolace-for-agents.md` rule 8 (opt-in, discreet, never reveal what someone carries) | L | `expo-widgets` is SDK 58 and needed a patch (`A/patches/expo-widgets@58.0.9.patch`), so wait for the SDK bump. |
| N18 | Debounced route params when paging detail screens | `A/src/app/(app)/item/[id].tsx:126-152` | Any future swipe-between-sessions in the timeline detail | S | `setParams` re-renders the whole native stack. |

**Explicitly not recommended:**
- Clarity's custom glass tab bar (`C/components/glass-tabs/glass-tab-bar.tsx`), which is less native than Xolace's `NativeTabs`.
- Amber's private-API progressive blur (`A/modules/progressive-blur/ios/ProgressiveBlurView.swift:4-12`), an App Review risk that Xolace's `TopBlur` already makes unnecessary.
- Clarity's Lottie splash, which is inverted black and white by design (`C/components/splash/splash-overlay.tsx:15-18`) and off-brand for the campfire.

---

## 3. Lift-able code

"Missing" lists what you must add or change for the file to compile and fit Xolace's conventions (`CLAUDE.md`: `AppText` instead of `Text`, tokens instead of hex, `.get()/.set()`, no manual memo, files under 200 lines).

| Sample file | What it does | Deps it needs | Missing to make it complete in Xolace | Xolace target |
|---|---|---|---|---|
| `C/components/animated-rounded-number.ios.tsx` + `.tsx` | Native SwiftUI rolling digits; RN fallback | `@expo/ui` (**transitive only**), RN | `bunx expo install @expo/ui`. Replace the `FontFace` import from `@/constants/theme` with Xolace font classes, and use `AppText` in the fallback | `src/components/shared/animated-number.ios.tsx`, `animated-number.tsx` |
| `C/components/modal-close-toolbar.tsx` | iOS glass xmark / Android circle close in the native header | expo-router (installed) | Hugeicons is not installed. Use `@expo/material-symbols/close.xml` as in `src/features/xolacer-chat/components/chat-action-sheet.tsx:4`. Swap `useTheme()` for `useThemeColor('surface-secondary')`, and the style hex for tokens | `src/components/shared/modal-close-toolbar.tsx` |
| `C/components/observe-error-fallback.tsx` | Calm error screen with reset | expo-observe (installed) | Xolace uses expo-router's `ErrorBoundary` (`retry` prop), not `ObserveErrorBoundary`. Add `Sentry.captureException`, `AppText` and a HeroUI `Button`. Copy must be literally true (rule 12) | Exported `ErrorBoundary` in `src/app/_layout.tsx`; component in `src/components/shared/route-error.tsx` |
| `C/components/ui/glass-surface.tsx` | Glass card with an opaque fallback | expo-glass-effect (installed) | Already ported as `src/features/insights/glass.tsx:20-34`. Still missing: the reduce-transparency branch and the `interactive` flag with non-clipping overflow | Move to `src/components/shared/glass-surface.tsx` |
| `A/src/components/ui/button.tsx` | Interactive glass capsule button; solid fallback; dim-on-loading | expo-glass-effect, gesture-handler, reanimated (all installed) | Unistyles → Uniwind `className` on the inner view (not on `GlassView`). `ThemedText` → `AppText`. `theme.colors.*` → `useThemeColor`. Replace `motionCSS` with G5 tokens. Add `playAffirmativePress()` | `src/components/shared/glass-button.tsx` |
| `C/components/splash/intro-reveal.tsx` | Staggered first-load reveal with a glass-safe `fade:false` | reanimated (installed) | Replace `progress.value` with `.get()/.set()`. Replace `ReduceMotion.System` with a branch on `useEffectiveReducedMotion()` | `src/components/shared/intro-reveal.tsx` (with S3) |
| `C/components/splash/splash-overlay.tsx` | Held splash with a fallback timer | `lottie-react-native` (**not installed**), worklets (installed) | Replace Lottie with Xolace's splash icon or the ripple loader. Replace the hex `BACKDROP` with the `#040307` from `app.config.ts:184` as a fixed-palette token. Apply `.get()/.set()` | `src/components/shared/loader/splash-overlay.tsx` |
| `A/src/lib/splash.tsx` | Hold-counter splash provider (`useSplashHold`) | reanimated, worklets (installed) | `Wordmark` (Amber's brand) → the Xolace mark. Unistyles → Uniwind. Wire the `motion.splash` tokens into G5 | `src/providers/splash-provider.tsx` |
| `C/components/onboarding/onboarding-flow.tsx` + `onboarding-screen.tsx` | Spring pager, segmented progress, keyboard-riding CTA | reanimated, keyboard-controller (installed) | Hugeicons → SymbolView. `ProgressiveBlur` → `src/features/insights/top-blur.tsx`. `PrimaryButton` → S8 button. Split to stay under 200 lines. `.value` → `.get()/.set()` | `src/features/intake/questionnaire/` (pager shell) |
| `C/components/session/live-waveform.tsx` | UI-thread ring-buffer waveform | reanimated (installed) | Replace `fonts`/`type` tokens and RN `Text` with `AppText`. Replace `samples.value` with `.get()/.set()`. Feed it a `SharedValue` mic level from `expo-audio` metering | `src/features/vent/components/vent-waveform.tsx` |
| `A/src/components/ui/symbol.tsx` | One SF name → SF on iOS / Material on Android; `useToolbarIcon` image sources | expo-symbols (installed; `unstable_getMaterialSymbolSourceAsync` and `androidWeights` exist in 57) | Extend `ANDROID_SYMBOLS` with Xolace's glyphs (`safari`, `square.grid.2x2`, `gearshape`, …). Overlaps the existing `{ios, android}` objects and the `@expo/material-symbols` xml imports, so pick one convention | `src/components/shared/symbol.tsx` |
| `A/src/components/ui/action-menu.tsx` + `.android.tsx` | ActionSheetIOS / Compose DropdownMenu overflow | `@expo/ui` (transitive), RN | Add `@expo/ui` as a direct dep. Replace `theme.colors.*` with `useThemeColor`. Add a haptic on open | `src/components/shared/action-menu.tsx` (Android fallback for G3) |
| `A/src/components/header-fade.tsx` | Canvas-coloured gradient behind a transparent header | RN `experimental_backgroundImage` | Mostly redundant with `src/features/insights/top-blur.tsx`. Its `alpha()` helper builds colours from a hex | Skip, or merge its iOS stop curve into `TopBlur` |
| `A/src/theme/motion.ts` | Duration, curve and spring tokens | reanimated (installed) | Replace `ReduceMotion.System` with `Never` + `useEffectiveReducedMotion` branching (G5). Drop `motion.textMorph` unless N4 ships | `src/lib/motion/tokens.ts` |
| `A/src/lib/tidy/use-single-haptic-on-pan.ts` | One haptic per pan, latched on the UI thread | reanimated, worklets (installed) | Replace `expo-haptics` (not a direct Xolace dep) with `playSoftPress` from `src/lib/haptics`. Remove the manual `useCallback`s; the React Compiler handles memoisation | `src/lib/haptics/use-pan-haptic-latch.ts` |
| `A/src/components/animated-text.tsx` + `A/src/lib/text-morph.ts` | Skia blurred glyph morph | Skia (installed), reanimated | Amber's font `require`s (`@assets/fonts/Satoshi-*.otf`) do not exist. Point them at Space Grotesk TTFs from `node_modules/@expo-google-fonts/space-grotesk`. `animated-text.tsx` is 324 lines, so split it. Remove `memo`/`useMemo` | `src/components/shared/text-morph/` |
| `A/src/lib/app-lock-storage.ts` + `app-lock-controller.ts` + `app-lock.tsx` | Biometric lock, SecureStore proof, app-switcher protection | `expo-local-authentication`, `expo-screen-capture` (**not installed**), expo-secure-store (installed) | Install both and rebuild the dev client (native). Clerk `userId` keys are compatible with `useAuth`. Persist the reflect draft first (G1). Add an `NSFaceIDUsageDescription` via `app.config.ts` | `src/providers/app-lock/` |
| `A/src/components/biometric-setting.tsx` | Optimistic native toggle while the Face ID prompt runs | `@expo/ui` (transitive) | SDK 57: `Switch` → `Toggle` from `@expo/ui/swift-ui`. `SettingsRow` → Xolace's `settings-row.tsx` | `src/features/settings/components/biometric-row.tsx` |
| `A/src/components/update-setting.tsx` | Manual OTA check and restart | expo-updates (installed) | `SettingsRow` / `SettingsValue` → Xolace settings row. Theme the reload screen via `useThemeColor` | `src/features/settings/components/update-row.tsx` |
| `A/plugins/with-android-accent.js` | Android `colorAccent` from the theme | `expo/config-plugins` | `load-theme.js` reads Amber's theme file. Replace it with a constant from Xolace's default theme | `plugins/with-android-accent.js` + `app.config.ts` plugins |
| `O/Oyelo/App/ReviewPromptPolicy.swift` | Review pacing policy | — (port the logic) | Write ~20 lines of TS around `expo-store-review` (installed) and the persisted zustand slice | `src/features/session-end/review-prompt-policy.ts` |
| `O/Oyelo/Features/PlayerView.swift` (`MiniPlayer`) | Glass mini player | — (concept only) | Needs a global player store (S4). Render inside `NativeTabs.BottomAccessory` | `src/features/browse/player/mini-player.tsx` |

---

## 4. Suggested order

1. **G2** nav theme (S): it removes per-screen background workarounds and makes everything after it look right.
2. **G1, phase 1**: app-switcher privacy cover (S). This has the highest trust return for a mental-health app.
3. **G4** iOS 26 chrome bundle (S each).
4. **S6** review pacing (S) and **S7** themed error boundary (S).
5. **G5** motion tokens (S), then migrate opportunistically.
6. **G3** previews, menus and zoom on timeline, Lantern and Connect (M).
7. **S8** shared glass primitives, then **S5** rolling numbers.
8. **S1** native form sheets, one sheet at a time.
9. **S3** splash handoff and **S2** swipe and undo.
10. **S4** mini player (L) and **G1, phase 2** biometric lock (L), each with its own design pass.
