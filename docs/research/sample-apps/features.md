# Feature ideas from the sample apps

Source tags (**C** Companion, **P** Private Mind, **R** Rakazo) and context: [README.md](README.md).
Each item: what the sample repo does and where, then → what it could become in Xolace.

## Proactivity

Reaching out at the right time, and staying quiet otherwise.

**User-authored routines (R).** `schedule_create/list/cancel` tools (`packages/adapters/src/schedule-tools.ts`) turn "every morning…" into a `Routine` row (prompt, `crons[]`, timezone, notify flag; `packages/db/prisma/schema.prisma`). Routine runs can't create more schedules (`filterBuiltinToolsForRun`). There's a mobile editor (`apps/mobile/app/routine.tsx`) and a "test run" path.
→ Xolace follow-ups are system cadences (`followUps.ts`, `lib/followUpCadence`). Let users say "check in with me Sunday nights before the work week" or "walk me through a wind-down at 10:30 on weeknights" and have the companion create a Convex scheduled routine, with "try it now" and one-tap pause. New additive table.

**Silent runs (R).** A routine can end with the `NO_RESPONSE` sentinel and nothing is sent (`packages/adapters/src/silent-reply.ts`).
→ A nightly "should I reach out?" pass over Understanding, streaks and open follow-ups that either writes something gentle or stays silent. Silence becomes a measurable outcome, which is the antidote to notification fatigue.

**Actionable notifications (C).** `apps/mobile/components/PushNotificationProvider.tsx` registers a category via `setNotificationCategoryAsync` with buttons that require device unlock, dispatches on `actionIdentifier`, and dedupes `${notificationId}:${actionIdentifier}` in a persisted set so a cold start doesn't double-submit. IDs in `apps/mobile/constants/notifications.ts`.
→ Follow-up pushes with "Better / Same / Worse", a text-reply "Tell me more", and "Talk now". Writes straight to `followUpResponses`. The dedupe matters: a duplicate answer skews `understanding` trends.

**Home-screen and lock-screen widget (C).** JS turns cached data into a small payload (`apps/mobile/utils/widgetStorage.shared.ts`), writes it to an App Group on iOS (`widgetStorage.ios.ts`, `@bacons/apple-targets`) or storage on Android (`widgetStorage.android.ts`, `react-native-android-widget`, JSX widget in `apps/mobile/widgets/`). Synced when the app backgrounds (`hooks/useWidgetSync.ts`). The SwiftUI timeline computes countdowns from ISO timestamps itself (`targets/widget/widgets.swift`) and deep-links each row.
→ Next check-in ("Tonight: how did the talk with your sister go?"), streak, daily quote, and a "Vent in 10s" deep link. Add lock-screen accessory sizes and an App Intent for one-tap mood logging. **Keep clinical content off the lock screen**; it's visible to anyone holding the phone.

**Open loops / scratchpad (R).** Up to 40 open items injected each turn, explicitly "not a scheduler" (`packages/adapters/src/scratchpad-context.ts`).
→ Small commitments the user made ("try 4-7-8 breathing before bed", "email the GP") become visible, completable items, and the next session opens with "Did the GP email happen?". Ties reflections, exercises and follow-ups together.

**One gentle nudge, then let go (R).** `packages/adapters/src/stuck-work.ts` reminds once, then cancels, with claim/TTL-safe push dedupe.
→ An unfinished exercise or unanswered ask gets at most one "still here if you want to finish that".

**Reach users outside the app (R).** Per-bot Slack, WhatsApp, Telegram and iMessage/SMS (`packages/adapters/src/messaging-platforms.ts`, `CHANGELOG.md`); owner replies like YES/NO map to commands (`packages/core/src/messaging-commands.ts`).
→ Opt-in SMS/WhatsApp check-ins for people who've stopped opening the app, which is often exactly when they need it. Inbound text must still go through `escalation`.

