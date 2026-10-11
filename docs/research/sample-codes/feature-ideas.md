# Feature ideas from the sample apps (amber, clarity, oyelo)

Research date: 2026-10-09. Sources: `src/components/extras/sample-codes/{amber-main,clarity-main,oyelo-main}`.
Short path prefixes used below: `amber/` = `src/components/extras/sample-codes/amber-main/`,
`clarity/` = `.../clarity-main/`, `oyelo/` = `.../oyelo-main/`.

Checked against Xolace's rules in `docs/foundation/xolace-for-agents.md`. Every idea below is
**Planned** (not built). Xolace runs Expo SDK 57 (`package.json`: `expo-router ~57.0.17`). Amber runs
SDK 58 (`amber/package.json`: `expo-widgets ~58.0.9`, `expo-app-intents ~0.4.7`). That version gap
matters for the native-surface ideas.

---

## 1. Inventory: what each sample app has

### amber-main: AI "save it for later" (Expo SDK 58 + Convex + Clerk)

| Feature | Where |
|---|---|
| Capture links, photos, notes. An LLM writes the title, description and tags, then files the item into "spaces" | `amber/README.md`, `amber/convex/ai.ts:813` (`processItem`) |
| Spaces with retroactive backfill and AI *suggested* membership. The AI can only write `suggested` rows. `saved`/`dismissed` belong to the user | `amber/convex/schema.ts:92-131`, `amber/convex/spaces.ts:351-389` (accept/dismiss/acceptAll) |
| AI-proposed action chips from a **closed** set (open_url, copy, web_search, maps, call, email, message, add_event) | `amber/src/lib/intents.ts:8-67`, `amber/convex/items.ts:33-50` |
| Full-text search over your saves | `amber/convex/schema.ts:78` (`searchIndex`), `amber/convex/items.ts:185` |
| "Similar items" by tag/token overlap, no model call | `amber/convex/items.ts:220-260` |
| Share extension into the app (images ≤10, 1 URL, text) through `expo-sharing`. A durable intake survives the biometric lock | `amber/app.json:90-98`, `amber/src/lib/share-intake.tsx:14-21`, `amber/src/app/+native-intent.ts` |
| Biometric app lock + app-switcher blur/FLAG_SECURE, per account, fail-closed, with a recovery flow | `amber/docs/biometric-app-lock.md`, `amber/src/lib/app-lock.tsx`, `amber/src/lib/app-lock-controller.ts:21,119-165`, `amber/src/components/privacy-screen.tsx` |
| Home-screen widget "Recent Saves" (iOS SwiftUI via `@expo/ui` + Android) with expo-widgets. The palette travels with the snapshot. The widget is cleared when the lock is on | `amber/app.config.ts:88-113`, `amber/src/widgets/recent-saves-widget.tsx`, `amber/src/widgets/recent-saves-widget.android.tsx`, `amber/src/lib/widget-sync.tsx`, `amber/plugins/with-android-widget.js` |
| Siri / Shortcuts / Spotlight / Visual Intelligence via App Intents (expo-app-intents + Swift). Capture works without opening the app through a per-device hashed capture token | `amber/app-intents/AmberShortcuts.swift`, `amber/app-intents/AppIntentsSetup.swift`, `amber/app-intents/Intents/CaptureIntents.swift`, `amber/app-intents/Intents/NavigationIntents.swift`, `amber/convex/appIntents.ts:32-75`, `amber/convex/http.ts:129-149`, `amber/convex/schema.ts:133-143` |
| Spotlight indexing with deadlines. Cleared on sign-out or lock | `amber/app-intents/Support/AmberSpotlight.swift` |
| "Tidy": Tinder-style swipe deck over the photo library (keep/delete/save) with momentum projection, undo and haptics | `amber/src/lib/tidy/swipe-decision.ts`, `amber/src/components/tidy/*`, `amber/src/app/(app)/(tabs)/(tidy)/index.tsx` |
| Subject-lift stickers (iOS Vision) and a progressive-blur native module | `amber/modules/subject-lift/ios/SubjectLiftModule.swift`, `amber/modules/progressive-blur/` |
| Offline-first feed (TanStack Query persisted to MMKV) with a per-query persist policy | `amber/src/lib/query-client.ts`, `amber/src/lib/query-cache-policy.ts` |
| Manual EAS Update check row in settings | `amber/src/components/update-setting.tsx` |
| Onboarding permission pages as a pure module (limited Photos counts as success) | `amber/src/lib/onboarding-permissions.ts`, `amber/src/components/onboarding/permission-device.tsx` |
| Breathing-wordmark splash that hands off across lock → data → onboarding | `amber/src/lib/splash.tsx:30-40` |
| AI-driven E2E (`@e2e-dev/mobile`) on hosted EAS Simulators, plus a PR "explore" goal built from the PR title, body and changed files | `amber/e2e.config.ts`, `amber/e2e/amber.e2e.ts`, `amber/e2e/ci/explore-goal.mjs` |

