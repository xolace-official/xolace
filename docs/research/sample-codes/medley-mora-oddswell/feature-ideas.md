# Feature ideas from the sample apps (medley, mora, oddswell)

Research date: 2026-10-14. Second batch, after [`../feature-ideas.md`](../feature-ideas.md)
(amber, clarity, oyelo, 2026-10-09) and [`../ci-testing-workflows.md`](../ci-testing-workflows.md).
Ideas already captured there are cross-referenced, not repeated.

Path prefixes:
- `medley/` = `/Users/nathan/Developer/XolaceInc/sample apps/Medley-main/`
- `mora/` = `/Users/nathan/Developer/XolaceInc/sample apps/Mora-main/`
- `oddswell/` = `/Users/nathan/Developer/XolaceInc/sample apps/oddswell-main/`

Xolace paths are repo-relative. Checked against `docs/foundation/xolace-for-agents.md` (rules 1–13)
and the Cognition Layer rule in `CLAUDE.md`. **Every idea below is Planned (not built).**

SDK versions vs Xolace (`package.json:77`, `expo ^57.0.18`):

| App | SDK | Note |
|---|---|---|
| Medley | 57 (`medley/package.json:29`, `expo ^57.0.0`) | Same SDK as Xolace. Its own docs say 54/56 (`medley/docs/medley-product-review.md:19`); trust `package.json`. Medley-native code ports with no upgrade. |
| Mora | 58.0.0-preview.8, RN 0.88 rc (`mora/README.md:3`, `mora/package.json`) | Preview SDK. Port patterns, not packages. |
| oddswell | 56 (`oddswell/package.json:22`, `oddswell/README.md:18`) | One SDK behind. Its value is server-side patterns, which are SDK-independent. |

---

## 1. Inventory

### medley: media tracker (Expo 57, Supabase + Clerk, TanStack Query + MMKV, Sentry)

| Feature | Where |
|---|---|
| Release Captain: one tag, routed by native fingerprint to an OTA lane or a store lane, with a human `require-approval` step | `medley/.eas/workflows/README.md:8-40`, `medley/.eas/workflows/release-captain.yml:1-8,34-47,86,235` |
| Two QA gates before store submit: a Maestro regression gate and an agentic QA gate (headless Claude Code driving Argent) | `medley/.eas/workflows/release-captain.yml:138-142,146-177,211-226` |
| QA agent contract: describe-before-tap, `await-ui-element`, screenshots per checkpoint, machine-readable `verdict.json` | `medley/.agents/release-qa-prompt.md:21-82` |
| Release Sentinel: hourly Sentry health gate (crash-free sessions/users, new issues, regressions, last-hour spike, "insufficient data" floor), dedup on an open `agent-fix` PR | `medley/.eas/workflows/README.md:36,62-75`, `medley/scripts/release-health-gate.mjs:18-19,132-170`, `medley/.eas/workflows/release-sentinel.yml:7,47-60` |
| One Maestro flow per production bug, named after the Sentry ID, verified red→green, run on every push forever | `medley/.maestro/regressions/README.md:1-16`, `medley/.maestro/regressions/react-native-2d.yaml:1-29`, `medley/.eas/workflows/README.md:37-38` |
| Channel surfing: a hidden deep-link screen switches a release preview build onto a PR's update channel; a banner shows while surfing | `medley/app/(protected)/channel-surf.tsx:20-21,54-56`, `medley/hooks/use-update-channel.ts:14-45`, `medley/components/ui/channel-override-banner.tsx:9-16` |
| User-customisable profile: a block registry, a versioned ordered layout, `enabled:false` keeps position | `medley/lib/profile-blocks/types.ts:7-28`, `medley/lib/profile-blocks/registry.ts:14-53`, `medley/app/(protected)/profile/customize.tsx` |
| Stats computed client-side from already-cached data, pure function | `medley/lib/profile-blocks/compute-stats.ts:27-63` |
| Typed error model with `retryable` | `medley/lib/app-error.ts:1-50` |
| Persisted query cache (MMKV) with buster + maxAge | `medley/lib/mmkv-persister.ts`, `medley/components/providers/query-provider.tsx:33-34` |
| A self-audit product review: dead tabs, controls that lie, "storage model not diary model", no guest mode | `medley/docs/medley-product-review.md:9-17,29-37,98,180` |

Not built in Medley (described only): the Match swipe deck (`onPress={() => {}}`, `medley/docs/medley-product-review.md:11,94`), the social feed (`:96`), Wrapped (`:127`).

