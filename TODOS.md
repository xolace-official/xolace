# TODOS

Items deferred from CEO/Eng reviews. Each entry has context to pick it up cold.

---

## P0 — `bun test` crashes on any test that imports react-native

**What:** `src/store/store.test.ts` imports `./store`, which pulls in `react-native`,
whose `index.js` opens with Flow syntax Bun's transpiler rejects:

```
27 | import typeof * as ReactNativePublicAPI from './index.js.flow';
            ^
error: Unexpected typeof
```

The run reports `1 error` and then **segfaults** (`panic(main thread): Segmentation
fault`) after printing the summary.

**Why it matters more than one red file:** this isn't specific to the store — it is a
ceiling on what can be tested at all. Any test that imports a module which transitively
reaches `react-native` hits it, which is most of `src/`. It is the reason the suite's
coverage is concentrated in pure modules (`convex/lib/`, `features/*/[rule].ts`) and why
component and hook behaviour is effectively untestable today. The segfault also means a
CI runner would report a crash rather than a clean failure count.

**The exact reach (confirmed, not guessed):**
`store.ts:9` → `@/src/lib/storage/unified-storage` → `unified-storage.ts:9`
`import { Platform } from 'react-native'`. That single `Platform` import — used only to
branch localStorage vs `expo-sqlite/kv-store` — is what drags the whole RN entry point
into the test graph.

**How to start:** three candidate fixes, cheapest first.
1. A `bunfig.toml` `preload` registering `mock.module('react-native', ...)` with a stub
   `Platform`. Smallest win, and unblocks every store/hook test at once.
2. Narrower: have `unified-storage.ts` pick its backend without importing `react-native`
   (a `.web.ts` platform extension, which this repo already uses elsewhere, resolves the
   split at bundle time and needs no `Platform` check at all).
3. Move component/hook tests to a runner that already understands RN
   (jest + `react-native` preset), keeping `bun test` for pure modules.

Option 2 is the one that removes the problem rather than mocking around it, and it fits
the documented platform-extension convention in CLAUDE.md.

**Key files:** `src/store/store.test.ts`, `src/store/store.ts`,
`src/lib/storage/unified-storage.ts`, `bunfig.toml` (does not exist yet).

**Effort:** S–M — option 1 is plausibly 20 minutes; option 3 is a runner split.

**Priority:** P0 — not because the store is broken (it isn't; this is a test-harness
limit), but because it silently caps test coverage for the whole `src/` tree, and a
segfaulting suite can't be trusted as a CI gate.

**Found:** `/ship` triage on branch `feat/xolacer-suggestion-session` (2026-08-01).
Pre-existing on `dev`, unrelated to that branch.

---

## P3 — Kindling: population signal ("people with a similar session found this helpful")

**What:** Let twig outcomes across all users inform routing. Store outcome counts per catalogue item (done vs skipped, plus whatever "good twig" means), grouped by coarse Understanding fields (`primaryEmotion`, `supportNeed`). Never a person's vector or text. Ruled out of scope on the [Support routing map](https://github.com/xolace-official/xolace_app/issues/497), which learns only from the person's own outcomes.

**How to start:** a counts table keyed by item + group. Add a minimum group size before any count is read, so a rare emotion + rare entry can't point to one person. Feed the counts into `pickSeeded` in `convex/ai/paths/bind.ts` as one more score input next to tag overlap.

**Key files:** `convex/ai/paths/bind.ts`, `convex/schema.ts` (`path_steps`)