### clarity-main: speech practice (Expo SDK 57 + Convex + Clerk + RevenueCat)

| Feature | Where |
|---|---|
| Guided/freestyle speaking practice with a live teleprompter, waveform and WPM | `clarity/README.md`, `clarity/components/session/teleprompter.tsx`, `live-waveform.tsx`, `live-wpm.tsx` |
| On-device transcription (`expo-speech-recognition`) + incremental aligner | `clarity/services/live-recognition.ts`, `clarity/services/alignment.ts` |
| Scores and skill breakdown; optional Azure pronunciation assessment | `clarity/services/scoring.ts`, `clarity/services/azure-assessment.ts` |
| Streaming AI coaching (partial objects, abort + timeout, retry, cached reads) | `clarity/hooks/use-ai-coaching.ts`, `clarity/app/api/speech-coach+api.ts`, `clarity/server/forward-premium.ts` |
| Crash-recoverable session checkpoint: one key overwritten every 5 s. A stale one becomes an `interrupted` record on next launch. Backgrounding pauses with no auto-resume | `clarity/hooks/use-session-checkpoint.ts:8-48`, `clarity/lib/history-store.ts` |
| Offline-first MMKV history and one sync bridge to Convex after auth | `clarity/components/convex-sync.tsx`, `clarity/lib/sync-plan.ts`, `clarity/convex/sessions.ts:77-113` |
| Progress: week/month/all-time, streaks, records ("this week" vs "ever"), daily goal gauge | `clarity/app/(tabs)/analytics.tsx`, `clarity/components/analytics/records-card.tsx`, `clarity/components/daily-goal-card.tsx`, `clarity/lib/stats.ts:142-564` |
| Local recommendation heuristic: the weakest skill picks drills, no model call | `clarity/lib/recommendations.ts:1-5` |
| "Pro preview": 2 free monthly previews of premium features with leases | `clarity/convex/proPolicy.ts:2-6`, `clarity/convex/pro.ts:23-67` |
| AI cost ledger + cron that reviews cost vs earned revenue every 12 h and alerts | `clarity/convex/costs.ts`, `clarity/convex/crons.ts:4` |
| Server-side size limits for every client-pushed row | `clarity/convex/limits.ts` |
| Saved coaching reports screen | `clarity/app/feedback.tsx` |
| Telemetry contract (attemptId, one terminal event, schema version) | `clarity/docs/observe-events.md` |
| Mock practice for simulators + QA seed screen; plain bun test scripts | `clarity/hooks/use-practice-session.mock.ts`, `clarity/app/dev-seed.tsx`, `clarity/scripts/test-*.ts` |
| Marketing site, privacy and support pages in the same repo | `clarity/web/index.tsx`, `clarity/web/privacy.tsx`, `clarity/web/support.tsx` |
| Account delete-all | `clarity/convex/account.ts:20` |

### oyelo-main: read-it-to-me audio library (native SwiftUI, iOS 26+, no backend)

| Feature | Where |
|---|---|
| Share extension with a durable App Group inbox: the manifest is written last, and the app acks only after the save succeeds | `oyelo/OyeloShare/ShareViewController.swift`, `oyelo/Shared/ShareInbox.swift:3-40` |
| Home-screen widget (small/medium) showing the latest listen, with interactive play/skip intents and a snapshot that holds no article text | `oyelo/OyeloActivity/OyeloRecentPlaybackWidget.swift:37-46`, `oyelo/Shared/LibraryWidgetSnapshot.swift`, `oyelo/Shared/PlaybackIntents.swift` |
| "Continue listening" App Shortcut for Siri, Shortcuts, Spotlight and the **Action button** (Pro) | `oyelo/Oyelo/Playback/ListeningShortcuts.swift` |
| Live Activity / Dynamic Island for playback (**described only**, see section 4) | `oyelo/docs/IMPLEMENTATION.md:45,51` |
| Listen-later reminders: one local notification per article, reschedulable, deep-links on cold launch | `oyelo/docs/USAGE-AND-REMINDERS.md`, `oyelo/Oyelo/Core/ReminderStore.swift`, `oyelo/Oyelo/Features/ReminderView.swift`, `oyelo/Oyelo/App/ArticleNotificationRouter.swift` |
| Usage screen: totals, 12-week heatmap with current/longest streak, peak hours, per-voice share | `oyelo/Oyelo/Features/UsageView.swift:416,553,621`, `oyelo/docs/USAGE-AND-REMINDERS.md` ("Insights update") |
| Up-next queue and a sleep timer (15/30/60/end of article) | `oyelo/Oyelo/Playback/ListeningQueue.swift`, `oyelo/Oyelo/Features/ListeningQueueView.swift:144` |
| Review prompt pacing: once per version and ≥120 days apart, after a positive action | `oyelo/Oyelo/App/ReviewPromptPolicy.swift:5-25` |
| Bundled offline "first listen" sample in onboarding, labelled as an AI voice | `oyelo/docs/FIRST-LISTEN.md` |
| On-device Apple Foundation Models for title suggestions and optional narration prep | `oyelo/Oyelo/Core/OnDeviceTitleSuggester.swift`, `oyelo/Oyelo/Core/OnDeviceNarrationPreparation.swift` |
| Follow blogs (RSS/Atom) with an opportunistic background refresh | `oyelo/Oyelo/Core/FeedStore.swift`, `oyelo/Oyelo/App/FeedBackgroundRefresh.swift` |
| Alternate app icons and accent colors as a one-time Pro unlock (StoreKit 2) | `oyelo/Oyelo/Features/AppIconView.swift:73`, `oyelo/Oyelo/Core/ProStore.swift`, `oyelo/docs/PRO.md` |
| Opt-in device backup inclusion; keys stay device-only | `oyelo/Oyelo/Core/LibraryBackupPolicy.swift:21,122` |
| 9-language String Catalog pipeline | `oyelo/docs/LOCALIZATION.md`, `oyelo/TRANSLATION.md` |
| Pre-generation cost estimates, local usage/cost history | `oyelo/Oyelo/Core/NarrationPricing.swift`, `oyelo/Oyelo/Core/UsageStore.swift` |
| App Intents research doc (which actions to expose, and why to keep widget intents hidden) | `oyelo/docs/APP-INTENTS.md` |
| Archive with a 30-day restore, swipe actions, batch select | `oyelo/README.md` ("Included in 1.0"), `oyelo/Oyelo/Features/ArchivedItemsView.swift` |