### mora: chat-first nutrition journal (Expo 58 preview, on-device data, Supabase anonymous auth)

| Feature | Where |
|---|---|
| AI drafts, user confirms: every tool "PREPARES a draft", nothing is saved until the user taps | `mora/src/server/ai/prompt.ts:3,10`, `mora/src/server/ai/schemas.ts:150-165`, `mora/README.md:5,53` |
| Exactly-once tool application: each `toolCallId` applied once, and the processed set is persisted in the same write as the draft | `mora/src/features/chat/transcript.ts:48-92`, `mora/src/features/chat/draft-store.ts:14-17` |
| Proposal and its acknowledgement in one durable write (no replay after reload) | `mora/src/stores/tracking-store.ts:116-161` (comment at `:156`) |
| Closed, validated proposal schema with sanity bounds (no future dates, max values) | `mora/src/features/tracking/action.ts:3-31` |
| Clarifying question tool with 3–5 chips, one question at a time | `mora/src/server/ai/schemas.ts:134-147`, `mora/src/server/ai/prompt.ts:23-41`, `mora/src/components/chat/clarification-card.tsx` |
| Bounded context: 14 days of history, 60 messages per request, 8 MB image budget, 200 stored | `mora/src/features/chat/context.ts:5-21`, `mora/src/features/chat/history.ts:2-19`, `mora/src/server/ai/request.ts:13-67`, `mora/src/features/chat/use-mora-chat.ts:174` |
| Local-first journal + JSON export through the share sheet | `mora/src/lib/export-journal.ts:1-7`, `mora/src/screens/settings-screen.tsx:81-100,261` |
| Apple Health import: user-initiated, read-only, empty results never overwrite manual values, not added to AI context | `mora/src/features/health/import.ios.ts:4,34-38`, `mora/README.md:51` |
| Live voice with a single-use ephemeral token, realtime→STT/TTS fallback, voice stops when the app backgrounds | `mora/src/app/api/voice/session+api.ts:47-55`, `mora/src/features/voice/use-realtime-voice-chat.ts:114,187-188`, `mora/src/features/chat/use-mora-chat.ts:512-515` |
| Transcripts kept out of device logs | `mora/src/features/voice/use-voice-chat.ts:130` |
| Anonymous sign-in, no account needed to start | `mora/src/contexts/auth-context.tsx:40-43` |
| Honesty rules in the design system: no good/bad framing, no invented health score, estimates marked as estimates | `mora/docs/design-system.md:27,31`, `mora/docs/verification.md:55` |
| Goal calculator with stated limits (adults only, "not a medical threshold") | `mora/src/features/goals/estimate.ts:19-29`, `mora/docs/verification.md:54` |
| A written, repeatable manual regression script | `mora/docs/verification.md:61-72` |

### oddswell: AI sports analysis (Expo 56, OpenAI via Expo API routes, Zustand + sqlite history)

| Feature | Where |
|---|---|
| "The LLM is not the numeric engine": code computes the numbers, the model researches and explains | `oddswell/app/api/analysis/futbol+api.ts:1-10`, `oddswell/.cursor/skills/sports-analysis-ai/reference/design-decisions.md:47-59` |
| Capped contextual nudge: structured signals may move a number by at most 8 points | `oddswell/utils/futbolBlend.ts:1-8,31-32,70-77` |
| Validate-and-repair gate before the client sees anything; the repair count feeds confidence | `oddswell/utils/futbolValidation.ts:1-5,61-70`, `oddswell/app/api/analysis/futbol+api.ts:546-552` |
| Confidence = input quality and signal agreement, not how lopsided the answer is | `oddswell/utils/futbolConfidence.ts:1-6,41-74` |
| Risk flags: max 4, max 18 words, engine jargon rewritten into plain language | `oddswell/utils/futbolRiskFlags.ts:1-2,4-49`, `oddswell/app/api/analysis/futbol+api.ts:392-417` |
| One voice-rules module imported into every prompt ("HONESTY: one clear uncertainty beats three hedges", "NUMBERS: explain them, don't recompute") | `oddswell/server/resultCopyGuidelines.ts:5-28,65-71` |
| Deterministic post-sanitizer over the whole JSON result (em dashes) | `oddswell/utils/copySanitize.ts:20-36`, `oddswell/app/api/analysis/futbol+api.ts:586` |
| User-picked depth tier (Fast / Standard / High → different models) | `oddswell/config/analysisTier.ts:21-49` |
| "How we got here" methodology section on the result | `oddswell/components/sports/mma/HowWeGotHereSection.tsx:10-28` |
| Research cache with in-flight dedup | `oddswell/server/researchCache.ts:1-37` |
| Local history; re-run uses the *current* tier; "Older analysis" banner | `oddswell/stores/useHistoryStore.ts:9-43`, `oddswell/utils/savedAnalysisActions.ts:3,72`, `oddswell/components/sports/worldcup2026/ChampionOlderSnapshotBanner.tsx` |
| Periodic haptic pulse while waiting | `oddswell/hooks/useLoadingHaptics.ts:4-18` |
| Shared-secret API auth via a public env var | `oddswell/app/+middleware.ts:10-20` |
| Repo-local agent skill as architecture memory | `oddswell/.cursor/skills/sports-analysis-ai/SKILL.md`, `oddswell/README.md:115-147` |

