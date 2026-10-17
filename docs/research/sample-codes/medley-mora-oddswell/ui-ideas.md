# UI/UX ideas from Medley, Mora and oddswell

Research date: 2026-10-14. This file follows [`../ui-ideas.md`](../ui-ideas.md) (Amber, Clarity, Oyelo) and its SDK 57 filter [`../ui-ideas-sdk57.md`](../ui-ideas-sdk57.md). It does not repeat their ideas. Where an idea touches one of theirs, it points to it by ID (for example "prior G3").

Path shorthand:

- `medley/` = `/Users/nathan/Developer/XolaceInc/sample apps/Medley-main/`: media discovery app. Expo `^57.0.0`, RN 0.86.2, Reanimated 4.5.1, expo-router ~57.0.2. **Same stack as Xolace**, so its code ports almost unchanged.
- `mora/` = `/Users/nathan/Developer/XolaceInc/sample apps/Mora-main/`: chat-first nutrition journal. Expo `58.0.0-preview.8`, RN 0.88.0-rc.2, Reanimated 4.7.0, keyboard-controller 1.22.4.
- `oddswell/` = `/Users/nathan/Developer/XolaceInc/sample apps/oddswell-main/`: AI sports analysis. Expo `^56.0.4`, RN 0.85.3, Reanimated 4.3.1, `@expo/ui ~56`.
- Unprefixed paths are Xolace (`package.json`: expo-router ~57.0.17, RN 0.86.3, Reanimated 4.5.1, keyboard-controller 1.21.9, heroui-native 1.0.8).

**Portability checks.** Every API below that comes from Mora (SDK 58) or oddswell (SDK 56) was checked against Xolace's `node_modules`:

| API | Status in Xolace |
|---|---|
| `KeyboardController.dismiss({ keepFocus })`, `setFocusTo`, `preload` | Present in keyboard-controller 1.21.9 (`node_modules/react-native-keyboard-controller/src/module.ts:29-60`). `KeyboardProvider` already preloads by default (`src/types/provider.ts:36-42`, `src/animated.tsx:84,202-205`). |
| `KeyboardStickyView` | Present (`lib/typescript/components/index.d.ts`). |
| `useAudioSampleListener` (expo-audio) | Present in 57.0.4 (`node_modules/expo-audio/build/ExpoAudio.d.ts:113`). Android needs `RECORD_AUDIO` (`:79`). |
| `File` and `Paths` (expo-file-system), `shareAsync` (expo-sharing) | Both are direct deps (`expo-file-system ~57.0.6`, `expo-sharing ~57.0.16`). `File` and `Paths` are exported from `build/index.d.ts:1-2`. |
| `Updates.setUpdateRequestHeadersOverride` | Present in expo-updates 57.0.19 (`build/Updates.d.ts:199`). |
| `react-native-enriched-markdown`, `@legendapp/list`, `expo-speech-recognition` | Already direct deps (1.0.2, 3.3.9, 56.0.1). |
| `accessibilityLiveRegion`, `AccessibilityInfo.announceForAccessibility`, `AppState` | RN core. |
| `@expo/ui` SwiftUI (oddswell tabs, cancel button, context menu) | **Not a direct dep** (see prior `ui-ideas-sdk57.md`). No idea below depends on it. |
| `react-native-nitro-haptics` (Mora), `react-native-sortables` and `@tanstack/react-query` (Medley) | **Not installed**. No idea below needs them. |

---

## 0. What Xolace already does better (don't regress)

| Area | Xolace today | The samples |
|---|---|---|
| Haptics | Pulsar presets and about 20 named semantic patterns (`src/lib/haptics/haptics.ts:17-134`, `haptics-patterns.ios.ts`) | Medley calls `expo-haptics` directly (`medley/components/ui/radial-menu.tsx:2`). Mora re-exports nitro haptics untouched (`mora/src/lib/haptics.ts:1`). oddswell has a thin `expo-haptics` wrapper (`oddswell/utils/haptics.ts:26-65`). |
| Waiting haptics | One `processingBreath` when processing starts (`src/features/reflect/components/states/processing-state.tsx:46-52`) | oddswell fires a **rigid** impact every 2 s for the whole wait (`oddswell/hooks/useLoadingHaptics.ts:4-18`). |
| Reduced motion | Tri-state in-app override (`src/lib/motion/use-effective-reduced-motion.ts`) | Medley reads only the OS flag (`medley/components/ui/aurora-background.tsx:365`). oddswell has an OS-only hook that one file uses (`oddswell/hooks/useReduceMotionEnabled.ts`, used only by `ChampionFlagGradientBackground.tsx:54`). Its loading pulse ignores motion settings entirely (`oddswell/components/sports/AnalysisLoadingView.tsx:61-80`). |
| Friendly errors | `extractErrorMessage` reads typed `ConvexError` data, which still reaches the client when production scrubs the message (`src/features/reflect/session-service.ts:127-157`). Free users who hit the rate limit get an upgrade door instead of a dead end (`error-state.tsx:42-44`). | oddswell sniffs error strings (`oddswell/utils/formatAnalysisError.ts:4-46`). See C1 for the one gap Xolace still has. |
| Uncertainty | `claimStrength` turns "Say more" into the recommended action with a "Recommended" tag (`mirror-action-row.tsx:51-113`). At the cap, the row collapses to "That's it". | oddswell grades the output with a traffic-light `ConfidenceBadge` (`oddswell/components/sports/combat/ConfidenceBadge.tsx:6-10`). Grading a mirror would read as grading the person. |
| Theme system | 11 theme families × light/dark. Every variant defines the same 60 variables (verified 2026-10-14 across `src/global.css` and `src/themes/**`). | Mora has two hex palettes in `mora/globals.css:11-68`. Medley picks colours with `theme.mode === "dark" ? "#1C1C1C" : "#FFFFFF"` ternaries (`medley/components/ui/radial-menu.tsx:56-60`). |
| Accessibility coverage | Labels, roles and states throughout (see prior §0) | Medley has `accessib*` props in 5 of its ~50 `components/ui` files. oddswell has them in 5 component files. Mora is the best of the three, at 17 files. |
| Tabs and mini player | `NativeTabs` with `minimizeBehavior="onScrollDown"` and a `BottomAccessory` mini player (`src/components/app-tabs.tsx:36-49`). Both shipped from prior G4 and S4. | Mora has a custom opacity pager with a JS top bar (`mora/src/components/app-pager-screen.tsx:44-133`). |
| Starter prompts | `src/features/starter-suggestions/` | Mora's empty-state suggestion cards do the same job (`mora/src/components/chat/empty-state-carousels.tsx:24-50`). There is nothing new to take. |
| Loop focus-gating | Begun in commit `6440d4c` (FluxPerch and GlowIcon pause while unfocused) | Medley pauses on background instead (`aurora-background.tsx:409-423`). See D2. |