### What Xolace already has (so these are not proposed as new)

Lock-screen media metadata for Vessa (`src/features/browse/track-lock-screen-metadata.ts`).
Full-text search only on quotes (`convex/schema.ts:1428`). Review prompt on a "lighter" close
(`src/features/session-end/components/activity-variant.tsx:110-113`). Input length cap
(`convex/sessions.ts` `submitInput`, `MAX_RAW_INPUT`). Contribution graph
(`src/features/profile/contribution-graph.ts`). Follow-up card stack (`src/features/follow-up/stack-cards.tsx`).
Premium themes (`src/features/purchases/premium-theme-reconciler.tsx`). Delete/wipe (`convex/users.ts:307,330`).
Xolace does **not** have: an app lock, widgets, a share extension, App Intents/Siri, Live Activities,
user-scheduled reminders, AI cost tracking, mirror streaming, a sleep timer, or E2E. For widgets and
Siri, `docs/foundation/xolace.md:433-436` lists them as Phase 3 (Planned).

---

## 2. Ranked ideas

### Great (do soon)

#### G1. Biometric app lock + app-switcher privacy
- **What:** an optional Face ID/fingerprint lock and a blurred app-switcher snapshot. The lock is set per account and device, and it fails closed.
- **From:** amber, `amber/docs/biometric-app-lock.md`, `amber/src/lib/app-lock.tsx`, `amber/src/lib/app-lock-controller.ts`, `amber/src/components/privacy-screen.tsx`.
- **Why it fits Xolace:** reflections are the most sensitive data in the app. The privacy standard (`xolace-for-agents.md`, "Privacy standard") and rule 8 ("phones get seen by others") both point here. The user gets this: hand someone your phone, and your timeline, mirror and Xolacer chats are not one tap away. The app-switcher card no longer shows the last thing you wrote.
- **Build:** add `expo-local-authentication` and `expo-screen-capture` (SDK 57 versions). `expo-secure-store` is already installed (`package.json:102`). Use its `requireAuthentication` proof exactly as amber does. Code goes in `src/features/app-lock/` (controller, gate, privacy screen), mounted in `src/app/_layout.tsx` *outside* the `Stack.Protected` groups so deep links and notification taps can't bypass it. The preference lives in the Zustand `toggles` slice (`src/store/store.ts`). No Convex change.
- **Effort:** M. Most of the cost is the edge cases amber documents: interruption relock, stale prompt results, and recovery through Clerk sign-out.
- **Risks:** push-notification and Stream-chat deep links must land behind the lock. Copy must not claim encryption (rule 12). Amber says the lock "does not encrypt server records" (`amber/docs/biometric-app-lock.md`, "Behavior and boundaries"). FLAG_SECURE on Android also blocks the quotes poster share screenshot (`src/features/quotes/`), so share through view-shot instead.

