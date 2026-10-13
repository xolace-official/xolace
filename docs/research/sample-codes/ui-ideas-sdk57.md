# UI ideas we can ship on SDK 57 without `@expo/ui`

Filtered from [`ui-ideas.md`](./ui-ideas.md) on 2026-10-12. Path shorthand (`A/`, `C/`, `O/`) and the version notes are the same as in that file.

**Filter rule.** An idea stays if it builds on what Xolace already has: expo-router 57.0.17, expo-glass-effect, Reanimated, Gesture Handler, Skia, keyboard-controller, HeroUI Native, or a plain Expo module that `bunx expo install` adds on SDK 57. An idea is dropped if it needs `@expo/ui` (SwiftUI or Compose) or an SDK 58 module.

Every expo-router API used below has been checked against the installed 57.0.17 build. The checks are listed in `ui-ideas.md` lines 12–19.

## Dropped

| # | Idea | Why it is dropped |
|---|---|---|
| S5 | Native rolling numbers | Uses the SwiftUI `Text` with `contentTransition` from `@expo/ui` |
| N7 | Native date and hour pickers | Uses the `@expo/ui` `DatePicker` and `Picker` |
| N8 | Native iOS toggle in settings rows | Uses the `@expo/ui` `Toggle` |
| N17 | Widgets and App Intents | `expo-widgets` needs SDK 58 plus a patch |
| — | `A/src/components/ui/action-menu.android.tsx` | Uses the Compose `DropdownMenu`. G3 uses a HeroUI `Menu` on Android instead |
| — | `A/src/components/biometric-setting.tsx` | Uses the SwiftUI `Toggle`. G1 phase 2 uses the existing HeroUI `Switch` row instead |

---

## Great

### G1. App-switcher privacy cover, then an optional Face ID lock
- **Source:** `A/src/lib/app-lock-storage.ts:69-78`, `A/src/lib/app-lock.tsx:76`, `A/src/lib/splash.tsx:126-135`, `A/docs/biometric-app-lock.md`.
- **Why:** today the iOS app switcher shows the last screen of a mental-health journal in plain view. This conflicts with foundation rule 8 ("discreet by default").
- **New deps:** `expo-screen-capture` (phase 1) and `expo-local-authentication` (phase 2). Both are SDK 57 Expo modules and both need a dev-client rebuild.
- **Phase 1 (S):** add a `PrivacyCover` in `src/providers/` that calls `enableAppSwitcherProtectionAsync` at boot. Gate it with a Settings → Data toggle that is on by default and persisted in the zustand slice.
- **Phase 2 (M/L):** port Amber's lock controller and storage. `expo-secure-store` is already installed. The settings row is the existing HeroUI `Switch` in `src/features/settings/components/settings-row.tsx`, flipped optimistically while the Face ID prompt runs.
- **Gotchas:**
  - On Android, the protection is `FLAG_SECURE`, which also blocks screenshots. Say so in the toggle copy, or make it a separate toggle.
  - The reflect draft is not persisted (`src/store/store.ts:297-305`). Persist it before adding the lock.
  - Rule 12: the copy must not claim more protection than this feature gives.

### G2. Feed the theme palette into the nav theme and the native root background
- **Source:** `A/src/app/_layout.tsx:22-52`, `C/app/_layout.tsx:159-189`.
- **Today:** `src/app/_layout.tsx:249` passes the stock `DarkTheme`/`DefaultTheme`. Per-stack `bg-background` wrappers and `contentStyle` patches cover the gap.
- **Sketch (S):** build `navTheme` from `useThemeColor(...)`. Call `SystemUI.setBackgroundColorAsync(background)`; `expo-system-ui` is already installed. Add a SpaceGrotesk `fonts` map. Then delete the per-stack wrappers one at a time.
- **Gotchas:**
  - Keep the opaque iOS 18 `contentStyle` (`src/lib/navigation-options.tsx:29-34`) until you verify the nav theme alone fixes the ghosted-push bug.
  - Fixed-palette surfaces keep their own backgrounds.

