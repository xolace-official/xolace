# UI / UX ideas from the sample apps

Source tags (**C** Companion, **P** Private Mind, **R** Rakazo) and context: [README.md](README.md).
Each item: what the sample repo does and where, then → what it could become in Xolace.

## Calm, honest surfaces

**Calm on the surface (R).** Tool activity hidden by default; progress messages capped at 3 per run, only after 60s, ≤500 chars (`docs/tool-activity.md`, `packages/adapters/src/user-progress.ts`).
→ Never show the machinery of memory lookups or safeguards; at most one soft line like "thinking about what you shared last week".

**Gentle process trace (P).** Animated step timeline (`components/chat-screen/WebSearchTraceList.tsx`, `WebSearchTraceRow.tsx`) and collapsible thinking (`ThinkingBlock.tsx`).
→ For insights and proactive check-ins, an optional "what I noticed → what I remembered → why I'm asking" makes them feel earned, not creepy. Hidden by default, one tap to see.

**Honest offline and data age (C).** "Last updated 3m ago" / "Offline – showing cached data" (`apps/mobile/components/CacheStatusIndicator.tsx`), a one-time offline banner (`NetworkStatusBanner.tsx`).
→ For vent/reflect: a calm "saved on your phone, will sync" so nobody fears losing what they wrote. Xolace only has an offline strip in xolacer chat today.

**Phantom sessions (P).** A chat only becomes a row once the user sends something (`utils/startPhantomChat.ts`, `phantomChat` in `store/chatStore.ts`).
→ Opening vent or talk shouldn't create empty sessions that distort streaks and analytics.

**Time separators in long threads (R).** New day or 15-minute gap, "Yesterday 9:41", Hermes-safe Intl (`packages/core/src/time-separators.ts`, `apps/mobile/components/time-separator.tsx`).
→ Gives a single long companion thread a sense of time.

## Shortest path for someone struggling

**Choose where the app opens (C).** `components/LandingPagePicker.tsx`, `utils/landing-page-navigation.ts`.
→ Talk, Vent or Today as the start screen.

**Native controls for quick check-ins (C, R).** `.ios.tsx` route/component splits, `@expo/ui` pickers, glass headers (C: `apps/mobile/components/GlassModalHeader.tsx`, `app/reschedule.ios.tsx`; R: `apps/mobile/components/*.ios.tsx`).
→ Native mood/intensity pickers and sheets feel calmer and more trustworthy than custom sliders.

**Review prompts only after good moments (C, P).** Named, once-only triggers, skipped in dev (`apps/mobile/hooks/useAppStoreRating.ts`; `utils/reviewPrompt.ts`).
→ Allowlist: finished exercise, streak milestone. Never after vent, talk or escalation.

## Motion and feedback

**Live dictation waveform (P).** 16 kHz chunks into a scrolling Reanimated SVG bar window (`components/chat-screen/RecordingAnimation.tsx`).
→ Fits `reflect/hooks/use-plus-dictation.ts` and vent dictation. With Skia, voice amplitude could softly drive the Xolace face/mascot.

**"Drop it in" motion (P).** Photos fly from the grid into the composer (`components/chat-screen/attachments/AttachmentFlight.tsx`, `useAttachmentFlights.ts`).
→ For adding photos to reflections or gratitude entries.

**Smoothed download ETA with pausing (P).** `utils/downloadEta.ts`, `hooks/useDownloadsSurviveBackground.ts`, `pauseModelDownloadsWhile` in `store/modelStore.ts`.
→ For local models, voice packs, offline exercise audio.

## Copy

**Every visible word is UI (R).** Rakazo's `AGENTS.md` requires PRs that add user-facing copy to quote and justify it.
→ For a mental health product, copy tone carries clinical weight. Worth a rule in `.agents/rules/`.