#### G2. Discreet home/lock-screen widget: "How's today?" + today's Kindling
- **What:** a small widget that opens straight into a reflection, plus a medium widget that shows the streak or day and links to today's Kindling set. It never shows reflection content.
- **From:** amber's expo-widgets setup (`amber/app.config.ts:88-113`, `amber/src/widgets/recent-saves-widget.tsx`, `amber/src/lib/widget-sync.tsx`). Amber clears the widget when the lock is on (`amber/docs/biometric-app-lock.md`). Oyelo's minimal snapshot holds no body text (`oyelo/Shared/LibraryWidgetSnapshot.swift`, `oyelo/README.md`, "Privacy and boundaries").
- **Why it fits:** this is literally the Phase 3 line "a one-tap check-in ('how's today?') and today's Kindling" (`docs/foundation/xolace.md:433`). It is a Hearth surface and serves the "daily like skincare" vision. The user sees a quiet ember on the home screen, and one tap starts the day's reflection.
- **Build:** this needs **SDK 58** for `expo-widgets` + `@expo/ui` (both are SDK-58 packages in `amber/package.json`). On SDK 57, use `@bacons/apple-targets` with a hand-written SwiftUI widget plus `react-native-android-widget`. Code goes in `src/features/widgets/` (`today-widget.tsx`, `use-widget-sync.ts`). The snapshot is built from data already on the client (streak state, Kindling-set existence and count, `useAppTheme` palette), so no new Convex function is needed. The deep link is `xolace://` to the reflect screen. Add a `widgetVariant` preference with a neutral "Check in" variant as the default (rule 8).
- **Effort:** M (L if done before the SDK 58 upgrade).
- **Risks:** never put emotions, themes, Kindling names that reveal state, or "you've been sad" in the snapshot (rule 8). Clear it on sign-out and when the G1 lock is on. Rule 13: don't show steadiness or compounding until shipped.