### G3. Native peek, context menu and zoom on tappable cards
- **Source:** `A/src/components/item-card.tsx:112-249`, `A/src/components/masonry-feed.tsx:24-32`, `A/src/app/(app)/(tabs)/(spaces)/index.tsx:191-224`.
- **APIs:** `Link.Trigger withAppleZoom`, `Link.Preview`, `Link.Menu` and `Link.AppleZoomTarget`. All four are in expo-router 57.
- **Applies to:**
  - Timeline entry → session detail
  - Lantern entry cards and the hub carousel → reader, with the zoom starting from the cover
  - Browse shelf tiles
  - Connect rows: a `Link.Menu` replaces the bottom-toolbar long-press
- **Sketch (M):** wrap each card in `Link` + `Trigger`/`Preview`/`Menu`, and put `AppleZoomTarget` on the destination hero. Drive `withAppleZoom` from `useEffectiveReducedMotion()`.
- **Android:** there is no peek. Add an explicit "…" button that opens a HeroUI Native `Menu` (`.heroui-docs/native/components/(collections)/menu.mdx`), not Amber's Compose menu.
- **Gotchas:**
  - `Link.Preview` mounts the real route, so gate mutations and "seen" analytics on focus.
  - Don't preview content behind the timeline free-tier window.
  - Capture the zoom id once.

### G4. iOS 26 chrome bundle
- **Source:** `A/src/app/(app)/_layout.tsx:57-66`, `A/src/app/(app)/(tabs)/_layout.tsx:25`, `A/src/app/(app)/(tabs)/(home)/_layout.tsx:17-61`, `A/src/components/ui/symbol.tsx:87-110`, `C/components/modal-close-toolbar.tsx:21-49`.
- **Sketch (S each):**
  - Add `scrollEdgeEffects: { top: 'soft' }` to `useLargeHeaderOptions()` on iOS 26. Keep `headerBlurEffect` for iOS 18.
  - Add `minimizeBehavior="onScrollDown"` to `NativeTabs` in `src/components/app-tabs.tsx`. Then check that `useTabBarHidden` (`src/lib/tab-bar.ts`) still composes.
  - Replace the `headerLeft`/`headerRight` Pressables in the timeline, settings and crisis-resources layouts with `Stack.Toolbar.Button`, and call `playSoftPress()` in `onPress`.
  - For Android icons, reuse the `@expo/material-symbols/*.xml` imports (`chat-action-sheet.tsx:2-6`).
  - Lift `ModalCloseToolbar` with the Hugeicons import swapped for a material-symbols import, and hex swapped for tokens.
- **Gotchas:**
  - The scroll view must be the screen's first descendant, and overlays such as `TopBlur` must render after it.
  - Android toolbar buttons accept only image sources.

### G5. One motion-token module on the tri-state preference
- **Source:** `A/src/theme/motion.ts:9-91`, the Motion section of `A/docs/design-system.md`, `C/constants/motion.ts:7-35`.
- **Today:** 47 hand-tuned `withSpring(` call sites, including duplicates in `star-button.tsx:17` and `action-row.tsx:20`.
- **Sketch (S, then migrate as screens are touched):**
  - Create `src/lib/motion/tokens.ts` with `duration`, `easing`, `spring.{settle,drag,sheet,snap,glide}` written as `{ duration, dampingRatio }`, and a press scale of 0.97.
  - Add a `motionFor(reduced)` helper that returns opacity-only variants.
- **Gotcha:** use `ReduceMotion.Never` and branch on `useEffectiveReducedMotion()`. Do not copy Amber's `ReduceMotion.System`.

---

## Strong

### S1. Small sheets become native `formSheet` routes with `fitToContents`
- **Source:** `A/src/app/(app)/_layout.tsx:67-98`, `C/app/session/_layout.tsx:52-60`, `C/app/session/word-detail.tsx:28-40`.
- **Start with these stateless sheets:**
  - `src/features/peer-reflection/components/report-sheet.tsx`
  - `src/features/library/reader/aa-sheet.tsx`
  - `src/features/awareness-events/components/monthly-event-sheet.tsx`