---

## 1. Loading and AI-waiting states

### A1. Processing copy that follows the real pipeline, not a timer
- **What:** while a mirror is being written, show what the pipeline is actually doing. Mention memory only when memory was actually used.
- **Source:** Mora derives the waiting label from the live tool call: "Looking up {food}…" or "Checking your food log…", with "Mora is thinking…" as the fallback (`mora/src/components/chat/thinking-dropdown.tsx:18-23`). Voice mode does the same, and shows "Finishing up..." once the tool output is available (`mora/src/components/chat/voice-overlay.tsx:11-24`). The negative example is oddswell: its "Checking lineups, referee & fatigue" copy is a fixed list cycled on a 2.4 s interval (`oddswell/app/(tabs)/home/futbol/loading.tsx:8-15`, `oddswell/components/sports/AnalysisLoadingView.tsx:53-59`). It claims work that may not be happening.
- **Xolace today:** `src/features/reflect/components/states/processing-state.tsx:17-25` cycles five fixed phrases every 2.5 s ("Feeling into this...", "Sensing what's here..."). The pipeline has real, distinct phases. Moderation, classification and episodic recall run in parallel (`convex/ai/process.ts:117,143`). Then the safeguard runs (`:163`). Then Sonnet articulates (`:200`), which is the long step.
- **Why it matters here:** rule 12 says copy must be literally true. A user who later learns the phrases were random loses trust in the mirror too. A line like "Holding this next to what you've shared before…" that appears only when episodic recall found something is the most persuasive sign there is that the Fire remembers.
- **Where:** add an optional `processingStage` field to `sessions` (`"reading" | "writing"`) and an optional `recalledCount`. Adding optional fields is safe under the Store-Gap Rule. Patch them once, just before the articulator call in `convex/ai/process.ts`. Read them in `ProcessingState` through the existing session subscription (`src/features/reflect/hooks/use-session.ts`). Count only matches at or above `EPISODIC_CONNECT_FLOOR` (`convex/ai/process.ts`).
- **Effort:** M. One extra mutation per reflection and no new model call, so it complies with the Understanding rule.
- **Sketch:**
  ```tsx
  // processing-state.tsx: the phrase is chosen, not cycled
  const line =
    stage === "writing"
      ? recalledCount > 0
        ? "Holding this next to what you've shared before…"
        : "Finding the words…"
      : "Taking this in…";
  <Animated.View style={animatedStyle} accessibilityLiveRegion="polite">
    <AppText className="text-sm text-foreground/40">{line}</AppText>
  </Animated.View>
  ```
- **Gotcha:** keep the fade between lines. Fire `playProcessingBreath` once, not once per stage.

### A2. On failure, keep the person's words on screen
- **What:** the error screen shows the person's own words, faded, above the retry. A failure should never feel like the writing vanished.
- **Source:** Mora overlays the error card on top of the intact conversation (`mora/src/screens/chat-screen.tsx:246-272`). Its copy is "Mora could not finish this reply. Your conversation is saved." (`:259`).
- **Xolace today:** `ErrorState` replaces the screen with "Take a breath." plus a message (`src/features/reflect/components/states/error-state.tsx:51-64`). `entryText` survives `SUBMIT` and `SESSION_ERROR` in the reducer (`src/features/reflect/hooks/reflection-reducer.ts:82-83,106-107`), so the text is in memory. `retrySession` reprocesses `session.rawInput` (CLAUDE.md, Pending Deprecations), so "your words are kept" is literally true whenever a session exists.
- **Why:** the worst moment in a reflection app is pressing "Let it out" and watching the words disappear behind an error.
- **Effort:** S. Pass `entryText` into `ErrorState` and render it like the previous mirror is rendered in `clarify-state.tsx:94` (`text-foreground/30`, `max-h-[160]`). Hide it when `entryText` is empty, for example on a cold resume after the app restarts.
- **Copy:** use "Your words are still here." only when `sessionId != null`. Do not copy Mora's "saved" wording (rule 12).