### What Xolace already has (so these are not proposed as new)

- **Numbers from code, words from the model.** Steadiness is deterministic and insights are model-written, behind a pure gate that sends rejection reasons back to the model (`docs/adr/0019-steadiness-score-is-deterministic-insight-is-model-written.md`, `convex/compounding/insightGate.ts:1-8`, `convex/compounding/insightFacts.ts:1-10`). This is oddswell's core pattern, already in place for insights.
- **Confidence-aware mirroring** is specified (`docs/confidence-aware-mirroring.md`, Status: specified, unbuilt). Mirror plan carries `claimStrength` and `episodicTopScore` (`convex/schema.ts:909-920`).
- **Dislike signal:** Kindling "Not for me" (`convex/paths.ts:282`). Covers Medley's planned `media_feedback`.
- **Waiting haptic:** `useProcessingBreathHaptic` in the processing state (`src/features/reflect/components/states/processing-state.tsx:15`, `src/lib/haptics/haptics.ts:68`). Covers oddswell's loading pulse.
- **Local-first journal** is Planned in `docs/journal-local-first.md`.
- **Prompt eval harness + quality metric per model version** (`convex/ai/prompts/__evals__/`, `convex/ai/evalMetrics.ts`).
- **Sentry with replay** (`src/app/_layout.tsx:39-57`), **Argent flows** (`.argent/flows/*.yaml`), **EAS channels** (`eas.json:13,21,28`). No `.eas/workflows/`, no Maestro.
- **Data controls** (sharing, memory, retention, delete) in `src/features/settings/components/screens/DataScreen.tsx:94-188`. **No self-serve export.** The privacy text says to email for a copy (`src/features/auth/components/legal-content.ts:47`).
- **Mirror output checks** are only "empty or meta-narration → fallback" (`convex/ai/process.ts:36,235-241`). The em-dash rule is prompt-only (`convex/ai/prompts/articulator.ts:130`). Only quotes strip dashes in code (`src/features/quotes/utils/text-utils.ts:2`).

---

## 2. Ideas for Xolace

### A. Trust and control over the Fire

#### A1. "What the Fire drew on": show which past reflections shaped this mirror
- **What:** under a mirror that used memory, a quiet line: "Drew on 2 earlier reflections". Tap to see their dates and open them. Each has a "Not related" action.
- **Source:** oddswell shows its method under every result (`oddswell/components/sports/mma/HowWeGotHereSection.tsx:10-28`). Mora marks estimates apart from measured values (`mora/docs/design-system.md:27`).
- **Maps to:** `emotional_metadata.episodicMatchKeys` already stores exactly this (`convex/schema.ts:909-912`), but no UI reads it. Add a public query in `convex/understanding.ts` that returns dates and session ids for the caller's own session. Show it in `src/features/reflect/components/states/mirror-state.tsx` and on `SessionDetailsScreen`. "Not related" reuses the existing Phase 4 relevance decay ("not quite" already decays these memories, `convex/schema.ts:910-911`).
- **Fit:** Fire layer. Rule 6: it reads the Understanding and needs no model call. Rule 10: a journal that remembers you should show what it remembered. Rule 12: the line is literally true because it is rendered only from stored keys. Different from `../feature-ideas.md` N4 (similar sessions on details) and S5 (semantic profile list).
- **Effort:** S–M.
- **Risks:** it surfaces a heavy past session. Hide it at safeguard elevated/crisis and keep it tap-to-open. Never list a burned session; `insightEvidence` already excludes those (`convex/compounding/insightEvidence.ts:1-10`). Never show the past *text* on the mirror screen, only the date.