#### G3. AI-driven E2E with a reproducible artifact
- **What:** a scripted plus "explore" E2E suite that drives a real simulator build, runs on EAS Simulators in CI, and outputs JUnit/Markdown reports with video.
- **From:** amber, `amber/e2e.config.ts` (EAS simulator, context and system prompts, reporters), `amber/e2e/amber.e2e.ts` (serial signed-in suite, best-effort cleanup), `amber/e2e/ci/explore-goal.mjs` (goal built from the PR's changed `src/app` and `src/components` files).
- **Why it fits:** `CLAUDE.md` ("Tests") says E2E is the preferred and sole testing mechanism, should produce a verifiable artifact, and is "not setup yet". This is a working template on the same stack (Expo + Clerk + Convex).
- **Build:** `@e2e-dev/mobile` + `@e2e-dev/eas`, an `e2e` EAS profile building `APP_VARIANT=preview`, and a dev-login account (Clerk test user). Suites go in `e2e/` at the repo root. Seed fixtures through `convex/devTools.ts` / `convex/seed.ts`. Mock the mic/voice path the way clarity does (`clarity/hooks/use-practice-session.mock.ts`) so the voice vent and voice input are deterministic on simulators.
- **Effort:** M.
- **Risks:** real reflections hit Anthropic and OpenAI, which costs money and can trigger the safeguard. Use a dev deployment with a stub provider flag. Never put real user content in fixtures.

#### G4. Crash-safe reflection draft (checkpoint)
- **What:** when the app is killed or backgrounded mid-compose, the unsent reflection text is kept locally and offered back on next open ("You were writing something, keep going?").
- **From:** clarity, `clarity/hooks/use-session-checkpoint.ts:8-48` (one key overwritten on an interval, a stale checkpoint becomes `interrupted`, backgrounding pauses with no auto-resume). Also oyelo's "partial save stays visible" share inbox (`oyelo/Shared/ShareInbox.swift:3`).
- **Why it fits:** the first sentence is the hardest. Losing it when a call comes in loses the reflection, which hits the north-star metric (weekly active reflectors). Today the draft lives only in component state (`src/features/reflect/compose/use-compose-card.ts:48-52`, `src/features/reflect/components/reflect-screen.tsx:208`).
- **Build:** a `use-reflect-draft.ts` in `src/features/reflect/hooks/` writing to `expo-sqlite/kv-store` (already the native persistence, `src/lib/storage/unified-storage.ts`) on a debounce and on `AppState` background. Clear it on submit, on explicit discard, on sign-out and on account change. No server storage, so no consent question.
- **Effort:** S.
- **Risks:** the plaintext draft sits on the device. Pair it with G1 and add a 24-48 h TTL. Copy must not say "saved securely". Vent must **never** be drafted, because "Vent is never stored" (`xolace-for-agents.md`).

#### G5. AI cost ledger + cost/revenue watch
- **What:** record the estimated cost of every model call (tokens × a rate snapshot taken at request time). A cron compares a rolling 7-day cost with earned Plus revenue and raises an alert when cost exceeds a threshold.
- **From:** clarity, `clarity/convex/costs.ts` (`earnedRevenue` pro-rating, paginated totals, `saveAlert`) and `clarity/convex/crons.ts:4`. Oyelo's rule "missing pricing is unknown, never zero" and its rate snapshot at request time (`oyelo/docs/USAGE-AND-REMINDERS.md`, "Storage and cost update").
- **Why it fits:** every reflection runs Haiku classification, Sonnet articulation, the distiller, the Reflection Agent and Kindling. The mirror is "free, always" (rule 11), so unit economics have to be watched rather than gated. No cost tracking exists today (no `estimatedCost`/`inputTokens` in `convex/`).
- **Build:** an `ai_usage` table (model, feature, inputTokens, outputTokens, estimatedUsd?, at) written from the existing provider wrapper in `convex/ai/providers/`. Code goes in `convex/ai/usage/` with a review action and a cron in `convex/crons.ts` (use `crons.interval`). Revenue comes from the existing `convex-revenuecat` component. Alert into PostHog (`convex/posthog.ts`).
- **Effort:** S-M.
- **Risks:** store **no prompt or response text**, only counts. This is internal ops data with no user words, so it needs no consent under rule 7. Never use it to throttle the mirror (rule 11).

### Strong

#### S1. "Check in with Xolace": Siri, Shortcuts, Action button
- **What:** an App Shortcut ("Check in with Xolace", "Start a voice reflection") that opens the app into the reflect or voice screen. It is assignable to the iPhone Action button.
- **From:** oyelo's single, well-scoped App Shortcut, `oyelo/Oyelo/Playback/ListeningShortcuts.swift` (phrases, `AppShortcutsProvider`, an intent that never triggers a paid action). Also `oyelo/docs/APP-INTENTS.md` ("publish only the top few", keep internal intents `isDiscoverable = false`). Amber's JS↔Swift dispatch is `amber/app-intents/AppIntentsSetup.swift` and `amber/src/lib/app-intents.tsx`.
- **Why it fits:** `docs/foundation/xolace.md:436` lists "Hey Siri, check in with Xolace" as a Phase 3 channel. The user can press the Action button on a walk and talk, with no hunting for the app.
- **Build:** use `expo-app-intents` (SDK 58) or an `@bacons/apple-targets` Swift file. It needs only an "open app at route" intent, with `openAppWhenRun`/`supportedModes` set to foreground. Do **not** port amber's capture-token path, so no reflection text ever goes through Siri. Code goes in `src/features/app-intents/` + `targets/`. Android: a static app shortcut via `expo-quick-actions`.
- **Effort:** S-M.
- **Risks:** a Siri dialog must never speak about the person's state (rule 8). Every input still goes through the in-app safeguard pipeline (rule 5).

#### S2. "Come back to this": reflect-later and hard-date reminders
- **What:** (a) a "Remind me to come back to this" action on a timeline entry or session end, which schedules one local notification that deep-links to that session. (b) "Hard dates" (exam, anniversary): the person sets a date and Xolace checks in before and after.
- **From:** oyelo listen-later reminders. One stable identifier per item, reschedulable, permission asked only on schedule, cold-launch routing (`oyelo/Oyelo/Core/ReminderStore.swift`, `oyelo/Oyelo/App/ArticleNotificationRouter.swift`, `oyelo/docs/USAGE-AND-REMINDERS.md`). Amber's system add-event sheet is in `amber/src/lib/intents.ts:58-62`.
- **Why it fits:** "Calendar moments" is a listed Phase 3 channel (`docs/foundation/xolace.md:434`). It makes care more daily (rule 1a), and the user chooses it, so it isn't a nag.
- **Build:** (a) client-only with `expo-notifications` (installed), in `src/features/reminders/`, deep link `/timeline/session/[id]`. (b) needs a small `hard_dates` table in `convex/reminders/` that feeds the existing follow-up/notification scheduler (`convex/notifications.ts`, `convex/followUps.ts`) as a new `notification_log.type` literal. Adding a union member is safe; removing one is not (CLAUDE.md, store-gap rule).
- **Effort:** S for (a), M for (b).
- **Risks:** notification copy must be discreet ("Xolace is checking in"), never the event name or the session's emotion (rule 8). It must respect quiet hours (`src/features/settings/components/quiet-window-dialog.tsx`).

#### S3. Share into Xolace ("this got to me")
- **What:** share text, a link or a screenshot from another app into Xolace. It lands in the composer as context for a reflection ("A message from my landlord got to me…").
- **From:** amber's `expo-sharing` activation rules and its durable intake that waits for unlock (`amber/app.json:90-98`, `amber/src/lib/share-intake.tsx:14-21`, `amber/src/app/+native-intent.ts:6-10`). Oyelo's inbox with the manifest written last and an ack after save (`oyelo/Shared/ShareInbox.swift:3`, `oyelo/OyeloShare/ShareViewController.swift`).
- **Why it fits:** it catches what someone carries *at the moment it lands* (rule 1a). The user can share the thing that stung and reflect on it then and there.
- **Build:** start with text and URL only. Use `expo-sharing` share-receiving (SDK 58), or `expo-share-intent` on SDK 57. Intake goes in `src/features/share-intake/`. Prefill the composer and **never auto-submit**. The text goes through `sessions.submitInput` so the safeguard runs (rule 5).
- **Effort:** M.
- **Risks:** shared content may contain **other people's words**. Treat it as part of the user's private input and never pool it to peer reflections (rule 7, `reflections` consent). Images add OCR, which would be a new model input. Defer them, or require an on-device-only path. Rule 6 allows a model call only for a genuinely new modality, and it must live in `convex/ai/`.

#### S4. Stream the mirror as it's written
- **What:** the mirror appears word by word instead of after the whole Sonnet call finishes.
- **From:** clarity's streaming coaching with partial-object state, abort + timeout and retry (`clarity/hooks/use-ai-coaching.ts`, `clarity/app/api/speech-coach+api.ts`, `clarity/server/forward-premium.ts`).
- **Why it fits:** waiting is the most fragile moment of a reflection. Streaming makes the Fire feel present. Today the mirror lands in one write (`convex/sessions.ts:938` `deliverMirror`).
- **Build:** keep everything under `convex/ai/` (rule 6). Stream the articulator output into a chunked doc using the `@convex-dev/persistent-text-streaming` component or a `mirror_drafts` row patched every ~N tokens. The client reads it reactively in `src/features/reflect/hooks/use-session.ts`. Clarity's Expo-API-route proxy is **not** needed, because Convex does the work.
- **Effort:** M.
- **Risks:** the safeguard currently runs on *input* before articulation, but any output-side check (tone or claim rules in the mirror plan) must finish before text is shown, or else limit streaming to safety level `none`/`gentle`. Streaming also interacts with mirror TTS (`src/features/reflect/hooks/use-mirror-audio.ts`).

#### S5. User-owned memory: "What the Fire remembers"
- **What:** a settings screen listing the plain-language things the semantic profile holds. The user can confirm, dismiss ("that's not me anymore"), or delete each one, and the AI may never overwrite a user decision.
- **From:** amber's membership state machine, where the AI writes only `suggested` rows and `saved`/`dismissed` are user-owned so "the pipeline can never clobber a user decision" (`amber/convex/schema.ts:96-99`, `amber/convex/spaces.ts:351-389`).
- **Why it fits:** "a capable journal that remembers you" (rule 10) is only trustworthy if you can see and correct what it remembers. It supports the privacy standard ("you can delete everything") and makes memory feel like *yours*. Today `semantic_profiles` is internal-only (`convex/semanticProfiles.ts:35-192`, all internal).
- **Build:** a public query that returns a user-safe projection of the current profile, plus a `memory_overrides` table (`itemKey`, `state: confirmed|dismissed`). The Reflection Agent (`convex/ai/reflectionAgent/`) must read the overrides and never re-add dismissed items. Client goes in `src/features/memory/` with a route under `settings/`.
- **Effort:** L.
- **Risks:** the Reflection Agent is the only writer of `semantic_profiles` (`xolace-for-agents.md`, "Pipeline"), so overrides must be an input to it, not a second writer. Showing the profile is a persona-adjacent product decision ("Open questions": persona). **Ask before building.**

#### S6. Free Kindling preview for free users
- **What:** a small monthly allowance (for example 2/month) where a free user's eligible reflection gets the real Kindling set instead of the Plus invitation.
- **From:** clarity's preview policy (`clarity/convex/proPolicy.ts:2-6`, `MONTHLY_PREVIEWS = 2`, leases in `clarity/convex/pro.ts:23-67`).
- **Why it fits:** today free users meet Kindling only as an invitation (`docs/foundation/xolace.md:249`). Tasting real support is the honest way to show "whether the support layer is worth paying for" (`docs/foundation/xolace.md:524`).
- **Build:** add a preview check to the Kindling gate (the "Plus" condition in the pipeline, `convex/paths.ts`). Store a counter per month in a `kindling_previews` table under `convex/kindling/`. All other gates (safety < elevated, `supportNeed`, once per day) are unchanged.
- **Effort:** S-M.
- **Risks:** pricing is a business decision. Raise it as an open question and don't decide it silently. It must never relax a safety gate (rule 5).

### Nice to have

#### N1. Sleep timer for Vessa audio
Oyelo's sleep timer offers Off, 15, 30, 60 or end of item, resets on relaunch, and keeps the queue (`oyelo/Oyelo/Features/ListeningQueueView.swift:144`, `oyelo/README.md`). Vessa music and support audio are often played at night. Add a menu to `src/features/browse/player/player-controls.tsx` that pauses through the existing `use-track-playback.ts`. **S.** No rule conflicts.

#### N2. Discreet alternate app icon
Oyelo uses `setAlternateIconName` (`oyelo/Oyelo/Features/AppIconView.swift:73`, `oyelo/docs/PRO.md`). For Xolace the main value is privacy: a neutral icon and name for people whose phones get seen (rule 8). Use `expo-alternate-app-icons` with a picker in `src/features/settings/`. **S-M.** Recommend the discreet icon be **free** (privacy). Decorative icons could join the existing premium themes under Plus.

#### N3. Bundled "first mirror" demo in onboarding
Oyelo plays a bundled offline sample, labelled as AI, before any setup (`oyelo/docs/FIRST-LISTEN.md`). Xolace could add one pre-written sample reflection → mirror beat to `src/features/onboarding/story-beats.ts`, so people see what a mirror *is* before writing. It is static content, so no model call. **S.** Copy must be literally true (rule 12) and clearly marked as an example.

#### N4. Echoes: earlier reflections like this one
Amber's `similarItems` scores tag/token overlap with no model (`amber/convex/items.ts:220-260`). For Xolace, add a "You've been here before" row on `src/features/timeline/components/screens/SessionDetailsScreen.tsx`, using themes/emotions overlap from `emotional_metadata` via the Understanding. That is allowed by rule 6 because it reads, not re-derives. **S-M.** Risk: surfacing a heavy past session unprompted. Hide it when safety ≥ elevated, and make it a tap-to-open.

#### N5. Manual "Check for update" row
`amber/src/components/update-setting.tsx` lets testers and users pull an EAS Update without a cold start. Add it to `src/features/settings/components/screens/SettingsScreen.tsx` with `expo-updates` (installed). **S.**

#### N6. Telemetry contract doc
`clarity/docs/observe-events.md` sets one terminal event per attempt, joins by `attemptId`, adds `event_schema_version`, and exports failures only as bounded categories. Write the same contract for the PostHog reflection funnel (`convex/posthog.ts`, `src/features/intake/analytics.ts`). **S.** Never put user words in event properties (rule 7).

#### N7. Velocity-projected swipe for card stacks
`amber/src/lib/tidy/swipe-decision.ts` decides on *projected* position (position plus momentum), with undo and a single haptic on pan (`amber/src/lib/tidy/use-single-haptic-on-pan.ts`). This could improve flick feel in `src/features/follow-up/stack-cards.tsx`. **S.**

#### N8. Localization pipeline (when markets are decided)
Oyelo's rules: no persisted localized text, one sentence per string, plural variants (`oyelo/AGENTS.md`, `oyelo/docs/LOCALIZATION.md`). This matters only once the target market is decided, which is an open question in `xolace-for-agents.md`. **L.** Translating mirror and safety copy needs clinical review.

### Considered and rejected (conflict with Xolace rules)

- **Spotlight / Siri semantic indexing of content** (`amber/app-intents/Support/AmberSpotlight.swift`, `amber/app-intents/Entities/ItemEntity.swift`). This would put reflection titles into system search that anyone holding the phone can see, which breaks rule 8 and the privacy standard.
- **Capture through Siri without opening the app** (`amber/convex/appIntents.ts` token + `amber/convex/http.ts:148` `/app-intents/capture`). It bypasses the in-app flow and puts emotional text in Siri dialogs. If ever wanted, it must go through the full safeguard (rule 5) and say nothing back.
- **On-device Apple Foundation Models** (`oyelo/Oyelo/Core/OnDeviceTitleSuggester.swift`). This conflicts with "all model calls live under `convex/ai/`" (CLAUDE.md, Cognition Layer rule) and has no safety coverage.
- **Persisted offline query cache of reflections** (`amber/src/lib/query-cache-policy.ts`, `clarity/components/convex-sync.tsx`). It would leave unencrypted reflection history on disk. Amber itself erases this cache when the lock is enabled (`amber/docs/biometric-app-lock.md`). If cold-start speed ever matters, persist only non-sensitive reads (theme, streak count).
- **Free-form AI "action chips"**: amber lets the model attach actions (`amber/src/lib/intents.ts`). Xolace already does the safer version, where support is picked from a curated catalogue (rule 2).

---

## 3. Improvements to existing Xolace features

| Xolace file | Improvement | Source |
|---|---|---|
| `src/features/session-end/components/activity-variant.tsx:110-113` | Pace the review request: once per app version and ≥120 days apart. Today it fires on every "lighter" close, and iOS throttles it silently. | `oyelo/Oyelo/App/ReviewPromptPolicy.swift:5-25` |
| `src/features/profile/contribution-graph.ts`, `src/features/profile/components/contribution-graph-card.tsx` | Add month labels, a less/more legend, a today outline, and current vs longest streak next to the graph. Use pure date math over completed sessions with no model call. | `oyelo/Oyelo/Features/UsageView.swift:416`, `oyelo/docs/USAGE-AND-REMINDERS.md` ("Insights update"), `clarity/lib/stats.ts:425` (`longestStreakRange`) |
| `src/features/insights/insights-screen.tsx` (Building) | "When you reflect": 24 hourly buckets of completed reflections (peak hours), split at local-hour boundaries. "This week vs ever" records. It's arithmetic only and fits the Understanding rule. Label it Building until shipped (rule 13). | `oyelo/Oyelo/Features/UsageView.swift:553`, `clarity/components/analytics/records-card.tsx` |
| `src/features/reflect/compose/use-compose-card.ts`, `src/features/reflect/components/reflect-screen.tsx` | Draft checkpoint (see G4). | `clarity/hooks/use-session-checkpoint.ts` |
| `src/features/browse/player/player-controls.tsx` | Sleep timer (see N1). | `oyelo/Oyelo/Features/ListeningQueueView.swift:144` |
| `convex/sessions.ts:938` (`deliverMirror`) + `src/features/reflect/hooks/use-session.ts` | Streamed mirror (see S4). | `clarity/hooks/use-ai-coaching.ts` |
| `src/features/settings/components/screens/NotificationsScreen.tsx` | Add per-item "come back to this" reminders, managed in one list (see S2). Ask for notification permission only when someone schedules. | `oyelo/Oyelo/Core/ReminderStore.swift`, `oyelo/docs/USAGE-AND-REMINDERS.md` |
| `src/features/follow-up/stack-cards.tsx` | Velocity-projected swipe decision + single pan haptic (see N7). | `amber/src/lib/tidy/swipe-decision.ts` |
| `src/app/_layout.tsx` | App lock gate outside the protected groups (see G1). Amber also redirects unknown OS deep links (`sso-callback`) in `+native-intent.ts`, which helps if Android Clerk SSO cold-starts misroute. | `amber/src/app/+native-intent.ts:11-19` |
| `src/features/onboarding/` permission asks | Keep permission logic in a pure module (limited Photos counts as granted; "can't ask again" sends people to Settings) separate from the animated pages. | `amber/src/lib/onboarding-permissions.ts` |
| `convex/users.ts:307,330` (deletion/wipe) | When widgets, Spotlight or reminders ship, deletion and sign-out must also clear the widget snapshot, pending local notifications and drafts, which amber does for its widget and Spotlight. Also closes part of the known "deletion misses…" gap. | `amber/docs/biometric-app-lock.md` (step 8), `amber/app-intents/AppIntentsSetup.swift:51-53` (`clearSpotlight`) |

---

## 4. Gaps in the sample code that block straight reuse

- **Oyelo's Live Activity is described but not in the repo.** `oyelo/docs/IMPLEMENTATION.md:45,51` describes Live Activity intents, but there is no `ActivityKit`, `ActivityConfiguration` or `LiveActivityIntent` anywhere in the Swift sources. `OyeloActivity/` contains only the home-screen widget (`oyelo/OyeloActivity/OyeloRecentPlaybackWidget.swift`). A Xolace Live Activity (for example a breathing or Sit-with-this timer on the Dynamic Island) would need building from scratch with `expo-live-activity` or an `@bacons/apple-targets` widget extension + a small Expo module.
- **SDK mismatch.** Amber's widget, App Intents and share-receive code depends on SDK 58 packages (`amber/package.json`: `expo-widgets ~58.0.9`, `expo-app-intents ~0.4.7`, `@expo/ui ~58.0.9`, `expo-sharing ~58`). It also patches `expo-widgets` (`amber/package.json` patchedDependencies → `patches/expo-widgets@58.0.9.patch`) to get `widgetSize`. Xolace is on SDK 57. Plan the SDK 58 upgrade first, or use `@bacons/apple-targets`/`expo-share-intent` on 57.
- **Amber's iOS 27 schema intents** (`@AppIntent(schema: .notes.createNote)`, `amber/app-intents/Intents/CaptureIntents.swift:10-16`) compile only with Xcode ≥ the `compiler(>=6.4)` guard. EAS images on Xcode 26 fall back to the `#else` branches (`amber/app-intents/Intents/NavigationIntents.swift:52-70`).
- **Clarity needs private packages.** Install requires a Hugeicons Pro token (`clarity/README.md`, "Requirements"), and coaching needs an AI Gateway key. Its streaming path runs through an Expo Router API route proxy (`clarity/server/forward-premium.ts`), which Xolace doesn't need.
- **Oyelo is native SwiftUI with no backend.** Only its patterns (snapshot shape, inbox protocol, reminder identity, review pacing) port. The code does not.
- **Device-unverified pieces.** Amber's biometric lock and widget refresh were not exercised on a physical device (`amber/docs/biometric-app-lock.md`, "Local validation"). Oyelo's Action button shortcut is "Built, not yet verified on a device" (`oyelo/docs/PRO.md`). Budget device QA for G1, G2 and S1.
- **The AI E2E stack needs paid model access.** Amber's e2e uses the AI Gateway for its act/explore agents (`amber/e2e.config.ts`, `gateway('openai/...')`), so budget for it in CI.