---

## 2. Input, composer and refinement

### B1. "Say more" asks the mirror's own question
- **What:** if the mirror ended on a question, the clarify screen uses that question as its heading instead of the generic "Say more". The composer placeholder points at the question.
- **Source:** Mora's `ClarificationCard` shows the model's question and context as the header above the answer field (`mora/src/components/chat/clarification-card.tsx:60-64`). It docks the card above the composer and changes the placeholder to "Answer the question above…" (`mora/src/components/chat/animated-input.tsx:178`, `mora/src/screens/chat-screen.tsx:281-293`).
- **Xolace today:** `src/features/reflect/components/states/clarify-state.tsx:105-107` shows the heading "Say more" and the placeholder "Add what's missing...". The question itself sits above, faded to 30%, in a 160 pt scroll box (`:89-97`). The component's own comment says "the reach closes on a question" (`:18-22`).
- **Why:** answering a question is easier than "adding more". The person can see the Fire asked them something specific, and continuing feels like a conversation, not a form.
- **Effort:** S. This is client-only string work.
- **Sketch:**
  ```ts
  // src/features/reflect/closing-question.ts
  export function closingQuestion(mirror: string): string | null {
    const sentences = mirror.trim().split(/(?<=[.!?])\s+/);
    const last = sentences.at(-1) ?? "";
    return last.endsWith("?") && last.length <= 140 ? last : null;
  }
  ```
  In `ClarifyState`, render `isSayMore && q ? q : 'Say more'` and set the placeholder to `"Answer in your own words…"`.

### B2. Show the chosen miss-reason before the sheet closes, and let it shape the prompt
- **What:** when someone taps a "What didn't land?" chip, the chip shows as selected and the others dim for about 250 ms before the sheet closes. The chip they picked then sets the clarify placeholder.
- **Source:** Mora starts the exit animation at once, delays submit by 300 ms so the selection is seen, and dims unchosen chips to 0.4 (`mora/src/components/chat/clarification-card.tsx:34-45,81-91`).
- **Xolace today:** `src/features/reflect/components/states/clarify-feedback-sheet.tsx:37-49` closes on the tap itself, and passes `selected={null}` (`:58`), so the tap never visibly registers. The four chips are recorded only as telemetry (`api.feedback.submit`).
- **Why:** an acknowledged tap tells the person they were heard. Feeding the chip into the prompt then makes the correction feel guided. For example, "Wrong emotion" leads to "What's the feeling, closer to?" and "Missed the main thing" leads to "What's the main thing?"
- **Effort:** S. Hold `selected` in local state, call `onClose` after `setTimeout(…, 250)`, and lift the chip key into the reflect reducer (a new optional `missReason` field on `NOT_QUITE`).

### B3. Keep focus across the morph card's collapse and expand
- **What:** when the compose card collapses, hide the keyboard but keep the input focused. Re-raise it with `setFocusTo("current")`.
- **Source:** `medley/components/ui/review-input.tsx:259-292`. The comment explains that `dismiss()` blurs asynchronously, so its blur can land *after* the next `focus()`. The result is that the keyboard flashes up and straight back down.
- **Xolace today:** `src/features/reflect/compose/use-morph.ts:76-81` calls `inputRef.current?.focus()` on expand and `Keyboard.dismiss()` on collapse. That is the race Medley documents.
- **Effort:** S, if you can reproduce it (collapse then re-expand quickly). Skip it if you can't.
- **Sketch:**
  ```ts
  import { KeyboardController } from "react-native-keyboard-controller";
  if (expanded) {
    if (focusOnExpand) hasFocused.current ? KeyboardController.setFocusTo("current") : inputRef.current?.focus();
  } else if (!first) {
    onCollapse();
    KeyboardController.dismiss({ keepFocus: true });
  }
  ```
- **Not needed:** Medley's explicit `KeyboardController.preload()` (`review-input.tsx:253-257`). Xolace's `KeyboardProvider` already preloads by default.

### B4. Unsent reflection drafts survive an app kill
- **What:** persist the in-progress `entryText` on the device with a short expiry. Clear it on submit or discard.
- **Source:** Mora persists its draft and its processed-tool ids together, "so a restart cannot replay an already confirmed tool" (`mora/src/features/chat/draft-store.ts:13-33`). Chat history is persisted too (`mora/src/lib/storage.ts:98-105`).
- **Xolace today:** `src/store/store.ts:315-345` persists about 30 flags and no draft text. Prior G1 lists this as a *prerequisite* for the app lock. It is also a UX fix on its own: if iOS evicts the app mid-paragraph, the person's words are gone.
- **Why:** people write the hardest sentences slowly, often across interruptions.
- **Effort:** S/M. Store `{ text, textures, savedAt }` under its own kv key through `src/lib/storage/unified-storage.ts`. Restore it if it is less than 24 h old, and clear it on `SUBMIT` and `DISCARD_DRAFT`.
- **Gotchas:**
  - Never apply this to Vent, which is never stored (foundation privacy standard).
  - Pair it with prior G1 phase 1 (app-switcher cover), because the draft now lives on disk.
  - Debounce writes to every 1–2 s, not every keystroke.