- **Sketch (M per sheet):** give each sheet a `Stack.Screen` with `presentation: 'formSheet'`, `sheetAllowedDetents: 'fitToContents'` and `sheetGrabberVisible: true`. Pass ids as params and read data with Convex. If the data is missing, the sheet dismisses itself.
- **Keep gorhom for:** blur-backdrop sheets and sheets that sit over fixed-palette surfaces.
- **Gotchas:**
  - On Android, delay input focus by about 350 ms.
  - Test sheets that have inputs with keyboard-controller.

### S2. Swipe actions, undo and mirrored accessibility actions
- **Source:** `O/Oyelo/Features/ArchivedItemsView.swift:33-60`, `O/Oyelo/Features/LibraryView.swift:226,801-826`, `A/src/lib/tidy/use-single-haptic-on-pan.ts`.
- **Applies to:** Connect conversation rows (archive and unarchive), and the quotes archive.
- **Sketch (M):**
  1. Use `ReanimatedSwipeable` from `react-native-gesture-handler` (installed), not the `@expo/ui` `SwipeActions`.
  2. Fire one latched `playSoftPress` at the commit threshold.
  3. Archive immediately and show a HeroUI toast with an "Undo" action. Keep the toast up twice as long when a screen reader is on.
  4. Add the same actions as `accessibilityActions` on the row.
- **Gotcha:** use undo only for reversible actions. Delete keeps its confirmation.

### S3. A single splash handoff
- **Source:** `A/src/lib/splash.tsx:101-149`, `C/components/splash/splash-overlay.tsx:27-91`, `C/components/splash/intro-reveal.tsx:40-96`.
- **Today:** the native splash hides at font load, `FullRippleLoader` shows next, and then the app appears. That is two loading states.
- **Sketch (M):**
  - Hold `SplashScreen` until auth and the intake gate resolve, with a fallback timeout of about 2.5 s.
  - Cross-fade a JS cover that matches the `#040307` splash into the first screen, then stagger that screen's chrome in.
- **Gotchas:**
  - Bound every hold with a timeout.
  - Use `fade:false` for anything that contains glass.
  - Skip Clarity's Lottie splash, because `lottie-react-native` is not installed.

### S4. Persistent Vessa mini-player in `NativeTabs.BottomAccessory`
- **Source:** `O/Oyelo/Features/PlayerView.swift:3-110`, `O/Oyelo/App/RootView.swift:78-100`.
- **API:** `NativeTabs.BottomAccessory` with `usePlacement()`. It is in expo-router 57 (`node_modules/expo-router/build/native-tabs/hooks.d.ts:22-35`).
- **Sketch (L):**
  1. Hoist the player into a store or provider at `(protected)/_layout.tsx`.
  2. Render title, play/pause and dismiss in the accessory.
  3. Tapping the accessory opens `browse-player`.
  4. Under Reduce Transparency, use an opaque fill.
- **Gotchas:**
  - Twig completion (`use-track-playback.ts:31-40`) must keep working when the player screen is unmounted.
  - Hide the accessory on fixed-palette and full-bleed routes.
  - The accessory is iOS 26 only.

### S6. Pace the App Store review prompt
- **Source:** `O/Oyelo/App/ReviewPromptPolicy.swift:4-26`, `O/Oyelo/App/RootView.swift:284-299`.
- **Today:** `src/features/session-end/components/activity-variant.tsx:109-117` calls `requestReview()` on every "lighter" close.
- **Sketch (S):**
  - Persist `{ lastReviewVersion, lastReviewAt }`.
  - Allow at most one request per version, at least 120 days apart, and only on production `APP_VARIANT`.
  - Keep the "lighter" trigger.

### S7. A themed route error fallback
- **Source:** `C/components/observe-error-fallback.tsx:22-45`.
- **Sketch (S):** export a custom `ErrorBoundary({ error, retry })` from `src/app/_layout.tsx`. Render it with `AppText`, a HeroUI "Try again" button that calls `retry`, and `Sentry.captureException` in an effect.
- **Gotcha:** rule 12. Do not write "your reflection is saved".