#### A2. "Correct the read": user-owned corrections to a session's domains and emotions
- **What:** on session details, show the read as chips ("Work · Family · anxious"). The person can remove a wrong one or add a missing domain. Insights and steadiness count the corrected version.
- **Source:** Mora's split between what the AI proposes and what the user owns. The AI can only prepare a draft (`mora/src/server/ai/prompt.ts:3`), and confirmation is one durable write that can't be replayed (`mora/src/stores/tracking-store.ts:156`). Same idea as amber's `suggested`/`saved` split, which `../feature-ideas.md` S5 applies to the semantic profile. This applies it per session.
- **Maps to:** a new `understanding_corrections` table (sessionId, field, value, op) in `convex/understanding/`. Readers merge at read time: `convex/compounding/readings.ts`, `insightEvidence.ts`, `src/features/profile/components/emotion-chips.tsx`. Never patch `emotional_metadata` in place, because it records what the classifier said and `evalMetrics` compares model versions on it.
- **Fit:** Fire layer. No model call (rule 6). Steadiness is only as good as its domain tags, so this makes Building features truer (rule 13). It also yields a labelled signal for the classifier eval set. That needs consent if it ever leaves the person's own account (rule 7).
- **Effort:** M.
- **Risks:** corrections must survive reclassification (`reclassifiedAt`, `convex/schema.ts:963-964`). Never allow edits to the safeguard verdict. Safety stays the system's call.

#### A3. "Download a copy of my reflections" (self-serve export)
- **What:** a row in Settings → Data that builds a JSON (optionally Markdown) file of the person's own reflections, mirrors, follow-up answers and read labels, and opens the share sheet.
- **Source:** `mora/src/lib/export-journal.ts:1-7` (write to cache, `shareAsync`) and `mora/src/screens/settings-screen.tsx:81-100` (a versioned payload with `exportedAt`).
- **Maps to:** an action in `convex/users/` (or `convex/export.ts`) that pages through the caller's sessions under `requireAuth()`. A row in `src/features/settings/components/screens/DataScreen.tsx` next to "Delete all my data". `expo-file-system` and `expo-sharing` are already installed (`package.json:89,105`).
- **Fit:** privacy standard ("you can delete everything" has an obvious sibling: you can take everything). It replaces "email us for a copy" (`legal-content.ts:47`) with something true and instant (rule 12). No model call.
- **Effort:** S.
- **Risks:** the file is plaintext once shared, so say so in one line. Exclude Xolacer chat messages written by other people (Stream holds them). Vent has nothing to export ("never stored"). Paginate. A heavy user can exceed one query's read limit.

### B. AI output quality (patterns, not features)