---

## 3. Errors and honesty

### C1. A content-policy rejection shows a raw code and a retry that cannot succeed (bug)
- **What:** map server error codes to human copy, with a `retryable` flag, at the client boundary.
- **Source:** oddswell's `formatAnalysisErrorMessage` exists so the user "never" sees raw JSON (`oddswell/utils/formatAnalysisError.ts:3-46`). Medley's `AppError` carries `retryable` and `code` (`medley/lib/app-error.ts:1-21`).
- **Xolace today:**
  1. `convex/ai/process.ts:172-176` and `convex/ai/clarify.ts:228` write `errorMessage: "content_policy_violation"` when the safeguard rejects input. The only reason `checkRejection` produces is that literal (`convex/ai/safeguard.ts:255-285`).
  2. `src/features/reflect/hooks/use-reflection-machine.ts:162-163` dispatches the message unchanged.
  3. `src/features/reflect/components/states/error-state.tsx:56-58` renders it under "Take a breath.", so the person reads **"content_policy_violation"**.
  4. "Try again" is the primary action (`:91-106`). Retrying reprocesses the same `rawInput`, so it fails the same way.
- **Why it matters here:** this path is hit by people describing violence, harassment or abuse whenever survivor-narrative detection misses (`safeguard.ts:261-284`). A machine code plus a futile retry is the worst possible response at that moment.
- **Effort:** S. This is client-only and backward compatible. The server keeps writing the code, so old binaries are unaffected.
- **Sketch:**
  ```ts
  // src/features/reflect/reflect-error-copy.ts
  type ReflectError = { copy: string; retryable: boolean; offerSupport: boolean };
  const BY_CODE: Record<string, ReflectError> = {
    content_policy_violation: {
      copy: "This is something I can't reflect back here. If it's weighing on you, talking to someone can help.",
      retryable: false,
      offerSupport: true,
    },
  };
  export const toReflectError = (msg: string): ReflectError =>
    BY_CODE[msg] ?? { copy: msg, retryable: true, offerSupport: false };
  ```
  In `ErrorState`, hide "Try again" when `!retryable`, make "Start fresh" primary, and show a link to `/(protected)/crisis-resources` when `offerSupport` is true.
- **Gotcha:** have someone who owns safety review the copy. Don't name categories, and don't imply the person did something wrong.

### C2. Strip em dashes at one boundary, not at eight render sites
- **What:** apply em-dash normalisation in one shared `MirrorText` component (or at the write boundary), not ad hoc at each render site.
- **Source:** oddswell runs `stripEmDashesDeep` over the whole model output once, at the API boundary (`oddswell/utils/copySanitize.ts:20-36`, `oddswell/app/api/analysis/mma+api.ts:183,279`).
- **Xolace today:** `removeEmDash` is called at 8 render sites (for example `mirror-state.tsx:158` and `timeline-entry-card.tsx:78`). `clarify-state.tsx:95` already misses it: the previous mirror renders `{previousMirror}` unchanged. This is how drift starts.
- **Effort:** S. Add `src/features/reflect/components/mirror-text.tsx` (AppText + `removeEmDash` + `selectable`) and swap the call sites over to it. Don't rewrite stored mirrors, because TTS and memory read them.

---

## 4. Accessibility

### D1. Announce the mirror's arrival, and make processing a live region
- **Source:** Mora's waiting row is `accessibilityLiveRegion="polite"` (`mora/src/components/chat/thinking-dropdown.tsx:26`). Its success notices use the same pattern (`mora/src/screens/home-screen.tsx:318`).
- **Xolace today:** there are 9 live-region uses in total and none in the reflect states. When the mirror arrives, a sighted user gets a fade-in and a sighted haptic user gets `playMirrorArrival` (`mirror-state.tsx:80-82`). A VoiceOver user gets neither, and focus stays where it was.
- **Why:** the moment of being reflected back is the product. It should not be silent for blind users.
- **Effort:** S.
  ```ts
  useEffect(() => {
    playMirrorArrival();
    AccessibilityInfo.announceForAccessibility("Your mirror is ready.");
  }, []);
  ```
  Also add `accessibilityLiveRegion="polite"` to the processing line (A1 sketch). Android honours it, and iOS needs the announce.