### S8. Shared glass primitives with a Reduce Transparency fallback
- **Source:** `A/src/components/ui/button.tsx:28-123`, `C/components/ui/glass-surface.tsx:21-62`, `C/components/ui/primary-button.tsx:31-60`, `O/Oyelo/Features/PlayerView.swift:93`.
- **Sketch (S/M):**
  - Move `src/features/insights/glass.tsx` to `src/components/shared/glass-surface.tsx`.
  - Branch on reduce-transparency, which `use-accessability-info.ts` already tracks.
  - Add a `GlassButton`: a capsule using `isInteractive`, with a solid 0.97-scale fallback, a dimmed loading state and `playAffirmativePress`.
  - Migrate the seven ad-hoc `GlassView` sites.
- **Gotchas:**
  - No animated-opacity ancestor.
  - No nested glass.
  - Interactive glass must not clip.
  - The `Pressable` goes outside the `GlassView`.
  - Uniwind ignores `className` on `GlassView`.

### S9. Native search in Browse and Lantern
- **Source:** `A/src/app/(app)/(tabs)/(search)/index.tsx:42-62`, `O/Oyelo/Features/LibraryView.swift:254-258`.
- **Sketch (M):** add `Stack.SearchBar` to the browse index. Debounce with `src/lib/use-debounce.ts` and hold results with `useStableQuery`. Add themed empty and no-result states.
- **Gotcha:** do not add a `role="search"` tab.

---

## Nice to have

| # | Idea | Source | Xolace target | Effort | Notes |
|---|---|---|---|---|---|
| N1 | Keyboard-riding composer CTA, plus clipboard prefill | `C/components/onboarding/onboarding-screen.tsx:30-80`, `A/src/app/(app)/add.tsx:~165-187` | Intake steps, trusted bridge, Xolacer edit | S | Port the clamp that stops the CTA moving down on Android floating keyboards |
| N2 | Pager onboarding with segmented progress and an a11y progressbar | `C/components/onboarding/onboarding-flow.tsx:34-155` | `src/features/intake/questionnaire/` | M | Hide inactive pages from accessibility, keep visited pages mounted, and handle Android back |
| N3 | Permission primer, skipped when already answered | `C/components/onboarding/pages/microphone.tsx:33-44`, `O/Oyelo/Features/OnboardingView.swift:85-93` | Vent mic, push nudge | S | A denial swaps the CTA to Open Settings, and the flow never blocks |
| N4 | Skia blurred per-glyph header morph | `A/src/components/animated-text.tsx`, `A/src/lib/text-morph.ts` | Reflect state headings, session-end phase title | M | Skia is installed. Use the Space Grotesk TTFs and respect reduced motion |
| N5 | One haptic per pan, latched on the UI thread | `A/src/lib/tidy/use-single-haptic-on-pan.ts:13-34` | Quote deck, stacked carousels, S2 | S | Replace `Haptics.impactAsync` with `scheduleOnRN(playSoftPress)` |
| N6 | Chart scrub haptics | `C/components/analytics/score-chart.tsx:223` | `src/components/ui/heatmap-chart/`, insights | S | Fire `playTextureSelect` on each cell change |
| N9 | Increase Contrast and cross-fade preferences | RN `AccessibilityInfo.prefersCrossFadeTransitions()`, `darkerSystemColorsChanged` | `src/lib/motion/use-effective-reduced-motion.ts` | S | When cross-fade is preferred, stack pushes become fades |
| N10 | Accessibility-size adaptations | `O/Oyelo/Features/FollowBlogSheet.swift:32-42`, `LibraryView.swift:801-826` | S1 sheets, toasts | S | Use `PixelRatio.getFontScale() >= 1.35` to switch sheets to the large detent and to stack toasts |
| N11 | Alternate app icons per theme (a Plus perk) | `O/Oyelo/Features/AppIconView.swift:5-79` | Appearance screen | M | Needs a community module. Verify that it supports SDK 57 before committing |
| N12 | Distinct dev and preview app icons | `A/app.config.ts:30-39` | `app.config.ts:61-65` | S | Add a ribbon icon for each `APP_VARIANT` |
| N13 | Android `colorAccent` from the theme | `A/plugins/with-android-accent.js` | A new `plugins/` dir | S | Use the default theme's accent as a constant |
| N14 | Live mic waveform | `C/components/session/live-waveform.tsx:51-73` | `src/features/vent/` | S | Pass vent's fixed-palette tokens. The current particles may already cover this |
| N15 | Welcome cover exits over the next screen | `A/src/lib/welcome-transition.tsx:15-46` | `(onboarding)` → `(auth)` handoff | S | Fade under reduced motion, with a 2 s timeout |
| N16 | Manual "Check for updates" row | `A/src/components/update-setting.tsx:15-81` | Settings version line | S | Uses `expo-updates` (installed). Show the channel and the update date |
| N18 | Debounced route params when paging | `A/src/app/(app)/item/[id].tsx:126-152` | A future swipe-between-sessions in the timeline | S | Each `setParams` re-renders the whole native stack |