#### B1. A mirror output gate: check, repair once, then fall back
- **What:** deterministic checks on the articulator's output before `deliverMirror`. If one fails, retry once with the failure reason, then use today's fallback. Record the repair count per session.
- **Source:** oddswell's validate-and-repair gate (`oddswell/utils/futbolValidation.ts:1-5`), its repair count lowering confidence (`oddswell/utils/futbolConfidence.ts:60,65`), its single voice-rules module (`oddswell/server/resultCopyGuidelines.ts:5-28`), and its post-sanitizer over every string (`oddswell/utils/copySanitize.ts:20-36`).
- **Maps to:** a pure `convex/ai/mirrorGate.ts` (with a test file, like `insightGate.test.ts`). It runs after `extractTextFromResponse` in `convex/ai/process.ts:233-237`. Checks:
  - dashes: today this is only a prompt rule (`articulator.ts:130`);
  - length band;
  - banned openers;
  - no prescriptive verbs when `supportNeed` is `none` (rule 2: the mirror "does not prescribe by default");
  - a `reaching` mirror ends on its one question (`docs/confidence-aware-mirroring.md`, #216).

  Stamp `mirrorRepairs` beside `mirrorModelVersion` so `convex/ai/evalMetrics.ts` can report it.
- **Fit:** Xolace already does exactly this for insights (ADR 0019, `insightGate.ts:5-6`, "A rejection's reason goes back to the model"). This extends the house pattern to the most-read text in the app. A repair is not a new artifact, so rule 6 is satisfied, and it lives in `convex/ai/`.
- **Effort:** M.
- **Risks:** latency. A retry adds one Sonnet call to the most fragile wait, so allow at most one. Regex checks on prescriptive language will have false positives, so start in log-only mode and turn on enforcement after reading a week of data. Never let the gate weaken a safety path. Escalation copy stays outside it.

#### B2. Data-sufficiency caveats on insights
- **What:** when an insight or steadiness reading shows, attach at most one plain caveat computed in code: "Early read: 4 reflections over 9 days", "Mostly from evenings".
- **Source:** oddswell's risk flags (max 4, ≤18 words, jargon rewritten, `oddswell/utils/futbolRiskFlags.ts:1-2,4-49`) and its honesty rule "One clear uncertainty beats three hedges" (`oddswell/server/resultCopyGuidelines.ts:26`).
- **Maps to:** `insightGate.ts` already decides `shownNow` (unlock, settled, stale, `:6-7`). Add a sibling pure `caveatFor(evidence)` and render it in `src/features/insights/detail-card.tsx` / `steadiness-row.tsx`.
- **Fit:** Hearth layer. Rule 13 (status honesty) applied *inside* the feature. No model call.
- **Effort:** S.
- **Risks:** too many caveats read as "this is useless". Show one, and only below a threshold.

### C. Care that comes back (Hearth)

#### C1. "Want a check-in after Friday?": a proposed check-in drawn from what they said
- **What:** if a reflection mentions an upcoming moment (exam, hearing, a hard anniversary), session end shows a draft card: "Want Xolace to check in after Friday?" with Yes / Not now. Nothing is scheduled until they tap.
- **Source:** Mora's proposal pipeline. A closed schema with sanity bounds (no future-dated *logs*, `mora/src/features/tracking/action.ts:3-31`), a "Does NOT save anything" tool contract (`mora/src/server/ai/schemas.ts:151-152`), and exactly-once confirmation (`mora/src/features/chat/transcript.ts:48-92`, `mora/src/stores/tracking-store.ts:156`).
- **Maps to:** builds on `../feature-ideas.md` S2(b) ("hard dates"). The difference is *who notices*: the person doesn't have to set it up. Add an optional `upcomingMoment: { onOrAfter: date }` to the existing classifier output. That is a new optional field on an existing call, not a new model call. Store it in `emotional_metadata` with **no label** (a date only, so nothing sensitive can reach a notification). Then a confirm mutation in `convex/followUps.ts` that writes the schedule and the acknowledgement in one transaction (Convex mutations are atomic), plus a card in `src/features/session-end/`.
- **Fit:** rule 1a (catch it earlier) and a Phase 3 calendar moment (`docs/foundation/xolace.md:434`). User-confirmed, so it isn't a nag (rule 9).
- **Effort:** M–L.
- **Risks:**
  - Classifier schema change: additive and optional, so safe under the store-gap rule.
  - Wrong dates: always show the date for confirmation.
  - Never offer it at elevated/crisis. Escalation owns that moment (rule 5).
  - The notification copy is discreet and generic (rule 8) and respects the quiet window.

#### C2. Choose what your profile shows
- **What:** let people hide or reorder profile cards. Some people don't want their intensity week or emotion chips in view every time they open the app, or on a screen someone else can see.
- **Source:** Medley's block registry and versioned layout. Disabled blocks keep their position (`medley/lib/profile-blocks/types.ts:7-28`, `medley/lib/profile-blocks/registry.ts:14-53`).
- **Maps to:** `ProfileScreen.tsx` hard-codes the order: StatBand, ContributionGraphCard, EmotionChips, MirrorLines, RankCard, WeekIntensityCard, WordsTeaserCard, FollowUpsSection (`src/features/profile/components/screens/ProfileScreen.tsx:114-209`). Move them into `src/features/profile/blocks.ts` and keep `profileLayout` in the persisted Zustand `toggles` slice (no server change), or in `preferences` if it should sync across devices.
- **Fit:** Hearth layer. User control over exposure to their own heavy data. It also supports rule 8 (phones get seen).
- **Effort:** M.
- **Risks:** keep `FollowUpsSection` un-hideable, because hiding it would hide care. A Plus card must not be hideable just to dodge an upsell. That is fine for the user, but decide it explicitly.

### D. Outside the box (these challenge current assumptions)

#### D1. Every safety miss becomes a permanent eval case (red → green)
- **What:** when the safeguard under- or over-fires in production (found through feedback, a Xolacer report or review), write a **synthetic paraphrase** as a fixture in `convex/ai/prompts/__evals__/`. Show it failing on the old prompt or rules, and passing on the fix. It stays in the suite forever.
- **Source:** Medley's "one Maestro flow per production bug, verified red→green, run on every push" (`medley/.maestro/regressions/README.md:1-16`, `medley/.eas/workflows/README.md:38`). The pattern is ported from crash bugs to judgement bugs.
- **Fit:** "Safety leads" (rule 5). It turns the known gaps list into something that only shrinks. Xolace already has the harness (`intensity.eval.test.ts`, `chatModeration.eval.test.ts`, `requiresFollowUp.eval.test.ts`).
- **Effort:** S per case once the convention is written (a `README` in `__evals__/` and a header comment shape, like `medley/.maestro/regressions/react-native-2d.yaml:1-18`).
- **Risks:** **never put a user's words in a fixture** (rule 7). Paraphrase so the case can't be traced back to anyone. Pair it with `docs/bug-log.md` entries.

#### D2. First reflection before an account
- **What:** let someone write one reflection and see one mirror before signing in. Ask for an account only to keep it ("Save this and let Xolace remember").
- **Source:** Mora starts every user on Supabase anonymous auth (`mora/src/contexts/auth-context.tsx:40-43`). Medley's own review names "the entire app is hard-gated with no guest/browse mode" as an activation problem (`medley/docs/medley-product-review.md:98`).
- **Challenges:** the assumption that identity comes before value. The north star is weekly active reflectors, and the first mirror *is* the product. Today it sits behind Google OAuth.
- **Maps to:** a guest identity Convex trusts (Convex custom JWT for a device-scoped guest, or whatever Clerk offers at build time; verify, don't assume). Data must merge into the real profile on sign-up. Run the guest's first session through the full pipeline (rule 5), with memory ingest off until they sign up.
- **Effort:** L.
- **Risks:**
  - Cost and abuse. `process.ts:68` already rate-limits, so keep that tight for guests.
  - Crisis handling for someone with no account. Resources still show, but "escalation alerts no one" is already a known gap.
  - Merge bugs. Store-gap: old binaries never send a guest token, which is fine.

  **Ask before building:** this is a product decision (onboarding order, target market).

#### D3. Body context: sleep and steps as counted facts beside steadiness
- **What:** an opt-in, user-initiated import of sleep duration and steps (Apple Health / Health Connect). Insights code counts them like any other fact ("Your heavier reflections cluster after nights under 6 hours"). It is never sent to the mirror.
- **Source:** Mora's import rules: user-initiated with no startup query, read-only, "Empty results can mean denied read access. Never overwrite manual values with zero", and Health data never added to AI context (`mora/src/features/health/import.ios.ts:4,34-38`, `mora/README.md:51`).
- **Maps to:** a `body_signals` table (date, sleepMinutes?, steps?) in `convex/compounding/`. `insightFacts.ts` gets a new counted fact. Per ADR 0019 the model only writes about facts that code found.
- **Fit:** rule 6 allows a genuinely new input modality. Rule 1a fits: sleep is often the earliest thing to slip.
- **Effort:** L.
- **Risks:**
  - Health data is a new consent class. Make it opt-in and say exactly what is read.
  - Never imply causation or diagnosis (rule 12, no clinical reviewer).
  - Android needs Health Connect. Mora didn't build it (`mora/docs/verification.md:56`).
  - Deletion must cover it (a known gap).

  **Open question:** this edges toward a health app. Check positioning first.

#### D4. "Older read" honesty on revisited sessions
- **What:** when someone reopens an old session whose mirror came from an older articulator or prompt version, label it quietly: "Written by an earlier version of Xolace."
- **Source:** oddswell labels an old snapshot instead of silently mixing it with new ones (`oddswell/components/sports/worldcup2026/ChampionOlderSnapshotBanner.tsx`). Re-runs use the current settings (`oddswell/utils/savedAnalysisActions.ts:3`).
- **Maps to:** `mirrorModelVersion` is already stamped (`convex/ai/evalMetrics.ts` header). Compare it to the current version in `SessionDetailsScreen`.
- **Fit:** rules 12 and 13 applied to history. People will reread old mirrors as Xolace gets better, and the gap should be explained, not felt as inconsistency.
- **Effort:** S.
- **Risks:** this is noise if versions bump often. Show it only across a *major* articulator change. Do **not** offer "re-mirror this": the old mirror was what they saw then, and re-deriving it breaks rule 6.

### E. Shipping and safety-of-release (Medley)

These extend `../ci-testing-workflows.md` G5 (PR E2E), G6 (fingerprint deploy), S2 (PR preview OTA) and S6 (issue→fix agent). They do not repeat them.

#### E1. Agentic release QA gate on Argent with a `verdict.json`
- **What:** before store submit, headless Claude Code installs the release build on a simulator, smokes the core surface through Argent, and writes `qa-artifacts/verdict.json` (`{status, checks[], notes}`). A human reads it at the approval step.
- **Source:** `medley/.agents/release-qa-prompt.md:21-82`, `medley/.eas/workflows/release-captain.yml:146-177,211-226`.
- **Why this over `../feature-ideas.md` G3 (amber's `@e2e-dev`):** Medley's QA prompt follows the same Argent rules Xolace already has in `.claude/rules/argent.md` (describe before every tap, stop after two failed taps, `await-ui-element` instead of polling). Xolace already has 17 Argent flows (`.argent/flows/`). No new E2E vendor is needed.
- **Xolace checklist:** cold start → onboarding; reflect → mirror; session end; Kindling sheet; timeline; settings → Data. Every check must accept "skipped" for auth-gated steps until `../ci-testing-workflows.md` G2 (automation sign-in) lands.
- **Effort:** S–M.
- **Risks:** a real reflection hits Anthropic. Use a dev Convex deployment and synthetic input only. Keep the gate advisory (`after:`, not `needs:`) at first, as Medley does (`medley/.eas/workflows/README.md:79-81`).

#### E2. Release Sentinel: Sentry health → alert → regression flow
- **What:** an hourly job that checks crash-free sessions and users, new issues and regressions for the current release. If the release is unhealthy, it alerts and opens one triage. Dedup means each issue fires once, not every hour.
- **Source:** `medley/scripts/release-health-gate.mjs:18-19,132-170`, `medley/.eas/workflows/release-sentinel.yml:7,47-60`, tunables in `medley/.eas/workflows/README.md:62-75`.
- **Maps to:** Xolace already ships Sentry with replay (`src/app/_layout.tsx:41-57`). The script is portable, so change only the org and project names. Each fix adds an Argent flow (or Maestro, if adopted) named after the Sentry ID, plus a `docs/bug-log.md` entry.
- **Effort:** M.
- **Risks:** Sentry replay can capture what's on screen, including reflection text. Check that masking is on before agents read replays (rule 7). The `MIN_SESSIONS` floor matters at Xolace's volume, otherwise every quiet hour looks like a spike.

#### E3. Channel surfing on a release-config build
- **What:** a hidden deep link (`xolace://channel-surf?channel=pr-123`) switches a *preview* build onto a PR's update channel. A banner stays visible until you tap back.
- **Source:** `medley/hooks/use-update-channel.ts:14-45` (`setUpdateRequestHeadersOverride`, restores the old override if the channel has nothing compatible), `medley/components/ui/channel-override-banner.tsx:9-16`.
- **Why beyond `../ci-testing-workflows.md` S2:** S2 loads a PR into a *dev client*. This tests PR code under the release JS engine and config, where release-only bugs live. Teammates who aren't developers (reviewers, Xolacers) can try a PR on the build they already have.
- **Effort:** S.
- **Risks:** gate it at build time (`EXPO_PUBLIC_CHANNEL_SURF=1` on the preview profile only, `medley/hooks/use-update-channel.ts:16-17`). It must be impossible in production. Under the `appVersion` runtime, only same-runtime PRs load.

---

## 3. Improvements to existing Xolace features

| Xolace file | Improvement | Source |
|---|---|---|
| `src/features/reflect/hooks/use-mirror-audio.ts` | It has no `AppState` listener. Check that mirror TTS stops when the app backgrounds (Mora stops voice explicitly). | `mora/src/features/chat/use-mora-chat.ts:512-515` |
| `convex/ai/prompts/articulator.ts:130` + `convex/ai/process.ts:233` | The dash rule lives only in the prompt. Add a deterministic post-sanitizer (part of B1). Quotes already do it client-side. | `oddswell/utils/copySanitize.ts:20-36`, `src/features/quotes/utils/text-utils.ts:2` |
| `src/features/reflect/hooks/use-voice-input.ts`, `use-plus-dictation.ts` | Audit that transcripts never reach `console.log` / Sentry breadcrumbs. | `mora/src/features/voice/use-voice-chat.ts:130` |
| `docs/journal-local-first.md` (Planned) | Add export (A3) to the plan, plus Mora's honest device-only copy: "stored on this device, export before changing devices". | `mora/src/screens/settings-screen.tsx:261` |
| `src/features/settings/components/screens/DataScreen.tsx` | Add "Download a copy" (A3). | `mora/src/lib/export-journal.ts` |
| `docs/qa/` | Add one written, numbered manual regression script for the reflection loop, the way Mora keeps one. It is useful until E1 exists. | `mora/docs/verification.md:61-72` |
| `src/features/insights/*` (Building) | One plain caveat per reading (B2). | `oddswell/utils/futbolRiskFlags.ts` |
| Prompt files under `convex/ai/prompts/` | Pull the shared voice rules (no dashes, banned openers, length) into one imported constant, so articulator, follow-up card writer and notification writer can't drift apart. | `oddswell/server/resultCopyGuidelines.ts:5-28,65-71` |

---

## 4. Ranked shortlist

1. **A3. Download a copy**: S. Replaces "email us for your data" with a real button. Uses only installed packages.
2. **A1. What the Fire drew on**: S–M. The data already exists (`episodicMatchKeys`). It shows that memory is real, and gives the relevance loop a direct correction.
3. **B1. Mirror output gate**: M. Extends Xolace's own ADR 0019 pattern to the most-read text, and makes "never prescribe by default" checkable.
4. **E1. Agentic release QA on Argent**: S–M. The shortest path to the E2E artifact `CLAUDE.md` asks for, using tooling already installed.
5. **D1. Every safety miss becomes an eval**: S per case. Safety quality can then only go up, using the existing harness.
6. **A2. Correct the read**: M. Steadiness and insights are only as true as their tags, and the user's word should beat the classifier's.
7. **C1. Proposed check-in from what you said**: M–L. The most "catch it earlier" idea in this batch. Confirm-only keeps it safe.
8. **C2. Choose what your profile shows**: M. Gives people control over exposure to their own heavy data.

Next tier: E2 (Sentinel), E3 (channel surfing), B2 (caveats), D4 (older read). Strategic, ask first: D2 (no-account first reflection), D3 (body context).

### Rejected / doesn't fit

- **Realtime voice conversation with the AI** (`mora/src/app/api/voice/session+api.ts`, Gemini Live). "The fire is not a participant… it does not converse" (`docs/confidence-aware-mirroring.md`, standing constraints). The model call would also sit outside `convex/ai/`.
- **Pre-mirror clarifying questions with chips** (`mora/src/server/ai/schemas.ts:134-147`, "Be curious!" `prompt.ts:23`). The mirror is "declarative, never interrogative", except the one question on a `reaching` mirror (#216), which Xolace already specifies.
- **User-picked model tiers** (`oddswell/config/analysisTier.ts`). Mirror quality must not depend on payment ("the mirror is free, always", rule 11). Kindling generation is already premium-only by ADR 0009.
- **Expo Router API routes for AI** (`mora/src/app/api/*`, `oddswell/app/api/analysis/*`). All model calls live in `convex/ai/` (Cognition Layer rule).
- **Shared-secret API auth** (`oddswell/app/+middleware.ts:14-15`, `EXPO_PUBLIC_API_SECRET`). An `EXPO_PUBLIC_` value ships inside the bundle, so it isn't a secret. Xolace uses Clerk JWTs with `requireAuth()`.
- **Swipe "Match" deck, social feed, follows** (Medley). The swipe deck and feed aren't built (`medley/docs/medley-product-review.md:94,96`), and follows exist only as an unwired schema. Reflections are private by default, and Kindling "Not for me" already covers the dislike signal.
- **Persisted query cache** (`medley/lib/mmkv-persister.ts`). Already rejected in `../feature-ideas.md` (reflection history on disk).
- **Year-in-review / Wrapped** (`medley/docs/medley-product-review.md:127`). It is only a roadmap line in Medley, with no code to learn from. Revisit once steadiness ships. It would need ADR 0019's code-counts-model-writes split.
- **Goal calculator** (`mora/src/features/goals/estimate.ts`). Nutrition-specific. Only its "state your limits" copy pattern carries over, and that is covered by B2.
- **Daily 7 pm reminder** (`mora/src/screens/settings-screen.tsx:48-75`). Xolace already has notifications with a quiet window.
- **Repo agent skill** (`oddswell/.cursor/skills/`). Xolace already keeps this in `docs/foundation/`, `CLAUDE.md` and `docs/agents/`.