### D2. The processing orb ignores the in-app "reduce motion" setting
- **Source:** Medley's aurora holds a representative still frame under Reduce Motion, never an empty one, and stops its loop when the app backgrounds (`medley/components/ui/aurora-background.tsx:396-423`). Xolace's `ThinkingOrb` already does the still-frame half well (`src/components/ui/thinking-orb.tsx:186-201`).
- **Xolace today:** 17 files import Reanimated's OS-only `useReducedMotion` instead of `useEffectiveReducedMotion` (25 files). They include the processing orb (`thinking-orb.tsx:159`), `breathing-orb.tsx`, `mic-button.tsx`, `streak-calendar.tsx`, `heatmap-chart/root.tsx` and 10 auth-onboarding beats. Someone who picked "Reduced" in Settings still gets the full orb while they wait. Separately, only 2 of the 22 files with `withRepeat` gate their loop on focus (commit `6440d4c`).
- **Effort:** S. This is a mechanical swap. Also add one hook so each loop has a single gate:
  ```ts
  // src/lib/motion/use-loop-active.ts
  export function useLoopActive() {
    const focused = useIsFocused();
    const reduced = useEffectiveReducedMotion();
    return focused && !reduced;
  }
  ```
  Feed it to `ThinkingOrb`'s `paused` prop, and to every `withRepeat(-1)` that lives on a screen which stays mounted underneath a pushed screen.
- **Cross-ref:** prior G5 covers the motion tokens. This item is the audit of where the preference is ignored.

### D3. The flame selector becomes one adjustable control, with step haptics while dragging
- **Source:** Medley's star rating fires a selection haptic only when the rounded value *changes* during a pan (`medley/components/ui/star-rating.tsx:209-219`). Taps toggle between a half star and a full star (`:188-206`).
- **Xolace today:** `src/features/session-end/components/flame-intensity-selector.tsx:84-120` drags without any haptic. Only a tap plays `Presets.plunk()` (`:126`). VoiceOver meets five separate buttons (`:185-188`) instead of one slider.
- **Why:** rating intensity is a body-check. A soft tick on each flame you pass makes the scale *felt*, which helps when the person is looking inward rather than at the screen.
- **Effort:** S.
  ```ts
  const last = useSharedValue(0);
  // in onUpdate:
  if (rating !== last.get()) {
    last.set(rating);
    scheduleOnRN(playTextureSelect);
  }
  // container:
  accessibilityRole="adjustable"
  accessibilityValue={{ min: 1, max: 5, now: value }}
  accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
  ```
- **Cross-ref:** prior N5 (one haptic per pan) and N6 (chart scrub haptics) cover different surfaces.

---

## 5. Motion and micro-interactions

### E1. Long mirrors need a cue that there is more below
- **Source:** Medley masks truncated text with a gradient fade, so the cut is visible (`medley/components/ui/truncated-text.tsx:99-117`). Xolace already uses HeroUI's `ScrollShadow`, which does this automatically, in `src/features/library/home/hub-carousel.tsx:53`.
- **Xolace today:**
  - The mirror scrolls inside `maxHeight: "60%"` with `showsVerticalScrollIndicator={false}` (`src/features/reflect/components/states/mirror-state.tsx:149-160,181`). A long mirror cut at a line break looks finished, so the person may confirm a mirror they haven't fully read.
  - The previous mirror in clarify has the same problem (`clarify-state.tsx:89-97`).
- **Effort:** S.
  ```tsx
  <ScrollShadow LinearGradientComponent={LinearGradient} size={32}>
    <ScrollView style={styles.mirrorScroll} showsVerticalScrollIndicator={false} …>
  ```
- **Gotcha:** the shadow colour must come from `--background`, which is how `ScrollShadow` themes it. Check it on the light variants.

### E2. The mirror's left rule breathes with its read-aloud voice (iOS)
- **What:** while mirror audio plays, the accent rule beside the mirror (`border-l-2 border-accent/40`) pulses its opacity with the voice's loudness.
- **Source:** Mora's orb computes RMS from an analyser, smooths it as `prev * 0.7 + rms * 0.3`, and decays to rest when speech stops (`mora/src/components/chat/audio-gradient-orb.tsx:47-80`).
- **Xolace today:** the speaker icon toggles between two glyphs (`mirror-state.tsx:128-144`), and nothing on the text shows the voice is speaking it.
- **Effort:** M. Use `useAudioSampleListener(player, …)` (expo-audio 57) to write a shared value, and drive opacity with `.get()` in `useAnimatedStyle`.
- **Gotchas:**
  - On Android, sampling requires `RECORD_AUDIO` (`ExpoAudio.d.ts:79`). Asking for mic permission so the app can *play* audio is wrong, so ship this iOS-only.
  - Turn it off under `useEffectiveReducedMotion`.
  - `useMirrorAudio` only creates the player on the first tap (`use-mirror-audio.ts:27-31`). Attach the listener after that.

---

## 6. Lists, cards and profile