---

## Lift-able code (no `@expo/ui`)

| Sample file | Xolace target | Main changes |
|---|---|---|
| `C/components/modal-close-toolbar.tsx` | `src/components/shared/modal-close-toolbar.tsx` | Material-symbols xml for the icon, `useThemeColor` for colours |
| `C/components/observe-error-fallback.tsx` | `src/components/shared/route-error.tsx` + the `ErrorBoundary` export | expo-router `retry`, Sentry, `AppText`, a HeroUI `Button` |
| `C/components/ui/glass-surface.tsx` | `src/components/shared/glass-surface.tsx` | Add the reduce-transparency branch and the non-clipping `interactive` flag |
| `A/src/components/ui/button.tsx` | `src/components/shared/glass-button.tsx` | Unistyles → Uniwind, `AppText`, G5 tokens, Pulsar haptic |
| `C/components/splash/intro-reveal.tsx` | `src/components/shared/intro-reveal.tsx` | `.get()/.set()`, `useEffectiveReducedMotion` |
| `A/src/lib/splash.tsx` | `src/providers/splash-provider.tsx` | Xolace mark, Uniwind, G5 tokens |
| `C/components/onboarding/onboarding-flow.tsx` + `onboarding-screen.tsx` | `src/features/intake/questionnaire/` | SymbolView, `TopBlur`, the S8 button, split to stay under 200 lines |
| `C/components/session/live-waveform.tsx` | `src/features/vent/components/vent-waveform.tsx` | `AppText`, `.get()/.set()`, an expo-audio metering `SharedValue` |
| `A/src/components/ui/symbol.tsx` | `src/components/shared/symbol.tsx` | Extend `ANDROID_SYMBOLS`, and pick one icon convention |
| `A/src/theme/motion.ts` | `src/lib/motion/tokens.ts` | `ReduceMotion.Never` with branching on the in-app preference |
| `A/src/lib/tidy/use-single-haptic-on-pan.ts` | `src/lib/haptics/use-pan-haptic-latch.ts` | `playSoftPress`, no manual `useCallback` |
| `A/src/components/animated-text.tsx` + `A/src/lib/text-morph.ts` | `src/components/shared/text-morph/` | Space Grotesk fonts, split the 324-line file, no memo |
| `A/src/lib/app-lock-storage.ts` + `app-lock-controller.ts` + `app-lock.tsx` | `src/providers/app-lock/` | Install the two Expo modules and add `NSFaceIDUsageDescription`. Persist the draft first |
| `A/src/components/update-setting.tsx` | `src/features/settings/components/update-row.tsx` | Xolace settings row, theme tokens |
| `A/plugins/with-android-accent.js` | `plugins/with-android-accent.js` | A constant accent instead of `load-theme.js` |
| `O/Oyelo/App/ReviewPromptPolicy.swift` | `src/features/session-end/review-prompt-policy.ts` | About 20 lines of TS around `expo-store-review` |

---

## Suggested order

1. G2: nav theme (S)
2. G1 phase 1: app-switcher privacy cover (S)
3. G4: iOS 26 chrome bundle (S each)
4. S6: review pacing, and S7: themed error boundary (S)
5. G5: motion tokens (S), then migrate opportunistically
6. G3: previews, menus and zoom (M)
7. S8: shared glass primitives
8. S1: native form sheets, one at a time
9. S3: splash handoff, and S2: swipe and undo
10. S4: mini player (L), and G1 phase 2: biometric lock (L)