**Calendar-aware nudges (C).** The extension injects controls into Gmail and Google Calendar popups (`apps/extension/lib/google-calendar.ts`).
→ Not the DOM injection, but the idea: read the calendar via `integrations/` and notice "four back-to-back meetings, want a 2-minute reset before 3pm?". A strong input for the proactive engine.

## Memory and understanding

Memory the user can see and steer.

**The companion proposes changes to how it supports you (R).** `propose_instructions_update` always needs approval (`packages/adapters/src/builtin-tools.ts:1043`); the card shows a before/after diff (`packages/core/src/instruction-diff.ts`); history and undo live on the bot (`schema.prisma`, `apps/mobile/components/instruction-undo.tsx`).
→ A readable "how I support you" contract. "You've said three times advice feels like pressure. Can I stop suggesting exercises unless you ask?" Approve / Edit / Undo. Xolace already versions `semanticProfiles` (`createVersion`, `revertToVersion`) but only internally; this hands authorship to the user.

**Reflect-back after intake (R).** Creating a bot queues one turn where it states how it understood its role and asks what's missing (`CHANGELOG.md`).
→ After intake: "Here's what I heard you want from me…", user confirms or corrects, and that seeds the semantic profile with something they signed off on.

**"Open threads" rolling summary (R) + rolling digest (P).** Rakazo rewrites one compacted summary every 50 messages tracking facts, decisions, unresolved work and preferences, and injects at most 5 recalled memories with provenance inside `<recalled_memory>` tags marked "not instructions" (`packages/adapters/src/history-compaction.ts`). Private Mind keeps a 12-word "what this is about now" digest per chat, with an echo guard (`utils/conversationDigest.ts`).
→ Per-user "what's unresolved" ("mum conversation pending; interview Thursday") feeding `followUps`, plus a cheap per-session digest for talk handoffs and RAG queries. Show memories with provenance ("from your vent on 12 Oct") and a forget button (Rakazo's `forget_memory` requires approval: `packages/core/src/action-approval.ts`).

**Hybrid retrieval with diversity (P).** Vector + SQLite FTS5 fused with reciprocal rank fusion, a term-coverage boost and MMR (`utils/hybridRetrieval.ts`, `utils/rankFusion.ts`, `database/keywordIndex.ts`, knobs in `constants/retrieval.ts`).
→ A cheap upgrade to `episodicMemory.ts` / `rag.ts` ranking: five *different* relevant memories instead of five near-identical sad days. Also enables an offline local index in op-sqlite.

**"Because you said…" evidence (P).** Citation mapping and exact-sentence highlighting (`utils/attributeSources.ts`, `utils/citationHighlight.ts`) and a correct/ambiguous/incorrect confidence label (`utils/web/retrievalEvaluator.ts`).
→ `compounding/insightEvidence.ts` already stores evidence. Surface it: an insight chip opens the user's own past words, highlighted. Hold back low-confidence insights ("not sure yet").

## Privacy as a feature

**Vault mode (P).** All inference on-device via `react-native-executorch`; the model warms up and is freed 5s after backgrounding (`store/llmStore.ts`, `warmUpModel`, `releaseModelOnceIdleInBackground`).
→ Opt-in Vault vent/journal: a small local model gives acknowledgements and reflection prompts; only a consented aggregate (mood, intensity) syncs via a new optional field. "Your 3am vent never touches a server." **Blocker to design first:** escalation is server-side (`convex/ai/safeguard.ts`), so Vault needs a local crisis classifier or keyword gate that opens `crisis-resources` without sending anything.

**Device capability budgeting (P).** Per-platform memory budgets decide which models a phone may run and disable heavy features on low-RAM devices (`utils/modelCompatibility.ts`, `constants/device-memory.ts`, `constants/model-memory.ts`).
→ Decides who gets Vault mode; also useful for heavy Skia scenes and LiveKit on low-end Android.

**Private lookups and untrusted-content hygiene (P).** The phone runs searches itself, with SSRF guards (`utils/web/security/outboundFetch.ts`) and sanitizing of fetched text (`utils/web/untrustedContent.ts`).
→ "Therapists near me" or local crisis lines looked up from the device so the query never sits next to the user's identity. At minimum, apply the sanitizing to `convex/imports`.

**Cache owner envelope (C).** Persisted query cache is wrapped with region + userId and wiped on mismatch or logout (`apps/mobile/utils/queryPersister.ts`).
→ On shared/family devices, one person's reflections must never rehydrate for another. Apply to any local cache we add.

## Conversation quality

**Tap-to-answer choices (R).** `ask_user` takes a question of ≤240 chars and 2–4 options (`builtin-tools.ts:372`, `packages/core/src/answerable-ask.ts`), rendered natively (`apps/mobile/components/AskActions.tsx`, `ChoiceCard.tsx`).
→ Low-energy users can't always compose a reply: "Talk it through / Just vent / Something calming / Not now."

**Reframe and rehearsal branches (P).** `chatBranches` table (`database/db.ts`), `hooks/useChatBranching.ts`, fork marker `components/chat-screen/BranchMarker.tsx`.
→ Fork any vent/reflection turn into "explore a kinder interpretation" (CBT reframe) or retry a hard-conversation rehearsal with a different opening, without polluting the original. Additive `sessionBranches` table.

**Never leave a distressed user on a spinner (P).** A patched stall-watch detects generation crawling from memory pressure (`patches/react-native-executorch+0.11.0.patch`), only blames memory when the user didn't stop and the app wasn't backgrounded, and shows a plain-language recovery card (`components/chat-screen/MemoryStallCard.tsx`). Cut-off turns record `cutShortReason`.
→ Same for Talk/vent when LiveKit or the LLM stalls: switch to text, save the draft, or open the crisis line. Store why a turn was cut short so the session resumes honestly.

**Voice barge-in and farewell detection (R).** Playback stops only on a real sentence or stop/wait/pause, with echo filtering (`packages/core/src/barge-in.ts`); the call ends only if the whole utterance is a goodbye (`packages/core/src/farewell.ts`).
→ A deterministic layer over LiveKit Talk so "wait" is heard instantly and "bye for now, actually one more thing" doesn't hang up.

**Loop detection (P).** Finds repeated clauses and trims while keeping the useful part (`utils/loopDetection.ts`, tested in `__tests__/loopTruncationKeepsAnswer.test.ts`).
→ Post-filter on streamed replies. A repeating AI is jarring in an emotional moment.

**Consent-gated actions (R).** Tools are exempt, approval-required or unattended-safe; outbound verbs classified (`packages/core/src/action-approval.ts`); "Always allow" stored as a rule; an optional 1.5s LLM judge where uncertainty means ask (`packages/adapters/src/auto-review.ts`).
→ Foundation for "acts for you with consent": draft a message to a trusted contact, add a therapy appointment, share a reflection with a therapist. Allow once / Always / Deny. Routines get only the unattended-safe subset.

## Xolace beyond the app

**Browser sidebar (C).** A content script injects a 400px iframe of the Expo web export, with `postMessage` expand/collapse so modals can go full-screen (`apps/extension/entrypoints/content.ts`, `apps/extension/lib/sidebar-iframe.ts`); OAuth via `chrome.identity` in the background worker.
→ Once `apps/web` exists, a quick breathing exercise or vent from any tab for nearly free. Later and opt-in: a late-night "pause" nudge. Browser permissions are a trust question for us; treat as later-phase.

**Agent-callable CLI (C).** `schema` dumps the whole command tree as JSON (`packages/cli/src/commands/schema/command.ts`), every command takes `--json`, config written `0o600`.
→ `apps/cli` could expose an allowlisted `xolace checkin --json` / `xolace journal add`, so a user's own agents can log to Xolace safely.