### H1. "What this mirror drew on": show the memories behind it
- **What:** under the mirror, or on session detail, add a quiet line: "Drew on 2 earlier reflections · Sep 30, Oct 2". Each date opens that timeline entry.
- **Source:** oddswell gives every result a "how we got here" methodology section (`oddswell/components/sports/mma/HowWeGotHereSection.tsx:10-30`). Mora labels estimated values as "· estimate" instead of passing them off as fact (`mora/src/components/chat/food-confirmation-card.tsx:57-60`). Both make the AI's sources visible.
- **Xolace today:** `emotional_metadata.episodicMatchKeys` already stores the session ids of the memories that informed each mirror (`convex/schema.ts:909-912`). No screen shows them, so "a journal that remembers you" is invisible at the one moment it happens.
- **Why:** an AI that remembers you and *shows* where is trustworthy. One that remembers silently is unsettling. This also gives a natural path back into the timeline, which helps Hearth retention.
- **Where:** add a public query in `convex/understanding/` (or beside `getUnderstanding`) that returns `{ sessionId, createdAt }[]` for matches owned by the caller. Render it in `src/features/reflect/components/states/mirror-state.tsx` and `src/features/timeline/components/screens/SessionDetailsScreen.tsx`.
- **Effort:** M.
- **Gotchas:**
  - Read through `internal.understanding.getUnderstanding`, as the Cognition Layer rule requires.
  - Show only matches at or above `EPISODIC_CONNECT_FLOOR`. A sub-floor match did not shape the mirror, and claiming it did breaks rule 12.
  - Hide the line when `personalMemoryEnabled === false`.
  - Never show another person's data. The keys are the user's own sessions, but enforce ownership in the query anyway.

### H2. Let people hide the numbers on their profile
- **What:** add show/hide toggles for the profile's stat cards, especially the percentile rank.
- **Source:** Medley's profile is a registry of blocks, each with `defaultEnabled` (`medley/lib/profile-blocks/registry.ts:14-55`). A customise screen toggles and reorders them (`medley/app/(protected)/profile/customize.tsx:41,69-92`).
- **Xolace today:** `src/features/profile/components/screens/ProfileScreen.tsx` always renders `ContributionGraphCard`, `RankCard` (a percentile "counted against everyone who has reflected", `rank-card.tsx:9-10`) and `WeekIntensityCard` (`:124-191`). The team already worries that this could read as a race: the comment at `ember-field.tsx:46-47` says a moving dot "would read as a progress bar, i.e. as a race against the other fires".
- **Why:** on a heavy week, a percentile or an intensity chart can sting. Rule 9 says streaks and session counts are not goals in themselves. Letting the person turn the numbers off is cheap and respectful.
- **Effort:** S/M. Add toggles only, no reorder (which avoids adding `react-native-sortables`). Persist a `hiddenProfileCards: string[]` in the zustand `partialize` list and put the rows in Settings → Appearance.

### H3. Export my reflections
- **Source:** Mora's Settings has an "Export my data" row (`mora/src/screens/settings-screen.tsx:81-102,124`). It writes a cache file and opens the share sheet in 5 lines (`mora/src/lib/export-journal.ts:3-7`). It also states plainly where data lives: "Your logs are stored on this device…" (`:261`).
- **Xolace today:** `src/features/settings/components/screens/DataScreen.tsx` has Sharing, Memory, Retention and "Delete all my data", but no export.
- **Why:** "you can delete everything" is half of data ownership; taking your words with you is the other half. People who journal for months want their record, for example to show a therapist. That matches Xolace's goal of getting people to outside care sooner.
- **Effort:** M. Add a query that returns the caller's sessions (`rawInput`, mirrors, dates) and render them as JSON or Markdown. `expo-file-system` `File`/`Paths` and `expo-sharing` are already installed.
- **Gotchas:**
  - Delete the cache file after `shareAsync` resolves.
  - Rate-limit the query.
  - The copy must not imply the export includes things it doesn't, such as Vent, which is not stored, or the Clerk/PostHog residue listed in the known gaps.

---

## 7. Audio, voice and privacy