**Effort:** M
**Priority:** P3 — personal feedback loop comes first
**Depends on:** [What counts as a good twig](https://github.com/xolace-official/xolace_app/issues/544). Nothing to count without it.

---

## P3 — Connect list: rows lag on foreground until the re-warm query returns

**What:** After a background/foreground cycle, `useChatWarmup` re-runs `queryChannels` on `connection.changed { online }` (the SDK's `ChannelList` does this internally; we own the list, see CONTEXT.md "The Connect list is Convex-owned"). Row unread badges and thread messages received while backgrounded appear only once handshake + that round trip complete — correct, but a visible beat late.

**How to fix (two cheap, independent wins):**
1. Re-dispatch `channels.queried` from `client.offlineDb.syncManager.onSyncStatusChange(true)` so rows re-read `countUnread()` from the local DB (the SDK's `/sync` replay lands there first) before the network query returns.
2. Drop `presence: true` on the re-warm call only (keep it on the mount-time call) — the reopened socket already carries presence, and the presence variant is the heavier query.

**Key files:** `src/features/xolacer-chat/use-chat-warmup.ts` (`warm`, the `connection.changed` listener), `src/features/xolacer-chat/use-conversation-unread-count.ts` (rows re-read on any client event)

**Verify:** background the app, send two messages from the other account, foreground → row badge and thread messages should land at or before the tab badge does.

**Effort:** S
**Priority:** P3 — cosmetic lag, data is correct
**Depends on:** Nothing

---

## P3 — Automated mid-conversation escalation detection (Listener Chat)

**What:** Detect a crisis-adjacent moment happening *inside* a live Stream conversation
between a user and a listener, not just at Xolace session boundaries (see the Listener Chat
design doc, `nathan-chore-listener-chat-design-design-20260724-054614.md`).

**Why:** Deferred during `/plan-eng-review` (Issue 4). Xolace's `escalation_events` signal only
fires from the AI-processed session pipeline — a live Stream chat never touches that pipeline,
so there's no existing signal to key off. v1 relies on ambassadors being trained to recognize
concerning conversations themselves and point the user back to Xolace's existing crisis-resource
path, same as any human-to-human conversation would require. This is judged sufficient for a
small, personally-vetted cohort (see the original Listener Suggestion design's Premise #2), but
should be revisited if the listener cohort grows past that scale.

**How to start:** Would require a Stream webhook on new messages, piping message content through
`convex/ai/safeguard.ts` (or a lighter-weight classifier) per message — a genuinely new AI-call
surface, real-time cost, and worth weighing against the Cognition Layer Constitution ("no feature
may call an LLM to re-derive something the Understanding already knows" — arguably justified here
since chat content is new signal the Understanding never sees, but that argument should be made
explicitly when this is picked up, not assumed).

**Key files:** `convex/ai/safeguard.ts`, `convex/integrations/stream.ts` (once it exists),
whatever webhook/channel-event handler the Listener Chat build adds.

**Effort:** M-L — new webhook surface, new classification call, real-time latency/cost tradeoffs.

**Priority:** P3 — no urgency at current ambassador-cohort scale.

**Depends on:** Listener Chat (Approach B, Stream-based) shipping first.

---

## P3 — Ambassador self-service pause toggle (Listener Suggestion feature)

**What:** Let each of the 6 ambassadors flip their own `active: false` flag on the
`ambassadors` table (see the Listener Suggestion design doc,
`~/.gstack/projects/xolace-official-xolace_app/nathan-chore-channels-research-design-20260718-165134.md`)
instead of the founder hand-editing the row when someone needs a break.

**Why:** Deferred during `/plan-ceo-review`'s SELECTIVE EXPANSION cherry-pick pass. At 6
ambassadors the founder personally trains and talks to, hand-editing one DB row when someone
messages "I need a break" costs one query — real ROI on self-service only arrives if the
ambassador cohort grows well past a handful. (A convex-flags-based approach was considered
during review and rejected as scope creep — a plain `active: boolean` field is the v1
mechanism; this TODO stays a genuine UI/access gap, not a data-layer one.)

**How to start:** A minimal auth-gated (or obscure-link) toggle scoped only to the 6
ambassador accounts — needs its own light identification mechanism since ambassadors are not
Xolace users in the schema (see the design doc's Open Questions on whether ambassadors ever
become real Xolace accounts).

**Key files:** `convex/schema.ts` (`ambassadors` table, once it exists), the Listener
Suggestion design doc referenced above.

**Effort:** S — small toggle, but genuinely new surface area (identification/light auth for
non-user actors), not just a UI change.

**Priority:** P3 — no urgency at current cohort size.

**Depends on:** Listener Suggestion pilot (Approach A) shipping first; only relevant once the
`ambassadors` table exists.

---

## P2 — WhatsApp as second delivery channel for Trusted Contact Notify

**What:** Once the SMS-only Trusted Contact Notify feature (see
`~/.gstack/projects/xolace-official-xolace_app/ceo-plans/2026-07-18-trusted-contact-notify.md`)
ships and has 2+ weeks of real accept-rate / confirm-tap data, add a per-contact channel
preference so the check-in message can go via WhatsApp Cloud API instead of Twilio SMS.

**Why:** WhatsApp gets roughly 4x SMS open rates (`docs/feat-analysis.md`), which matters
for a message whose entire value depends on being seen promptly. Deferred rather than built
alongside SMS because sequencing risk favors validating the mechanism (does a real contact
accept, does the confirm-tap flow work, does the message land right) on one channel before
adding a second provider's integration surface.

**How to start:** Add a `preferredChannel: "sms" | "whatsapp"` field to `trustedContacts`.
Wire the WhatsApp Cloud API component (`convex-whatsapp`, already scoped in
`docs/feat-analysis.md`) as a second outbound (and inbound, for accept/opt-out) provider
alongside the Twilio SMS integration built for the base feature. Reuse the same
`escalation_events`-triggered send logic — only the delivery provider branches on
`preferredChannel`.

**Key files:** `convex/schema.ts` (`trustedContacts`), new `convex/trustedContactNotify.ts`
or wherever the base feature's Twilio wiring lands, `docs/feat-analysis.md` (WhatsApp
component reference)

**Effort:** M (CC ~30-40min) — second messaging provider integration plus per-contact
channel branching, both inbound and outbound

**Priority:** P2 — gated on SMS-only version shipping and validating first

**Depends on:** Trusted Contact Notify (Approach A, SMS-only) shipped + 2 weeks of
accept-rate/confirm-tap analytics

---

## P2 — Instrument follow-up push delivery before/alongside WhatsApp channel work

**What:** Add PostHog capture (and/or extend the `notification_log` table) for follow-up
push `delivered`/opened/tapped rates specifically, run for 1-2 weeks in parallel with
building the WhatsApp follow-up delivery channel (see design doc
`~/.gstack/projects/xolace-official-xolace_app/nathan-chore-channels-research-design-20260718-134117.md`).

**Why:** The WhatsApp-follow-up design's Premise #1 explicitly accepts an unconfirmed-demand
gap — no PostHog data exists on whether Xolace's follow-up push is actually underperforming;
the wedge is built on founder intuition + generic industry stats, not Xolace's own numbers.
This was surfaced as Approach C during the `/office-hours` session that produced the design
doc, and the founder chose Approach A (build WhatsApp directly) over it — but Approach C is
cheap enough to run in parallel rather than dropped entirely. Closing this gap in time gives
the next review (or a retro) a real number instead of a hunch, and doesn't block Approach A.

**How to start:** `convex/notifications.ts`'s `schedule` mutation already writes to
`notification_log` with a `delivered` boolean; extend it with an `opened`/`tapped` state
(client marks it on notification-tap deep link) and add a PostHog capture mirroring it,
scoped to `type: "follow_up"`.

**Key files:** `convex/notifications.ts` (`schedule`), `convex/followUps.ts`
(`sendFollowUpNudge`), client-side notification-tap handler (deep link entry point)

**Effort:** XS (human ~1-2h / CC ~15min)

**Priority:** P2 — parallel to WhatsApp follow-up delivery work, not blocking it

**Depends on:** Nothing — can start immediately, independent of the WhatsApp channel build

---

## P3 — Verified WhatsApp number ↔ Xolace user table (shared auth gate)

**What:** Build the WhatsApp number opt-in/verification table (already required for the
follow-up delivery feature, see `nathan-chore-channels-research-design-20260718-134117.md`)
as a standalone mapping — verified WhatsApp number ↔ Xolace user/profile — rather than a
field scoped only to the follow-up feature, so it can double as an identity gate for a
possible future ElevenLabs WhatsApp voice/text agent persona.

**Why:** WhatsApp Business numbers are publicly reachable by anyone — there's no
platform-level allowlist. If Xolace ever adds an ElevenLabs agent persona on WhatsApp
(raised as a "probably, not yet designed" idea, not current scope), it needs an app-side way
to distinguish a real, verified Xolace user from a random inbound number before handing over
any personal context or engaging in anything therapeutic-toned. ElevenLabs supports a
conversation-initiation webhook that receives the caller's WhatsApp ID before a conversation
starts — that webhook would look the number up against this same table to allow/deny and
personalize. Building the table once, generically, avoids redoing the verification flow
later for a second feature.

**How to start:** When `/plan-eng-review` designs the follow-up feature's WhatsApp
opt-in/verification table, shape it as a general `verifiedWhatsAppNumbers` (or similar)
mapping keyed by profile, not a field embedded only in follow-up-specific state. The
follow-up feature is the first consumer; an ElevenLabs conversation-initiation webhook would
be a second, later consumer of the same lookup.

**Key files:** wherever `/plan-eng-review` lands the follow-up feature's WhatsApp
verification schema (not yet decided — see that design doc's Open Questions)

**Effort:** No extra effort now — this is a shaping note for how the follow-up feature's
existing verification table gets designed, not new work. Effort attaches to the (not yet
real) ElevenLabs integration later: webhook + lookup, S.

**Priority:** P3 — speculative; the ElevenLabs idea is not yet scoped or designed

**Depends on:** Follow-up WhatsApp delivery feature (Approach A) shipping first, since it's
the table's first real consumer

---

## P2 — Weekly emotional summary fan-out via WhatsApp

**What:** Send the existing Workflow+RAG weekly emotional summary pipeline's output over
WhatsApp instead of, or alongside, the current in-app/push delivery.

**Why:** This is a re-engagement lever, not a proactive-support-to-third-parties feature —
distinct problem from Trusted Contact Notify. WhatsApp's higher open rate makes it a
plausible upgrade for content the user has already opted into receiving (a Sunday-morning
digest is more likely read in a messaging app already open than a push notification that
gets swiped away). Deferred because it needs its own design pass, not because the idea is
weak — bundling it into the trusted-contact plan would conflate two different products
(reaching the user vs. reaching someone else).

**How to start:** Once the WhatsApp Cloud API component is installed (see the P2 item
above, or independently if that lands first), wire the existing weekly summary generation
job to fan out a WhatsApp message alongside its current delivery path, gated by a user
opt-in toggle (do not default this on — matches the existing notification consent pattern
in `convex/lib/notificationPrefs.ts`).

**Key files:** whichever job currently generates/delivers the weekly summary (locate via
the Workflow+RAG pipeline references in `convex/jobs/` or `convex/ai/`),
`convex/lib/notificationPrefs.ts` (consent pattern to follow), `docs/feat-analysis.md`
(WhatsApp component reference)

**Effort:** M (CC ~30-40min) — WhatsApp Cloud API integration (if not already installed by
the sibling P2 item above) plus weekly cron wiring to the existing summary content

**Priority:** P2 — real idea, needs its own design pass before scoping further

**Depends on:** WhatsApp Cloud API component installed (shared dependency with the sibling
P2 item above — install once, use for both if both are picked up together)

---

## P3 — Telegram bot as low-friction, no-identity-anchor front door

**What:** A Telegram bot entry point ("message the bot with whatever's here, get one line
back") as an alternative onboarding surface, using inline keyboards for the texture-word
tap targets (heavy/tight/foggy/buzzing/empty/scattered/numb/raw) instead of free text only.

**Why:** Per `docs/feat-analysis.md`'s privacy comparison, a Telegram bot only ever receives
a platform-scoped numeric `user_id`/`chat_id` — never a phone number unless the user
explicitly shares a contact card, which a well-designed flow never asks for. That's a
materially better privacy story than the SMS/WhatsApp front-door ideas in the same doc, for
the segment of the target audience already on Telegram (skews privacy-conscious and
international). This is an acquisition/onboarding bet, structurally different from Trusted
Contact Notify (reaching a third party) or the WhatsApp re-engagement idea above (reaching
an existing user) — it's about lowering the barrier for someone who hasn't started with
Xolace at all.

**How to start:** Do not scope implementation yet — this needs its own `/office-hours`
session to establish real demand evidence (is there actually a Telegram-native segment of
the target audience, and what's the smallest testable version) before committing to bot
infrastructure. When ready: `convex-telegram` component (`docs/feat-analysis.md` has the
link), inbound webhook (`registerRoutes`) keyed by update type, `bot.api.*` client for
outbound.

**Key files:** none yet — greenfield within this repo; `docs/feat-analysis.md` for the
component reference and privacy comparison

**Effort:** L (CC ~1-1.5h once scoped) — new bot infra, webhook registration, inline-keyboard
UI mapping to the existing texture-word set, entirely separate from the Twilio/WhatsApp
integrations above

**Priority:** P3 — needs its own demand-validation session before further scoping

**Depends on:** Nothing technically, but should not be built before a dedicated
`/office-hours` session validates demand

---

## P2 — Clarify feedback sheet: `mirrorFeedbackShown` ref never resets

**What:** The "What didn't land?" sheet can only ever appear **once per `ReflectScreen` mount**. `mirrorFeedbackShown` is a `useRef(false)` that is set to `true` the first time the user taps "Not quite" and is never cleared — not on `handleReset`, not on a new session, not on the give-up path.

**Why it matters (two distinct losses):**
1. **Second session in the same mount gets nothing.** After a session completes, the user taps "Have more? I'm here." → `handleReset` → a fresh session in the *same* mount. Rejecting that session's mirror silently shows no sheet. We collect `mirror_miss` feedback only from a user's first rejection after a cold app launch, which quietly biases the dataset toward first-session mirrors.
2. **The MAX_TURNS give-up path burns the ref without ever showing the sheet.** `handleNotQuiteWithFeedback` sets `mirrorFeedbackShown.current = true` and arms the sheet *before* calling `handleNotQuite()`. When `turnsCount >= MAX_TURNS`, `handleNotQuite` dispatches to `gave-up` rather than `clarify` — so the derived `mirrorFeedbackOpen` (which requires `current === "clarify"`) never becomes true, the disarm guard clears the armed state, and the ref stays burned. The user is then never asked again in that mount.

**Why the ref exists at all:** to show the sheet at most once per session so a user rejecting both turns isn't surveyed twice. That intent is right; the scope (mount) is wrong — it should be per *session*.

**How to fix:** Key the once-only latch on the session rather than the mount. Options, in order of preference:
1. Replace the ref with state holding the `sessionId` the sheet has already been shown for (`shownForSession: Id<"sessions"> | null`), and gate on `shownForSession !== sessionId`. Resets naturally on every new session, no cleanup path to forget. Prefer this — the reset is derived, not remembered.
2. Failing that, clear the ref wherever a session ends (`handleReset` and any other reset path) — but this is the fragile shape: every future reset path must remember to clear it.

Also move the latch-burning **after** the MAX_TURNS branch decision, or only burn it when the sheet actually opens (e.g. set it in the same derived condition that opens the sheet), so the give-up path can't consume a showing that never happened.

**Note:** the sheet is only armed by "Not quite" — "Say more" deliberately does not arm it (elaboration is not a rejection; see `docs/feedback-tray-plan.md` §15).

**Key files:** `src/features/reflect/components/reflect-screen.tsx` (`mirrorFeedbackShown`, `mirrorFeedbackTurn`, `handleNotQuiteWithFeedback`, the `mirrorFeedbackOpen` derivation and the disarm guard), `src/features/reflect/hooks/use-reflection-machine.ts` (`handleNotQuite` MAX_TURNS branch, `handleReset`)

**Verify:** complete a session, tap "Have more? I'm here." (no app restart), reject the new mirror → the sheet must appear. Separately, reject twice to exhaust MAX_TURNS → land on `gave-up` → start a new session → the sheet must still be available.

**Effort:** S (CC ~20min incl. emulator verification)
**Priority:** P2 — silent feedback loss, biases the `mirror_miss` dataset
**Depends on:** Nothing

---

## P1 — `dailyQuotes.coldStart` fan-out (security audit H2, second half)

**What:** `coldStart` schedules `jobs.quotesGenerator.processUser` without an idempotency check of its own. The check (`getProfileStatus` → `alreadyDone`) lives *inside* the scheduled job and keys on a curated quote already existing for today — which is false for everyone until the first quote lands. So N concurrent `coldStart` calls fan out N jobs, and each one reaches `distillQuoteForUser`: a real Anthropic call per job, for every Plus user.

**Why:** Second half of finding H2 in the Convex security audit (the `requestBridgeDraft` half is fixed). The client's `coldStartIssuedRef` guard in `quotes-screen.tsx` is per-mount, so background/foreground, a remount, or a second device re-fires it. Unmetered LLM spend on a public action.

**How to fix — a lease, not a rate limit.** A rate limiter would bound damage (e.g. 3/day) but still permit 3 concurrent LLM calls, and would dead-end the screen's retry button after a genuine failure.

1. Add `quotesColdStartAt: v.optional(v.number())` to `emotional_profiles` in `convex/schema.ts`.
2. New `internalMutation` `claimColdStart` in `convex/dailyQuotes.ts`: `requireAuth`, then in one transaction — return early if a quote already exists for today; return early if `quotesColdStartAt` is within a 5-minute lease window (job in flight); otherwise patch the timestamp and `ctx.scheduler.runAfter(0, processUser)`.
3. `coldStart` **stays an `action`** and becomes a one-line `ctx.runMutation(internal.dailyQuotes.claimColdStart)`.

Convex mutations are serializable: two concurrent claims reading and writing the same profile doc conflict on OCC, so one retries and observes the lease. The 5-minute lease therefore guarantees at most one *in-flight* job per lease window — not exactly one job per user per day. Once a curated quote is stored for the day, `alreadyDone` short-circuits every later run; but a slow or failed job that never stores a quote leaves the lease to expire, after which a subsequent `coldStart` can legitimately retry.

**Two constraints worth not rediscovering:**
- Keep `coldStart` an action. The shipped client calls it via `useAction`; changing its kind to a mutation breaks every build in the store (store-gap rule). Thin-wrapper is the safe shape.
- The 5-minute expiry is what preserves the retry button. A plain "already claimed today" flag would silently no-op `quotes-screen.tsx`'s retry and strand the user with no quotes until UTC midnight.

**Also:** `getMyProfile` and `hasQuotesForToday` become dead once this lands (`claimColdStart` does its own `requireAuth` and inlines the quote check). Both are `internalQuery`, unreachable from clients, so they can be deleted outright.

**Not fixed by this:** if the session-quote distill succeeds but the curated store fails, `alreadyDone` stays false and a later run re-distills. Pre-existing; the lease bounds it to one retry per 5 minutes rather than unbounded.

**Key files:** `convex/dailyQuotes.ts` (`coldStart`, `getMyProfile`, `hasQuotesForToday`), `convex/schema.ts` (`emotional_profiles`), `convex/jobs/quotesGenerator.ts` (`processUser`, `getProfileStatus`), `src/features/quotes/components/screen/quotes-screen.tsx` (retry path — verify unchanged)

**Effort:** S (CC ~20min)
**Priority:** P1 — open LLM spend on a public action
**Depends on:** Nothing

---

## P3 — Dedicated "See all check-ins" screen

**What:** A full-list screen for follow-up check-ins, reached via a "See all check-ins" row on the profile. The profile's Follow-Ups section is now capped at the 5 most recent (`PROFILE_FOLLOWUP_LIMIT` in `convex/followUps.ts`) so it can't grow unbounded; the rest of the history needs a home.

**Why:** Before the cap, `FollowUpsSection` rendered up to 50 mixed-status cards inline, so the profile became very long and repetitive once check-ins accumulated. Capping fixed the bloat but truncates history — older/resolved check-ins are no longer reachable.

**How to start:**
1. Add a route under `src/app/(protected)/` (e.g. `check-ins/index.tsx`) — thin wrapper rendering a feature screen per the route-screen-separation convention.
2. `listForProfile` already takes an optional `limit`; the screen can pass a larger value or switch it to `usePaginatedQuery` for the full list.
3. Add a "See all check-ins" row at the bottom of `FollowUpsSection` (only when `cards.length === PROFILE_FOLLOWUP_LIMIT`) that routes to the new screen.

**Key files:** `convex/followUps.ts` (`listForProfile`), `src/features/profile/components/follow-ups-section.tsx`, new `src/features/profile/components/screens/`

**Effort:** S–M (CC ~25min)
**Priority:** P3 — only matters once users have >5 check-ins worth revisiting

---

## P3 — Pre-seed the vent session with prior card context

**What:** When a user taps "Let it out" on a follow-up check-in card, open the new reflect session **pre-seeded** with the prior session's theme (e.g. "Picking up what you left with about your mother…") instead of a blank session.

**Why:** Surfaced during the follow-up-system design review (Issue 2b). The vent chip (task D3) ships opening a *blank* reflect session this sprint — the user re-explains context they already processed minutes/days ago. Pre-seeding makes the doorway feel continuous, but it pulls in the deferred "tap card response → open reflect with pre-seeded context" item, so it was held back from v1.

**How to start:**
1. The `follow_up_cards` row already carries `sessionId` + the source theme; thread it into the reflect session `initiate` path as an optional seed.
2. Gate the in-app copy/UX so the seed reads as a gentle continuation, not a re-litigation.
3. Decide whether to build only after seeing real "vent"-tap rates from D3 (recommended — don't pre-build continuity nobody uses).

**Key files:** `convex/followUps.ts`, `convex/sessions.ts` (initiate), `src/features/reflect/`

**Effort:** M (human ~2h / CC ~25min)
**Priority:** P3 — fast-follow after D3, gated on vent-tap usage
**Depends on:** D3 (vent chip shipped)

---

## P3 — Extract shared notification-gating helper

**What:** Extract a `shouldDeliverNotification(prefs, type)` helper and refactor `checkGentleReturn` and `checkPatternNudge` to use it.

**Why:** Both triggers inline the same enabled + per-type toggle + quiet-window gate (`convex/jobs/notificationTriggers.ts:72-83` and `:148-159`). Two literal copies that drift the day someone edits one and not the other. Surfaced during the follow-up-system eng review; follow-up itself does NOT add a third copy (its nudge is gated by `notifications.enabled` only, by deliberate early-stage choice), so this is pure debt paydown, not blocking.

**How to start:**
1. Add `shouldDeliverNotification(prefs, type): { ok: boolean; suppressedReason?: string }` to `convex/lib/notificationPrefs.ts` — encapsulate `notifications.enabled`, the per-type toggle lookup, and `isInQuietWindow(...)`.
2. Refactor `checkGentleReturn` and `checkPatternNudge` to call it.
3. Verify existing notification behavior is unchanged (no eval/test harness for these today — manual check against current gating).

**Key files:** `convex/jobs/notificationTriggers.ts`, `convex/lib/notificationPrefs.ts`

**Effort:** S (human ~45min / CC ~10min)
**Priority:** P3 — cleanup, not blocking
**Depends on:** —

---

## P3 — Follow-up card-writer quality eval

**What:** Add `cardWriter.eval.ts` — an LLM-judge rubric eval for the `followUpCardWriter` prompt (scores specificity, warmth, non-generic 1-5).

**Why:** The follow-up system ships a classifier-flag eval (`requiresFollowUp.eval.ts`) this sprint, but the card-writer prompt — whose whole job is "never generic, references the actual content" — gets manual review only. A prompt edit that drifts the card generic would go uncaught. Deferred deliberately: build it after the first feedback round, once real card output exists to calibrate the rubric bar against.

**What to include:**
1. Rubric judge (Haiku) scoring each generated card on: references the actual processed content, warm tone, not generic, ≤2 sentences.
2. Cases must cover the `gave_up` branch (mirror-free copy — no resonant mirror to reference) and the `FALLBACK_FOLLOWUP_CARD` static path.
3. Run via `bun test` alongside `requiresFollowUp.eval.ts`.

**Key files:** `convex/ai/prompts/followUpCardWriter.ts`, `convex/ai/prompts/__evals__/cardWriter.eval.ts` (new)

**Effort:** M (human ~half day / CC ~30min)
**Priority:** P3 — fast-follow after first feedback round
**Depends on:** follow-up system shipped + real card output to calibrate against

---

## P3 — Awareness Events: E2E Test Coverage

**What:** Add E2E tests for the 3 critical awareness event flows once a mobile test framework is chosen (Detox or Maestro).

**Why:** These are the 3 flows where a silent regression causes real user harm: event re-showing after dismiss (notification fatigue), wrong event shown (priority ordering bug), or event never shown (date filter bug). Unit tests can't cover these because they span Convex → Zustand → React Native component lifecycle.

**Flows to cover:**
1. **Single show:** Event appears on first app open during the date range; not shown again after dismiss + force-quit + reopen.
2. **Priority ordering:** Two events active in the same month — highest priority (lowest number) shows first; second shows after first is dismissed.
3. **Date boundary:** Event with `startDate: today` shows today; event with `endDate: yesterday` does not show.

**How to start:**
1. Choose a framework: Detox (full native), Maestro (simpler YAML-based), or wait for team consensus.
2. Seed `monthlyEvents` table with test fixtures in Convex test environment.
3. Write each flow as an E2E script covering: app launch → sheet appears → dismiss → force-quit → relaunch → sheet absent.
4. Add to CI.

**Key files:** `src/features/awareness-events/` (the full feature dir), `src/app/(protected)/index.tsx` (wiring point)

**Effort:** M (human ~1 day once framework chosen / CC ~1h)
**Priority:** P3 — gated on test framework selection
**Depends on:** `feat(🎪)/setup-event-showing` shipped + mobile test framework chosen

---

## P3 — Awareness Events: Team Content Guide

**What:** Create a one-page content guide (Notion or Google Doc) for anyone creating events via the Convex dashboard. Cover: image dimensions, copy framing rules, slug conventions, and CTA route options.

**Why:** The card's visual quality depends entirely on what the team uploads. Without a guide: the first person to create an event will choose an arbitrary image size (breaking the 180px fixed container if the CDN doesn't resize), write imperative marketing copy ("This month, join us in recognizing..."), and pick an arbitrary slug that can never be renamed post-publish. One bad first event sets a template for all future events.

**What to include:**
1. **Images:** 686×360px (2x for 343px card width × 180px height), JPG or WebP, ≤200KB. Upload via any image host, paste URL into `imageUrl` field.
2. **Copy framing:** Acknowledgment sentence first ("If you've been carrying something heavy this month, you're not alone."), context second (what the month is about), CTA optional ("Support resources are here when you're ready."). No imperative framing. No emoji.
3. **Slug:** kebab-case, permanent, descriptive ("mens-mental-health-2026", "world-mh-day"). Never rename after publish.
4. **CTA routes:** currently only `/(protected)/crisis-resources` is allowlisted. Contact eng to add new routes.
5. **Kill-switch:** set `endDate` to yesterday to immediately pull a live event.

**Effort:** XS (human ~1h to write / no CC work)
**Priority:** P3 — create before the first event is added to the dashboard
**Depends on:** `feat(🎪)/setup-event-showing` shipped

---

## P2 — Awareness Events: Recurring Event Support

**What:** Add `recurrence: v.optional(v.literal('annual'))` to the `monthlyEvents` Convex schema. Annual events match any year — the client filter checks `month/day` instead of the full ISO date. One dashboard entry covers all future occurrences.

**Why:** World Mental Health Day (October 10), Suicide Prevention Month (September), and Men's Mental Health Month (June) repeat every year. Without recurrence, someone must manually re-add each event every year — and if they forget, users get nothing. The risk is silent omission of crisis-adjacent content in high-need months.

**How to start:**
1. Add `recurrence: v.optional(v.literal('annual'))` to `convex/schema.ts` `monthlyEvents` table.
2. In the client-side `getActive` filter (`MonthlyEventSheet` hook): if `event.recurrence === 'annual'`, compare only `month/day` of `startDate`/`endDate` against today (ignore year). Otherwise compare full ISO date as before.
3. Update `seenEventIds` pruning: annual events use slug-only tracking (not year-scoped) — a user who dismissed "world-mental-health-day" in 2026 should see it again in 2027. Store seen entries as `{ slug, seenAt }` and prune entries older than 13 months (already the plan — annual events naturally re-appear after the 13-month prune window).

**Key files:** `convex/schema.ts` (add field), `src/features/awareness-events/hooks/use-awareness-event.ts` (update filter logic)

**Effort:** S (human ~2h / CC ~15min)
**Priority:** P2 — gate: add before scheduling World Mental Health Day (October 10)
**Depends on:** `feat(🎪)/setup-event-showing` shipped

---

## P3 — Texture Word Sets v2: Auto-Suggest Active Set from Prior Session Tone

**What:** When the user opens the app, automatically suggest (or pre-select) the most contextually appropriate word set based on prior session signals: last session's mirror tone (heavy → Flat, grief-adjacent → Tender, hopeful → Bright, anxious → Charged), time of day (Night Mode already does this), and/or session frequency pattern.

**Why:** The v1 tab switcher requires the user to consciously classify their emotional state before they see any words — which is friction at exactly the moment when they're most overwhelmed. The 12-month ideal is that the right words surface automatically, like Night Mode does for 3am sessions. v1 validates that multiple word sets have value; v2 closes the gap by removing the selection step.

**Gate:** Only pursue v2 if `texture_set_changed` PostHog data shows meaningful switching behavior within 2-3 weeks of v1 shipping. If 80%+ of sessions stay on Flat, the sets may need retuning before investing in routing logic.

**How to start:**
1. Read 2-3 weeks of `texture_set_changed` data from PostHog.
2. If switching is meaningful: map the `toneUsed` field from `sessions` table (already populated) to a `TextureSetId` suggestion function: `suggestSetFromTone(toneUsed: string): TextureSetId`.
3. On idle screen mount, if `textureSetId === 'flat'` (user hasn't expressed a manual preference), apply the suggestion as the initial `pendingSetId` — no Zustand write, just pre-selects the tab visually.
4. If the user taps a different tab, their explicit choice wins and is persisted.

**Key files:** `src/features/reflect/texture-sets.ts` (add `suggestSetFromTone`), `src/features/reflect/components/states/idle-state.tsx` (apply suggestion on mount), `convex/sessions.ts` (`toneUsed` field already there)

**Effort:** S (human: ~4h / CC: ~30min once data validates the approach)
**Priority:** P3 — gated on v1 analytics data
**Depends on:** v1 texture word sets shipped + 2-3 weeks of `texture_set_changed` data from PostHog

---

## P2 — Session End: Looping Mascot Video on Acknowledge Phase

**What:** Replace the current empty acknowledge phase in `activity-variant.tsx` (and `exit-variant.tsx`) with a short looping mascot video (5–10s, muted, autoplay) in the Calm-app style — video fills the upper ~55% of the screen edge-to-edge, a `LinearGradient` fades its bottom edge into the background color, and the text sits below in the remaining space.

**Why:** The acknowledge phase is currently a dead black screen with text pinned at the bottom — emotionally flat for the highest-warmth moment in the app. A looping animated mascot (sitting quietly, contemplative, gentle ambient motion) reinforces the "digital campfire" metaphor — the mascot is literally sitting with the user. Reference: Calm app's homepage looping landscape video. This was deferred because `expo-video` would require a native rebuild and we needed to ship OTA.

**Design notes:**
- Mascot posture: seated/still, subtle idle breathing or ambient particle, contemplative — NOT smiling or waving. Grounded presence.
- **Two assets: `mascot-acknowledge-dark.mp4` + `mascot-acknowledge-light.mp4`** — transparent video is not cross-platform safe: iOS doesn't support WEBM (the only alpha-capable format on Android), and HEVC-with-alpha (iOS 13+ only) has inconsistent expo-video support. Since every Xolace theme is either a light or dark variant (quiet-light/dark, reverie-light/dark, etc.), two MP4s cover all themes with zero platform complexity. Pick at runtime: `themeName.endsWith('-light') || themeName === 'light'`.
- Dark video: mascot on near-black background matching default dark `--background`. Light video: mascot on near-white background matching default light `--background`.
- Gradient: `['transparent', backgroundColor]` using `useThemeColor('background')` — fades the video edge into whatever exact shade the active theme uses, so minor tone differences between dark themes still blend cleanly.
- Video dimensions: 1080×1920 or 750×1334, keep each under ~2MB.
- Must loop cleanly (last frame matches first frame visually).

**How to start:**
1. Get animated mascot video asset from design (MP4, dark bg, 5–10s loop).
2. `bunx expo install expo-video` (requires native rebuild — NOT OTA safe, plan a store release).
3. In `activity-variant.tsx` acknowledge phase: replace `<View className="flex-1" />` placeholder with `<VideoView>` (full-width, `resizeMode="cover"`, autoPlay, loop, muted).
4. Overlay `<LinearGradient>` absolutely positioned over bottom 40% of the video: `colors={['transparent', backgroundColor]}`.
5. Move text below the video area, centered horizontally, left-aligned text (current style).
6. Mirror the same treatment in `exit-variant.tsx` acknowledge phase.

**Key files:** `src/features/session-end/components/activity-variant.tsx` (acknowledge phase, line ~117), `src/features/session-end/components/exit-variant.tsx` (acknowledge phase, line ~52)

**Effort:** S–M (CC ~30min once asset exists; native rebuild required)
**Priority:** P2 — blocked on (a) mascot video asset from design, (b) next store release window (native rebuild)
**Depends on:** Mascot animated video asset + store release (not OTA-safe due to `expo-video` install)

---

## P2 — Trusted Bridge: "Save without sending" (AsyncStorage, unsent letters)

**What:** When the user taps "Save without sending" on Screen 2 of the Trusted Bridge, persist the draft to `AsyncStorage` locally on-device instead of discarding it. Surface saved drafts as an "unsent letters" list — accessible from the timeline or a dedicated entry point.

**Why:** Stage 1 of the Bridge (branch: `chore-trusted-human-bridge`) ships "Save without sending" as a dismiss-only action (no persistence) to keep Stage 1 minimal for demand validation. If Stage 1 data shows high save-button usage (or qualitative signals that users wanted to revisit drafts), the AsyncStorage architecture belongs in Stage 2. The therapeutic value of an unsent-letters collection is standalone — separate from whether the user eventually sends the message.

**How to start:** After Stage 1 ships and data validates: add `AsyncStorage.setItem` in the "Save without sending" handler in `TrustedBridgeScreen`. Key format: `trusted_bridge_drafts` → JSON array of `{ id, mirrorText, draft, recipientName, recipientRelationship, savedAt }`. Build a minimal "Unsent letters" view in `src/features/trusted-bridge/`. No Convex writes — this is intentionally device-local per the privacy constraint in the design doc.

**Key files:** `src/features/trusted-bridge/components/screen/trusted-bridge-screen.tsx` (save handler), `src/features/trusted-bridge/components/unsent-letters/` (new), `src/app/(protected)/trusted-bridge-saved.tsx` (new route, optional)

**Effort:** M (human ~1 day / CC ~45min)
**Priority:** P2 — gated on Stage 1 validation. Do NOT build until bridge_saved/bridge_shared rates from Stage 1 confirm demand.
**Depends on:** `chore-trusted-human-bridge` Stage 1 shipped + 2 weeks of analytics data (bridge_dismissed { step: "draft" } rate as proxy for save-intent)

---

## P2 — Feedback Analytics Dashboard

**What:** Build a PostHog dashboard tracking gave_up rate (gave_up events / total sessions), mirror_miss rate (mirror_miss events / clarification attempts), and top selectedOption distributions for gave_up and mood_heavier.

**Why:** The feedback mechanism PR (feat(feedback-mechanism)) collects the data but has no consumer. Without a dashboard, feedback is noise. The gave_up rate is your primary AI quality metric — it tells you whether model improvements are actually reducing failure.

**How to start:** PostHog → Insights → create Trend chart for `feedback_submitted` filtered by `type = gave_up`. Divide by total `session_completed` events. ~15 minutes of PostHog config.

**Effort:** S (PostHog UI only, no code)
**Priority:** P2
**Depends on:** feedback mechanism PR shipping + ~2 weeks of data collection before the chart is meaningful.

---

## ✅ P2 — App Store Review Prompt (lighter mood trigger)

**What:** Call `StoreReview.requestReviewAsync()` from `expo-store-review` when a user selects "lighter" at session end. The OS enforces a 30-day throttle automatically.

**Why:** "Lighter" is the highest-trust, most grateful moment in the app. Users who feel better after a session are the most likely to leave a genuine positive review. The `activity-variant.tsx` file will already be touched by the feedback mechanism PR — adding this is 5 lines.

**How to start:** `npx expo install expo-store-review`. In `activity-variant.tsx`, after `selectedMood === 'lighter'` selection: `StoreReview.isAvailableAsync().then(ok => ok && StoreReview.requestReviewAsync())`. Wrap in a try/catch. Test on device (simulator won't show the dialog).

**Effort:** S (human ~2h / CC ~10min)
**Priority:** P2
**Depends on:** feedback mechanism PR (activity-variant.tsx already touched)

---

## P2 — Deep link escalation state → crisis-resources screen

**What:** When the AI-triggered escalation state's "Yes, show me some resources" button is tapped, navigate to the standalone `crisis-resources` route instead of (or in addition to) showing the inline resource list. This unifies all crisis resource access through one screen.

**Why:** After `feat(crisis-resourses-ui)` ships, there will be two places resources are shown: the in-session escalation state (inline) and the new crisis-resources screen (richer, country-aware, with emergency call button). The inline list will become a worse experience over time as the crisis screen grows. Deferred because touching the reflect state machine mid-session navigation is risky and was explicitly out of scope for the crisis screen MVP.

**How to start:** In `escalation-state.tsx`, replace the inline `resources` section with a `router.push('/crisis-resources')` call when "Yes, show me some resources" is tapped. Audit whether the session state machine in `use-reflection-machine.ts` needs to handle mid-session navigation (it likely needs to call `onDismiss()` before pushing). Test the full reflect → escalation → crisis screen → back → session continues flow.

**Key files:** `src/features/reflect/components/states/escalation-state.tsx` (line 131 — the "Yes, show me resources" Pressable), `src/features/reflect/hooks/use-reflection-machine.ts`, `src/app/(protected)/crisis-resources/` (`_layout.tsx` + `index.tsx`)

**Effort:** M (human ~4h / CC ~30min)
**Priority:** P2
**Depends on:** `feat(crisis-resourses-ui)` shipped

---

## P3 — Adaptive Tone Learning (Mirror Tone Phase 2)

**What:** Make the "Adaptive" tone genuinely adaptive to the individual user over time, not just to their writing style in the current session. Track which tone users manually switch to and feed that signal back into the adaptive prompt so the mirror drifts toward their preferred register without them having to think about it.

**Why:** The current "Adaptive" tone reads the user's writing style within the session. But if a user consistently switches to "Witnessed" after their first few sessions, the adaptive mode should pick that up. This closes the loop between explicit tone preference and the default experience. Deferred because it requires storing per-session tone signals and deciding the averaging/drift algorithm — a design problem that needs more usage data from the new "Witnessed" tone first.

**How to start:** After `feat(mirror-tone-witnessed)` has shipped and you have 2-4 weeks of `tone_changed` PostHog data — look at the distribution. If >30% of users switch to "Witnessed", that's signal the default should shift. The technical implementation: store `toneUsed` on each session in Convex, then in `context.ts` (which builds the `patternSummary`) include the tone distribution, and update the "adaptive" prompt case in `getToneInstructions()` to accept a `preferredToneSignal` parameter.

**Key files:** `convex/sessions.ts` (add `toneUsed` field), `convex/ai/context.ts` (include tone signal in pattern summary), `convex/ai/prompts/articulator.ts` (adaptive case reads signal)

**Effort:** L (human ~1 week / CC ~2h)
**Priority:** P3 (data-dependent — needs usage data from Witnessed tone first)
**Depends on:** `feat(mirror-tone-witnessed)` shipped + 2-4 weeks of PostHog data on tone adoption

---

## P3 — Tone Shown in Session Timeline ✅

**What:** When users review past sessions in the timeline, show which mirror tone was active for that session. A small chip or label — "Witnessed", "Poetic" — next to the session entry or inside the session detail view.

**Why:** Closes the discoverability loop: tone is visible in settings, visible on the mirror screen (indicator badge), and visible in history. Users who want to understand why a session felt different can see the tone was different. Also useful for the team to correlate tone with session completion and mood outcomes.

**How to start:** Add `toneUsed: v.optional(v.string())` to the sessions table in `convex/schema.ts`. Write `toneUsed` when the session's mirror is generated (`convex/sessions.ts` or `convex/ai/process.ts`). Display in `src/features/timeline/` session list and `timeline/session/[id]` detail view.

**Key files:** `convex/schema.ts`, `convex/sessions.ts`, `convex/ai/process.ts`, `src/features/timeline/` (list + detail)

**Effort:** S (human ~3h / CC ~20min)
**Priority:** P3 (nice-to-have, low urgency)
**Depends on:** `feat(mirror-tone-witnessed)` shipped

---

## P2 — Mirror Reflection Sharing (acquisition growth loop)

**What:** Add a share button to the mirror state and session end screen. Generate a shareable deep link that shows the AI reflection to anyone — no account required to view. Recipients get a 3-session trial and are prompted to create an account after session 1.

**Why:** The highest-leverage acquisition action available. Users already share feelings on WhatsApp — giving them a way to share what Xolace said about their feeling brings a receiver directly into the product experience. One shared mirror is more convincing than any ad. Sequenced after quotes because quotes have proven WhatsApp demand now; mirror sharing has higher acquisition impact but larger build.

**How to start:** (a) Add a shareable URL/deep-link route (unauthenticated mirror view). (b) Implement a guest-session token system — receiver views shared reflection with no account. (c) After completing session 1 as guest, prompt to create account for remaining 2 trial sessions. (d) Add share button to mirror state and session-end screen in `src/features/reflect/components/states/`.

**Key files:** `src/features/reflect/components/states/mirror-state.tsx`, `src/app/(protected)/session-end/`, `convex/sessions.ts` (guest token), `src/app/share/[id].tsx` (new unauthenticated route)

**Effort:** L (human ~1 week / CC ~3h)
**Priority:** P2
**Depends on:** daily-quotes PR shipped (deliberate sequencing — quotes first)

---

## P3 — Home Screen Widget (WidgetKit + AppWidget)

**What:** iOS WidgetKit + Android AppWidget showing today's session-derived quote (or preference-curated fallback) on the home screen. The quotes PR writes the session-derived quote to an iOS shared app group container (`group.com.xolaceincorg.xolace`) as forward-compatibility — the widget reads from there without a network call.

**Why:** Home screen presence turns a passive install into a daily ambient touchpoint. Deferred because WidgetKit/AppWidget require native code (Swift/Kotlin) that can't be done in JavaScript — needs a custom native module or Expo config plugin. Right idea, wrong time to build relative to core quotes feature.

**How to start:** iOS: Add a Widget Extension target in Xcode reading from the shared app group container written by the quotes PR. Android: AppWidget reading from SharedPreferences. Both display quote text + Xolace logo + "Open app" tap target. The data layer is already in place from the quotes PR — only the widget UI shell needs building.

**Key files:** iOS: `ios/XolaceWidget/` (new WidgetKit extension). Android: `android/app/src/main/java/.../XolaceWidget.kt` (new AppWidget receiver). Data: written by `convex/jobs/quotesDistiller.ts` → iOS shared app group / Android SharedPreferences.

**Effort:** L (human ~1 week / CC: not applicable — requires native IDE build)
**Priority:** P3
**Depends on:** daily-quotes PR shipped (widget reads data written by that PR)

---

## P2 — Quotes Cron: Anthropic Cost Ceiling (add at 500+ MAU)

**What:** Add an env-var gate (`QUOTES_MAX_DAILY_CALLS`) to the nightly quotes cron. Before dispatching per-user Anthropic calls, check a counter. If the daily ceiling would be exceeded, stop scheduling session-derived generation for remaining users (preference-curated still runs — no AI cost). Log when ceiling is hit.

**Why:** The nightly cron makes 1 Anthropic call per active user with sessions in the last 7 days. At 75 users it's negligible. At 500-1,000 MAU, it becomes a predictable nightly cost. The Anthropic SDK's built-in retry behavior (`maxRetries: 4` in this project) could amplify failures. Without a ceiling, a spike in active users or a partial retry storm could 4x expected API spend overnight.

**How to start:** In `convex/jobs/quotesDistiller.ts`, before dispatching `generateForUser`: check a daily counter document in a `quoteCronStats` or `system` collection, increment per dispatch, short-circuit if over `parseInt(process.env.QUOTES_MAX_DAILY_CALLS ?? "9999")`. Reset counter at midnight in the same cron. Set `QUOTES_MAX_DAILY_CALLS` to a comfortable multiple of current active users.

**Effort:** S (human ~2h / CC ~15min)
**Priority:** P2 — not blocking at 75 users; activate before 500+ MAU
**Depends on:** daily-quotes PR shipped

---

## P2 — Notification Permission Refactor (contextual ask, not at sign-in) ✅

**What:** Move the notification permission request away from the immediate post-sign-in flow. Instead, ask for notification permission in two contextual moments: (1) after preference setup on the quotes screen ("Get your daily quote at the right time"), and (2) after a session completes ("Want a reminder the next time you need this?"). Remove the current sign-in-time ask.

**Why:** Asking for notification permission immediately at sign-in is a dark pattern — the user has no context for why the app would notify them. Cold-asks see 20-40% acceptance; contextual asks see 60-80%. The quotes feature introduces the first genuinely meaningful notification (daily quote at chosen time) — that's the right moment to ask.

**How to start:** Find the current notification permission call in the auth/onboarding flow. Remove it. The quotes preference setup flow (2-step mini-onboarding sheet) handles the new ask at step 2. Ensure the post-session notification ask (if implemented separately from quotes) uses `expo-notifications`' `requestPermissionsAsync()` only at those moments.

**Key files:** Auth/onboarding flow (find current permission ask), `src/features/quotes/components/preference-setup-sheet.tsx` (new, step 2), `src/app/(protected)/session-end/` (optional: post-session nudge)

**Effort:** S (human ~2h / CC ~15min)
**Priority:** P2
**Depends on:** daily-quotes PR shipped (preference setup flow is the primary new ask location)

---

## P3 — Reduce-motion support (crisis screen priority)

**What:** Honor the iOS/Android "reduce motion" accessibility setting on EaseView animations throughout the app. The crisis resources screen is the highest-priority candidate because it's the most emotionally loaded screen — animated entrances that feel calming at normal settings could feel overwhelming for a user who has reduce motion enabled.

**Why:** `AccessibilityInfo.isReduceMotionEnabled()` is a React Native API. EaseView animations can be conditionally disabled by checking this flag. The crisis screen's 500ms fade-in entrance animation is gentle but should still respect user preference.

**How to start:** `AccessibilityInfo.isReduceMotionEnabled()` → store in a context/hook. In `crisis-resources-screen.tsx`, pass `animate={{ opacity: reduceMotion ? 1 : ..., translateY: 0 }}` or `transition={{ duration: reduceMotion ? 0 : 500 }}` to EaseView. Then extend to other screens.

**Key files:** `src/features/crisis-resources/components/crisis-resources-screen.tsx` — the EaseView wrappers for the header block and resource items.

**Effort:** S per screen, M for app-wide adoption
**Priority:** P3 (accessibility debt, not blocking)
**Depends on:** `feat(crisis-resourses-ui)` shipped

---

## P3 — Tour: Tune inter-step delay

**What:** Tune `STEP_DELAY_MS` in `use-reflect-tour.ts` from 500ms to 200–300ms after shipping.

**Why:** 500ms inter-step delay (close previous popover, then open next) was copied from the HeroUI showcase. In practice, users who understand immediately must wait ~500ms per step. The close animation is ~150ms so 200–300ms is sufficient.

**How to start:** Change one constant in `src/features/reflect/hooks/use-reflect-tour.ts`. Test with rapid tapping on device to confirm no visual double-fire.

**Key files:** `src/features/reflect/hooks/use-reflect-tour.ts`

**Effort:** XS (1 line)
**Priority:** P3 — gate on post-ship feedback; ship at 500ms first
**Depends on:** Tour feature shipped

---

## P2 — Settings: Restructure into Per-Section Sub-Screens ✅

**What:** Break the single monolithic settings scroll into a root screen with ~6 navigation rows, each pushing to a dedicated sub-screen (Appearance, Mirror, Notifications, Privacy & Data, Account, Follow & Support).

**Why:** Profiling session (20260612-162522) confirmed the mount is ~96ms in production — 24 SettingsRows + 4 animated Switch components + 9 Dialog trees all initializing simultaneously (383 Views in one commit). The cost is structural. Restructuring drops the root screen mount to ~20ms; each sub-screen only loads when navigated to. Secondary benefit: dialogs become inline pickers on their sub-screens (ThemePickerDialog, MirrorTonePickerDialog, RetentionPickerDialog become inline RadioGroup lists) — removes 9 dialog trees from the initial render entirely. The `useSettings` hook splits per sub-screen so each only subscribes to the fields it needs.

**How to start:**
1. `settings/appearance.tsx` already exists — extend it with mode + color theme + reduced motion + replay intro.
2. Add `settings/mirror.tsx`, `settings/notifications.tsx`, `settings/data.tsx`, `settings/account.tsx`, `settings/follow.tsx`.
3. Slim `SettingsScreen.tsx` to ~6 navigation rows — no dialogs, no inline toggles.
4. Move each section's rows + dialogs into its sub-screen; convert picker dialogs to inline RadioGroup lists where practical.
5. Split `use-settings.ts` into per-sub-screen hooks. Convex deduplicates `useQuery(api.preferences.get)` calls automatically so no extra network cost.

**Key files:** `src/features/settings/components/screens/SettingsScreen.tsx`, `src/features/settings/hooks/use-settings.ts`, `src/app/(protected)/settings/_layout.tsx` (update per-screen header config), `src/app/(protected)/settings/appearance.tsx` (already exists, extend)

**Effort:** M (CC ~1h — mostly mechanical movement of existing components into new routes)
**Priority:** P2
**Depends on:** Nothing — standalone refactor

---

## P3 — Session End: Dedupe feedback submit orchestration into a shared hook

**What:** `use-heavier-feedback.ts` and `use-unsure-feedback.ts` duplicate nearly identical submit orchestration: `useMutation(api.feedback.submit)` + `posthog.capture("feedback_submitted", ...)` + success/error `toast.show` + `onClose()`. Extract the shared part into a **hook** (e.g. `useFeedbackSubmit`) that each feature hook composes.

**Why:** The two `handleSubmit` bodies are copy-paste with only the `type`, analytics payload, and success-toast copy differing. A code-review finding suggested a `feedbackService` for this, but a plain service won't work: all three operations are hook-bound (`useMutation`, `usePostHog`, `useToast`), and the project's service convention (`src/features/reflect/session-service.ts`) is pure functions only. A shared hook can legitimately own the three hook calls.

**How to start:**
1. Create `src/features/session-end/hooks/use-feedback-submit.ts` exposing `submit({ type, sessionId, selectedOption, text, analytics, successToast })` that runs the mutation, captures analytics, shows success/error toast, and calls `onClose` on success (returns success boolean).
2. Refactor `use-heavier-feedback.ts` and `use-unsure-feedback.ts` to keep only their UI state (intensity / selectedChip / text) and chip config, delegating `handleSubmit` to the shared hook.

**Key files:** `src/features/session-end/hooks/use-heavier-feedback.ts`, `src/features/session-end/components/use-unsure-feedback.ts` (note: heavier hook now lives under `hooks/`; unsure hook is still under `components/`)

**Effort:** S (CC ~20min)
**Priority:** P3 — cleanup, no user-facing change
**Depends on:** Nothing


---

## P3 — Awareness Events: Deterministic todayStr date formatting

**What:** `todayStr` in `use-awareness-event.ts` uses `today.toLocaleDateString('en-CA')` to produce `"YYYY-MM-DD"` for lexical `startDate`/`endDate` comparisons. Replace with a manual zero-padded build if it ever misbehaves: `` `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}` ``.

**Why:** `toLocaleDateString('en-CA')` relies on ICU/locale data being identical across runtimes (Hermes native vs web). It works today, so we're leaving it. The risk is an awareness event showing on the wrong day or not appearing in one environment if a runtime's locale data differs.

**How to start:**
1. In `src/features/awareness-events/hooks/use-awareness-event.ts` (~line 21), replace the `toLocaleDateString` line with the zero-padded template literal above.
2. Keep the `startDate <= todayStr && todayStr <= e.endDate` and `seenEventIds`/`slug` filters unchanged — they rely on lexical YYYY-MM-DD ordering.

**Key files:** `src/features/awareness-events/hooks/use-awareness-event.ts`

**Effort:** XS (CC ~5min)
**Priority:** P3 — gated on symptom; no change while current behavior is correct
**Depends on:** Nothing

---

## P3 — Streak Reveal: Misses after Xolace Bridge flow (single-shot measure race)

**What:** The streak-reveal animation does not play when the user returns home via the Trusted Bridge path (session-end → "bridge" → `trusted-bridge` → `router.replace("/")`). It plays correctly on every normal path (exit / solo / peers) and the dev "Replay streak reveal" button works fine — so the animation itself is not broken. Low priority: as long as users don't go through bridge, the reveal works.

**Why (root cause):** The reveal is armed by a single `setTimeout(700ms)` → `measure(miniRef)` in `streak-calendar.tsx`. If `measure` returns `null` (mini card not laid out yet), the worklet silently gives up — **there is no retry**, and the effect only re-runs if a dependency changes (`currentStreak`, `isFocused`, `lastAcknowledgedStreak`, `reducedMotion`).

In the normal flow, `useSessionEnd` does `await completePath()` then `router.replace("/")` immediately, so the reflect screen remounts while `getFullContext` still serves the cached streak `N`. The reactive query then ticks `N → N+1`, which **re-runs the effect after layout has settled** — masking the measure race.

In the bridge flow, `completeAndBridge` completes the session, then the user spends a long time in `trusted-bridge`. By the time bridge calls `router.replace("/")`, the streak query is long-settled at `N+1`, so the fresh reflect screen mounts with `revealPending` already true on first render. The effect runs **once**, the mini card isn't measurable yet (mid screen-enter after a deep nav replace), `measure` returns null → silent give-up. No dependency changes afterward → effect never re-runs → reveal is dead.

**How to start (fix options):**
1. Drive arming off the mini card's `onLayout` (measure when it reports a real frame) instead of a fixed `setTimeout`, **or**
2. retry `measure` in a bounded RAF loop until it returns non-null (~up to 1s), **or**
3. re-attempt whenever `revealPending && isFocused && !revealing` and the previous measure was null.

Verify on simulator by running a full session through the bridge path and confirming the reveal fires.

**Edge cases that also suppress the reveal (for reference):** `reducedMotion` on (intentional silent skip); StreakCalendar unmounted when variant isn't `active` / night mode / a quiet-return tier is active / not in idle state; `currentStreak <= lastAcknowledgedStreak`.

**Key files:** `src/features/reflect/components/streak-calendar/streak-calendar.tsx` (arming effect + `measure`), `src/features/reflect/components/streak-calendar/constants.ts` (`REVEAL_START_DELAY_MS`), `src/features/session-end/hooks/use-session-end.ts` (`completeAndBridge`)

**Effort:** S (CC ~30min incl. simulator verification)
**Priority:** P3 — not blocking; normal flow works, only the bridge path misses
**Depends on:** Nothing

---

## P3 — Vent acknowledgement: Episodic RAG context

**What:** Add top-K episodic memory retrieval (RAG over past reflections) as an input to the vent acknowledgement prompt, alongside the semantic profile it now reads.

**Why:** Deferred out of v1 of the vent → Memory-aware witness change. Retrieving specific past moments into a cathartic release pulls the acknowledgement toward specific content and off-tone — a vent is meant to feel traceless and in-the-moment, not cross-referenced. The semantic profile (who they are) is the right and only Memory input for v1; specific episodic content risks breaking the "stay in this moment" guard. Revisit only as an explicit, separate product decision.

**Key files:** `convex/vent.ts` (`runVentPipeline`), `convex/ai/ventAcknowledge.ts` (`buildVentAcknowledgePrompt`)

**Effort:** M (depends on existing episodic RAG infra maturity)
**Priority:** P3 — revisit only if semantic-profile attunement proves insufficient
**Depends on:** Nothing blocking; purely a "revisit if" item

---

## P3 — Vent acknowledgement: Entitlement/gating changes

**What:** Any change to how the vent cap or premium/entitlement gating interacts with the (now Memory-aware) vent acknowledgement pipeline.

**Why:** The semantic-profile read added to `runVentPipeline` is independent of the vent daily cap (`checkAndIncrementCap`) and any premium gate — it was deliberately left untouched in the vent → Memory-aware witness change. If entitlement changes are ever needed here, they should be scoped and decided separately rather than folded into the Memory-read work.

**Key files:** `convex/vent.ts` (`checkAndIncrementCap`, `processVentAudio`)

**Effort:** — (scope unknown until a concrete entitlement change is proposed)
**Priority:** P3 — no current driver; listed so it isn't silently bundled into future vent work
**Depends on:** Nothing blocking; purely a "revisit if" item

---

## P3 — Follow-up card: Episodic RAG context

**What:** Add top-K episodic memory retrieval (RAG over past reflections) as a third input to the follow-up card writer, alongside Understanding (`getUnderstanding`) and the semantic profile (Memory) it already uses.

**Why:** Deferred out of v1 of the follow-up card's Cognition Layer transition (Understanding hygiene + semantic-profile continuity line, gated off for acute tier). The confirmed mirror text is already the moment being followed up on, so top-K episodic retrieval adds little for a same-day/next-day check-in — this mirrors the same call made for the quotes-generator Cognition Layer transition. Revisit only if follow-up cards need to reference specific past sessions beyond what the semantic profile's rolled-up trajectory already captures.

**Key files:** `convex/followUps.ts` (`startFollowUpWorkflow`), `convex/ai/prompts/followUpCardWriter.ts` (`FollowUpCardContext`)

**Effort:** M (CC ~30min, depends on existing episodic RAG infra maturity)
**Priority:** P3 — revisit only if semantic-profile continuity proves insufficient
**Depends on:** Nothing blocking; purely a "revisit if" item

---

## P3 — Quotes generator: Episodic RAG context

**What:** Add top-K episodic memory retrieval (RAG over past reflections) as an input to the session-derived quotes generator, alongside the semantic profile (Memory) it already consumes.

**Why:** Deferred out of v1 of the quotes-generator Cognition Layer transition (semantic-profile-first with the 2-session `loadEmotionalContext` scan kept as cold-start fallback/provenance). There is no session query text at quote-generation time, so episodic retrieval would need a themes-derived search (deriving a query from the profile's recurring themes) rather than a natural query vector. The semantic profile already delivers most of the value, so this is low-priority. Mirrors the same call made for the follow-up card and notification transitions.

**Key files:** `convex/ai/quotesDistiller.ts` (`distillQuoteForUser`), `convex/semanticProfiles.ts`

**Effort:** M (CC ~30min, depends on existing episodic RAG infra maturity)
**Priority:** P3 — revisit only if semantic-profile themes prove insufficient
**Depends on:** Nothing blocking; purely a "revisit if" item

---

## P3 — Quotes generator: Profile-only quotes (no recent session)

**What:** Allow a session-derived quote to be generated purely from the semantic profile when the user has **no** recent completed session in the eligibility window, instead of skipping generation.

**Why:** v1 of the quotes Cognition Layer transition kept the existing eligibility gate (≥1 completed session within the window) so `sessionContextIds` provenance stays intact for the retention/wipe cascade. A profile-only quote has no source sessions to key on, so it would need a new `profileVersion` provenance field on the `daily_quotes` table (schema addition) to keep wipe-keying honest. Deferred to avoid the schema change and preserve current cadence.

**How to start:**
1. Add an optional `profileVersion` (or similar) provenance field to the `daily_quotes` table in `convex/schema.ts`, alongside the existing optional `sessionContextIds`.
2. Relax the eligibility gate in the quotes generator to also fire when a semantic profile exists but no recent session does, keying provenance on `profileVersion`.
3. Confirm the retention/wipe cascade handles profile-version-keyed rows correctly (no orphaned quotes after a session wipe).

**Key files:** `convex/schema.ts` (`daily_quotes`), `convex/ai/quotesDistiller.ts`, `convex/jobs/quotesGenerator.ts`

**Effort:** M (CC ~30min — schema + gate + wipe-cascade check)
**Priority:** P3 — only matters for users with a profile but sparse recent activity
**Depends on:** Nothing blocking; schema addition is additive/backward-compatible

---

## P3 — "Where you sit in the distribution" (deeper rank view, likely Xolace+)

**What:** The profile percentile card ("You've sat with more moments than 73% of people who reflect here") ships free and shows a single number plus the ember field. The deeper view — actually *seeing* the distribution you sit inside, rather than being told one number about it — is deferred for its own analysis and is the natural Xolace+ upgrade of this surface.

**Why it's deferred, not just unbuilt:** the free card answers "where am I?" A distribution view answers "what does the field of people here actually look like, and what does my position inside it mean?" That's a different (and more valuable) question, and it needs product thinking before design — a histogram of session counts is the templated answer and probably the wrong one.

**What already exists to build on:**
- `reflectionRank` aggregate (`convex/lib/aggregates.ts`) — a sorted index over `emotional_profiles.sessionCount`. It already supports everything a distribution view needs beyond `count`: `at(ctx, offset)` for the value at any rank, `min`/`max` for the tails, and bounded `count` for arbitrary buckets. **No new backend data is required** — this is a read-shape and design question, not a modelling one.
- `convex/profile.ts:getReflectionRank` — the free query, returning a `ranked | pending | warming` union.
- `src/features/profile/components/rank-card.tsx` + `ember-field.tsx` — the free surface and its Skia field.

**Open questions to settle first:**
1. What does the user actually learn from seeing the distribution that the single number doesn't tell them? If the answer is "nothing, it's just prettier", don't build it.
2. Buckets vs. a continuous curve — and does either survive the privacy posture? A histogram with thin buckets at the tail edges toward identifying the handful of people in them.
3. Population is ~61 reflectors in prod (2026-07). A distribution over 61 points is mostly noise; this may simply be premature until the population is a few hundred.
4. If it's the Plus upgrade of a free card, the free card must not feel deliberately crippled — see the gating rules in `project_paywall_gating_audit`.

**Effort:** M–L (needs a design pass before an estimate means anything)
**Priority:** P3 — the free card carries the retention value today; this is upside, not a gap

---

## ~~P2~~ FIXED (2026-08-01) — PostHog identity split: client identifies `users._id`, server captures `emotional_profiles._id`

**Resolution:** neither listed option. `emotional_profiles._id` was already on the
client via `api.users.getFullContext`, so no server change was needed: identify
moved out of `AuthScreen` into `usePostHogIdentity` (`src/lib/use-posthog-identity.ts`),
called from `(protected)/_layout.tsx` on app open. `user_signed_in` now lands on
the anonymous id and is merged by that identify. App-open (not sign-in) so
already-signed-in installs are covered — they never call `getOrCreate` again.
Accepted: pre-cutover history stays split, no backfill.

**Historical context (pre-fix):** the client identified on `users._id` while all 14
server capture sites used the pseudonymous `emotional_profiles._id` (RevenueCat's
`appUserId` is that same id — `convex/premium.ts`). Two distinct documents, never
merged, so every funnel crossing the client/server boundary silently under-counted
and person count roughly doubled for users with events on both sides.

**Invariant to keep:** the client's `identify` key must stay `emotional_profiles._id`.
Anything new that identifies or aliases on `users._id` reintroduces the split.

**Key files:** `src/lib/use-posthog-identity.ts`, `src/app/(protected)/_layout.tsx`, `convex/posthog.ts`

**Found:** PostHog `distinctId` audit on branch `feat/xolacer-suggestion-session` (2026-08-01).

---

## P3 — Android: drop implied `android.hardware.camera` requirement

**What:** Google Play Console's "Drop in support for Phone devices" release check flags 60 camera-less devices (Zebra scanners, budget Android phones, etc.) as newly unsupported due to an implied `android.hardware.camera` required feature.

**Why:** `expo-image-picker` is installed (`package.json`) but not listed in `app.config.ts`'s `plugins` array, so it runs with default config-plugin behavior — which unconditionally injects `<uses-permission android:name="android.permission.CAMERA" />` into the merged manifest (confirmed in `android/app/build/intermediates/merged_manifest/debug/processDebugMainManifest/AndroidManifest.xml`). Android Gradle then auto-infers `<uses-feature android:name="android.hardware.camera" android:required="true">` from that permission. The app only calls `ImagePicker.launchImageLibraryAsync` (gallery picker) — `launchCameraAsync` is never used anywhere in the codebase (checked `src/features/xolacer-chat/`, the only two call sites). The permission and resulting device-support drop are both unnecessary.

**How to fix:** Add `expo-image-picker` explicitly to the `plugins` array in `app.config.ts` with `"cameraPermission": false`:
```ts
[
  "expo-image-picker",
  {
    "photosPermission": "Allow $(PRODUCT_NAME) to access your photos.",
    "cameraPermission": false
  }
],
```
Then rebuild (native change, not OTA-safe).

**Key files:** `app.config.ts` (plugins array, near line 209 `"expo-sqlite"` / `"@clerk/expo"`)

**Effort:** XS (1 config change + rebuild)
**Priority:** P3 — cosmetic Play Console warning, 0 installs affected per the console's own report; fix on the next native build rather than a dedicated release
**Depends on:** Nothing — deferred only because iOS was already submitted for the current build and this needs a shared rebuild cycle

---

## Profile & Insights performance follow-ups (perf review, 2026-10-14)

Left over from the profiling pass on Profile + Insights (iPhone 17 Pro sim, dev build,
React profiler + Instruments). Fixed in that pass: heatmap a11y Pressables + per-cell
`toLocaleDateString`, heatmap cell re-renders on hold-drag, layout-animating reveal/bars,
and the duplicate `loadReadings` on Insights (`freeView` now carries `upsell`).

### QA the free-user Insights upsell on a device

**What:** Insights now reads the compounding upsell from `freeView.upsell` (held via
`useHeldUpsell` in `src/features/insights/compounding-upsell.tsx`) instead of subscribing to
`upsell.get`. Only the Plus path was exercised in the app.
**How to start:** with a free account that has a compounding stretch, open Insights: the
line shows, scrolling it into view spends it (`markShown`), and it stays on screen after the
query returns `null`. Also check session end still shows its own upsell.
**Note:** the Insights upsell is now judged at the client's hourly `now`, so it can appear or
clear up to an hour late; the hard-moment week window still uses server time.
**Priority:** P1 — before shipping the change. **Effort:** XS.

### Insights gauges: one Skia canvas instead of 72 animated SVG ticks

**What:** `TickGauge` (`src/features/insights/glass.tsx`) renders each tick as its own
`AnimatedLine` with its own `useAnimatedProps` worklet — 56 on the overall dial, 17 on the
detail half-gauge. Insights' mount commit was 118ms in dev, ~29ms of it `Tick` plus worklet
cloning.
**How to start:** draw the ticks in one Skia `<Canvas>` driven by the single `progress`
shared value, computing each tick's colour from `progress * n - i` as today — keeps the
per-tick crossfade, so the animation looks identical. (Cheaper alternative: two paths —
lit/unlit — split at the progress tick plus one crossfading leading tick; near-identical.)
**Priority:** P3. **Effort:** S.

### Pause Profile's infinite loops when the screen is off-screen

**What:** `EmberField` breath (`withRepeat(-1)`, `src/features/profile/components/ember-field.tsx`)
and `AnimatedDashedBorder` on `PlusRow` keep running while Profile is scrolled away or
covered by a pushed screen (e.g. Insights).
**How to start:** reuse the pattern from `6440d4c` ("pause home-screen breathing loops while
unfocused") — gate on `useIsFocused`.
**Priority:** P3. **Effort:** XS.

### Remaining `ctx.runQuery(internal.understanding.getUnderstanding)` calls

**What:** `understandingOf(ctx, sessionId)` (`convex/understanding.ts`) now does the same read
inside the caller's transaction. Still using a sub-query: `convex/paths.ts:139`,
`convex/followUps.ts:192`, `convex/jobs/followUpShare.ts:115`.
**How to start:** switch the ones running inside a query/mutation; leave actions on
`runQuery`. Behaviour identical.
**Priority:** P3. **Effort:** XS.

### `loadReadings` subscribes to every session document

**What:** `convex/compounding/readings.ts` does a `ctx.db.get` per metadata row (up to 1000
sessions) for `createdAt`, `confirmationState`, `postSessionMood`. Any patch to any of the
user's sessions reruns `freeView` / `plusView` / `upsell.get` (~3000 reads each).
**How to start:** denormalize the few session fields readings need onto `emotional_metadata`
(or a rollup), with a backfill; schema must keep matching existing data.
**Priority:** P3 — matters as heavy users approach the 1000-session cap. **Effort:** M.

### Profile polish

- `ContributionGraphCard` renders at zero grid height until `onLayout` reports a width, then
  expands — everything below it jumps on open. Reserve the grid height up front.
- `WordsTeaserCard` / `FrostedCount` mount up to five Skia canvases and call `matchFont`
  every render; hoist the fonts to module scope.

**Priority:** P4. **Effort:** XS each.