### I1. Pause the mirror's voice when the app leaves the foreground
- **Source:** Mora ends voice mode on any `AppState` change away from `active` (`mora/src/features/chat/use-mora-chat.ts:511-516`). It also offers "Tap to interrupt" and a mute control while speaking (`mora/src/components/chat/voice-overlay.tsx:163-240`).
- **Xolace today:** the single audio session is `shouldPlayInBackground: true`, `playsInSilentMode: true` (`src/lib/audio/session.ts:8-12`). `useMirrorAudio` claims that same session (`src/features/reflect/hooks/use-mirror-audio.ts:45-48`). So a mirror (the person's feelings, spoken aloud) keeps playing after they lock the phone or switch apps.
- **Why:** that is right for Vessa audio and wrong for a mirror. "Discreet by default" (rule 8) should cover the speaker too.
- **Effort:** S.
  ```ts
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active" && status.playing) player.pause();
    });
    return () => sub.remove();
  }, [player, status.playing]);
  ```
- **Gotcha:** the file has a comment about a pause/release race on unmount (`mirror-state.tsx:77-79`). This is a pause on an app-state change, not on unmount, so the race does not apply. Test it on the timeline detail screen, which also uses `useMirrorAudio`.

---

## 8. Theming and process

### G1. A `theme:check` script that guards the five places a theme must be registered
- **Source:** Mora's `bun run theme:check` regenerates its palette from `globals.css` and throws if the output drifted (`mora/scripts/generate-theme.ts:20-22`, `mora/package.json` scripts). Copy only the `--check` half. Xolace reads tokens at runtime through `useThemeColor`, so it doesn't need a generated TypeScript palette.
- **Xolace today:**
  - CLAUDE.md says adding a theme takes five manual steps: the CSS file, the `global.css` import, `metro.config.js` `extraThemes`, the `ThemeName` union, and the `toggleTheme` case.
  - Variable parity holds today (all 22 variants have 60 vars).
  - `src/themes/alpha.css` is **orphaned**. It defines `alpha-light` and `alpha-dark` (`:3,103`), but `src/global.css:23-36` never imports it, `metro.config.js:44-64` doesn't list it, and the union in `src/context/app-theme-context.tsx:14-35` omits it. CLAUDE.md still lists `alpha` as a theme.
  - Separately, `features/` and `components/` contain 66 hex literals across 28 files, for example `vent-mic-button.tsx` (4) and `onboarding/moods.ts` (8). The Fixed-palettes rule says even fixed palettes "land as tokens".
- **Effort:** S. Make it a script, not a unit test (CLAUDE.md: no post-hoc unit tests). Run it from `bun run theme:check` and in CI.
- **Sketch:**
  ```ts
  // scripts/theme-check.ts (run: node scripts/theme-check.ts)
  // 1. every `@variant X {}` across src/global.css + src/themes/**: same --var set
  // 2. every src/themes/**/*.css is @imported by src/global.css
  // 3. every non-base variant appears in metro.config.js extraThemes and the ThemeName union
  // 4. no '#rrggbb' in src/features|components outside an allowlist (brand icons, *palette* modules)
  // exit 1 with a list of offenders
  ```

### G2. "Channel surfing": try a PR's UI on a phone without rebuilding
- **Source:**
  - `medley/hooks/use-update-channel.ts:19-53` sets `Updates.setUpdateRequestHeadersOverride({ "expo-channel-name": branch })`, fetches the update and reloads. When nothing compatible exists, it restores the previous override and explains that the PR may have changed native code.
  - A hidden route reached by a deep link posted on each PR: `medley/app/(protected)/channel-surf.tsx:20-21`.
  - A persistent "Previewing … tap to return" pill: `medley/components/ui/channel-override-banner.tsx:10-36`.
- **Why for Xolace:** most of these ideas are visual. Judging feel, motion and haptics needs a real device, and a PR's JS-only change can be checked on the preview build in seconds. This becomes more useful once the E2E suite (CLAUDE.md, not set up yet) starts producing artifacts.
- **Where:** gate it on `APP_VARIANT === "preview"` plus an env flag. Put the route at `src/app/(protected)/settings/` (hidden), the hook at `src/features/settings/`, and mount the banner in `src/app/_layout.tsx`.
- **Effort:** S/M.

---

## 9. Outside the box

These are deliberately unconstrained. Some question choices Xolace has already made. Each one still has to pass the rule-1 feature test.

1. **Drop the anthropomorphic waiting phrases even if A1 never ships.** "Feeling into this…" and "Sensing what's here…" (`processing-state.tsx:17-23`) say the Fire *feels*. The foundation calls the Fire "not a character" and says "it illuminates, it isn't who you came to meet". A single still line ("Taking this in…") under the orb is more honest than five rotating guesses, and calmer too. oddswell's rotating copy is the cautionary version: it reads as theatre once you notice it loops.

2. **Correct the mirror next to the mirror, not under a sheet.** "Not quite" opens a blurred bottom sheet that covers the very text being corrected (`clarify-feedback-sheet.tsx:54-60` → `FeedbackSheet.Frame` with `BottomSheetBlurOverlay`). Medley's status button grows in place, with a layout transition, to reveal its options (`medley/components/ui/status-button.tsx:140-205`). Expanding the four miss-reasons inline beneath the action row would keep the mirror readable while the person explains what missed. B2 is the cheaper half of this.

3. **"I'll remember this", with a veto.** Mora never writes what the AI proposed until the user taps "Save to journal" or "Dismiss". The resolution then feeds back into the conversation (`mora/src/features/chat/tracking-confirmation-card.tsx:28-54`). Xolace's memory is written silently: the Reflection Agent is the sole writer of `semantic_profiles`. After "That's it", a one-line "I'll keep: *you've been carrying the move alone*. [Don't keep this]" would make memory consensual, not ambient. **Constraints:** the line must come from stored Understanding, not a new model call (rule 6). It touches open questions (persona and companion features), so ask before building. L.

4. **Talk it through, and get a mirror back.** Mora's voice mode is a full-screen state with connecting, listening, processing and speaking phases, plus mute and "Tap to interrupt" (`mora/src/components/chat/voice-overlay.tsx:92-241`). Xolace has dictation (`src/features/reflect/compose/dictation-strip.tsx`) and Vent (never stored, never mirrored). A spoken reflection that still produces a mirror would be a new input modality, which the Understanding rule explicitly allows a model call for. For people who cry more easily than they type, this could be the main door in. L.

5. **"Look at this again" from the timeline.** oddswell lets you "Run again" on any saved analysis from a context menu (`oddswell/components/sports/savedAnalysisContextMenu/SavedAnalysisContextMenuIOS.tsx:20-27`). The Xolace version: long-press a timeline entry, choose "Reflect on this again", and start a new session that shows the old mirror faded above the composer ("Last time"). Repeated reflection on the same weight is exactly the "catching what's compounding" signal steadiness (Building) needs. It needs the prior-G3 `Link.Menu` first.

6. **Question the percentile itself, not only its visibility (H2).** Ranking people's reflection habit "against everyone" is a social comparison inside a mental-health app. The copy already has to defend it (`rank-card.tsx:6-10`). If no metric shows the rank changes return behaviour, deleting it is the lazy and kind answer.

7. **Should reflection sit *inside* the tab bar?** Mora makes the chat the default, centre page of its three-page pager (`mora/src/components/app-pager-screen.tsx:23-24,44-63`). In Xolace, reflect is the `/` landing outside the tabs. Getting there from a tab means the idle menu or a `router.replace('/')` (`src/features/idle-menu/menu-buttons.tsx:41-47`, `src/features/discovery/components/reflect-dock.tsx:44`). Keeping reflection outside the tabs protects focus. The cost is that the Fire is never one stable tap away. It's worth an analytics look at how often a reflection starts from inside a tab.

---

## 10. Ranked shortlist

| # | Idea | Effort | Why first |
|---|---|---|---|
| 1 | **C1** Map `content_policy_violation` and hide a retry that can't succeed | S | A live bug that shows a machine code to someone who may be describing abuse |
| 2 | **D2** Effective reduced motion for the orb and loops, plus `useLoopActive` | S | The Settings preference is ignored on the screen people stare at while they wait |
| 3 | **I1** Pause mirror audio when the app backgrounds | S | Privacy: feelings spoken aloud from a locked phone |
| 4 | **D1** Announce the mirror's arrival; live region on processing | S | The core moment is silent for VoiceOver users |
| 5 | **E1** `ScrollShadow` on the mirror and the previous mirror | S | People confirm mirrors they haven't fully read |
| 6 | **B1** + **B2** "Say more" uses the mirror's own question; miss chips register and seed the prompt | S | Refinement is where mirrors get good. Both are client-only |
| 7 | **A1** + **A2** Pipeline-true processing copy; keep the person's words on failure | M / S | Trust through literal truth (rule 12), and no vanished writing |
| 8 | **H1** "What this mirror drew on" | M | Makes memory visible and trusted, and opens a path back into the timeline |
| — | Then: **B4** draft persistence (pair with prior G1), **G1** theme check, **C2**, **D3**, **H2**, **H3**, **G2**, **E2**, **B3** | | |

## 11. Don't copy

| Sample code | Why not |
|---|---|
| Medley radial long-press menu (`medley/components/ui/radial-menu.tsx`, `hooks/use-radial-overlay.tsx`) | It has no accessibility props at all, and colours are hex ternaries (`radial-menu.tsx:56-60`). Native `Link.Menu` (prior G3) does the job with VoiceOver for free. |
| Medley custom toast (`medley/components/ui/toast.tsx`) | Bottom offsets are hard-coded to `100`/`112` per route segment (`:71-75`), it logs to the console in `__DEV__` on every render (`:59-68`), and it has a fixed 4 s dwell. HeroUI's toast already handles this. |
| Medley custom sheet (`medley/components/ui/sheet.tsx`, 371 lines) | Xolace has gorhom for custom backdrops and native `formSheet` for everything else (prior S1). |
| Medley aurora shader (`medley/components/ui/aurora-background.tsx`, 520 lines) | Its constants were fitted to another product's screen recording (`:42-57`). Take its lifecycle rules (D2), not its look. Xolace's campfire has its own visual language. |
| oddswell periodic loading haptics (`oddswell/hooks/useLoadingHaptics.ts:4-18`) | A rigid tap every 2 s is a nag. It is the opposite of `processingBreath`. |
| oddswell pulsing loading text (`AnalysisLoadingView.tsx:61-80`) | It runs forever and ignores reduced motion. |
| oddswell `ConfidenceBadge` (`components/sports/combat/ConfidenceBadge.tsx:6-10`) | Traffic-light dots in hex. On a mirror, "low confidence" grades the person's feelings. Xolace's `claimStrength` → "Recommended: Say more" is the right translation. |
| oddswell i18n scaffold (`oddswell/i18n/i18next.ts`, a 34-line `en.ts`) | Barely used, even there. Target market is an open question in the foundation, so don't add i18next until it's decided. Keep copy in the existing `*-copy.ts` modules. |
| oddswell `@expo/ui` tabs and cancel button (`components/sports/futbol/Tabs.tsx`, `AnalysisLoadingCancelButton.ios.tsx`) | `@expo/ui` is not a direct dep (prior `ui-ideas-sdk57.md`), and the cancel button hard-codes `#FF3B30` (`:6`). |
| Mora generated TypeScript palette (`mora/src/theme/colors.ts`) | It duplicates the CSS source of truth. `useThemeColor` already reads tokens at runtime. Take only the `--check` idea (G1). |
| Mora `MessageBubble` (`mora/src/components/chat/message-bubble.tsx:47-58`) | Uses RN `Image` and hard-coded `text-white`. That breaks two Xolace conventions, and the mirror isn't a chat bubble anyway. |
| Medley explicit `KeyboardController.preload()` (`review-input.tsx:253-257`) | Redundant. `KeyboardProvider` preloads by default in 1.21.9. |
| Mora's top-bar opacity pager (`mora/src/components/app-pager-screen.tsx`) | Every page stays mounted and only its opacity is swapped. `NativeTabs` is more native, and §0 explains why. Outside-box #7 asks the IA question without this implementation. |
