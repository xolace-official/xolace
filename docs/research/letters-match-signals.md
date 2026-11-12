# Letters: what a match may use (recipient signals and their consent rules)

Researched 2026-11-12 for #745 (map #743, "Letters to strangers"). Read-only survey of
`packages/backend/convex` at `de3a3e38`, plus `VISION.md` and the mobile copy that makes
privacy promises. Paths below are relative to `packages/backend/convex/` unless they
start with `apps/`, `docs/` or `VISION.md`.

## Question

Which data about a user already exists that a **letter** match could use to pick a
**recipient** the letter is likely to help? For each: where it lives, how fresh it is,
and what consent or privacy rule governs using it to choose what a user sees from
another person.

## Short answer

- **Language does not exist.** No per-user language or locale is stored anywhere. The
  only `language` field is on curated `quotes` (`schema.ts:2022`). Mobile reads the
  device locale only for crisis-resource country detection and keeps it on the device
  (`apps/mobile/src/features/crisis-resources/use-crisis-resources.ts:18-21`). The map
  has settled on same-language-only matching, so a new signal is needed before any
  match can run.
- **Adult status exists** and has one owner: `age/status.ts:36` `effectiveAgeStatus`,
  enforced via `age/gate.ts:17` `requireAdult`. The intake `ageBracket` is deprecated
  and must not be read (`lib/validators.ts:303-309`).
- **Emotional state is rich and per-session**: `emotional_metadata` (emotion, intensity,
  themes, support need, safeguard level). Peer reflections and Xolacer suggestions
  already show how to pick content for someone from their own metadata.
- **The consent ledger does not govern anything today.** `consent_records` has no
  "letters" type. The three types that might seem relevant are granted silently at
  sign-up (`users.ts:172-187`), and **no code reads them** except account deletion
  (`jobs/accountDeletionSteps.ts:30-34`). The only consent type a client checks is
  `voice_processing`. So "consent rules" today are **structural** (namespaces, no
  linking rows, the poolability gate) and **copy promises** in the app, not ledger
  checks.
- **Every existing cross-user feature reads the viewer's own data to pick content for
  the viewer.** Letters would be the first feature that uses a user's private data to
  make them the **target** of another person's content. That is new ground for
  invariant 6, and the code has no rule for it yet.

## Signals

"Usable?" means usable to choose a recipient, ignoring for now whether the founders
want it. **Freshness** means how current the value is when a match runs.

| Signal | Where it lives | Freshness | How it's populated | Consent / privacy rule today | Usable for matching? |
|---|---|---|---|---|---|
| **Language / locale** | Nowhere for users. `quotes.language` only (`schema.ts:2022`) | n/a | Not collected. Device locale stays on the phone (`apps/mobile/src/features/crisis-resources/use-crisis-resources.ts:18-21`) | n/a | **No (missing).** Needs a new field (device locale on sign-in, or detected from the letter and the recipient's recent sessions). Hard requirement for same-language matching |
| **Adult status** | `age_declarations` (`schema.ts:85-98`), on the identity side, keyed on `users` | Live: computed on the user's local day at read time (`age/status.ts:23-44`) | Self-declared date of birth at a gate (only `surface: "xolacer_chat"` today, `schema.ts:96`) | Kept off the emotional side on purpose. Purged by account deletion, kept by a data wipe (`schema.ts:77-83`) | **Yes, as an eligibility filter.** `requireAdult(…, "ask")` (`age/gate.ts:17-29`). `unknown` is common (only users who reached the Xolacer gate have declared), so the recipient pool starts small. `surface` is a literal and needs widening to record a letters gate |
| **Primary / secondary emotion, granular label** | `emotional_metadata` (`schema.ts:548`, `:566`, `:600`), 1:1 with a session (`by_session`, `:666`) | Per session, written once by the pipeline, then "effectively frozen" (`schema.ts:584-590`). Refinement can patch it (`emotionalMetadata.ts:244-262`) | Classifier on the session text | Own data. Already used to pick **pool content for its owner** (`lib/reflectionMatching.ts:36-70`). Retention purge and data wipe remove it with the session | **Yes, the strongest candidate.** Same vocabulary as `reflections` (`schema.ts:2104-2132`), so letter and recipient can be compared without a model call. Only as recent as the user's last session |
| **Intensity, specificity** | `emotional_metadata.intensity` / `.specificity` (`schema.ts:559`, `:606`) | Per session | Classifier, 1-10 | As above | **Yes, as a band.** The reflection cascade already filters intensity within ±3 (`lib/reflectionMatching.ts:32-35`). Xolacer suggestion uses a floor of 6 (`lib/xolacerSuggestion.ts:18`) |
| **Thematic tags** (work, family, loss…) | `emotional_metadata.thematicTags` (`schema.ts:640`) | Per session | Classifier, closed set | Own data. `SUPPRESSED_THEMES` (trauma, abuse, neglect, body-image) blocks routing a person to a stranger (`lib/xolacerSuggestion.ts:29`) | **Yes, with the suppression list copied over.** Theme→situation mapping already exists (`lib/xolacerSuggestion.ts:46-80`) |
| **Support need** | `emotional_metadata.supportNeed` (`schema.ts:622`) | Per session. Absent on older rows = "none" | Classifier, same call. Forced to "none" when the safeguard escalates (`schema.ts:616-621`) | Own data | **Unclear.** A good fit ("could a kind word help right now?"). Its vocabulary was built for kindling audio, not people |
| **Safeguard level / risk flag** | `emotional_metadata.safeguardLevel`, `.riskFlag` (`schema.ts:582`, `:595`); `sessions.safeguardLevel` (`schema.ts:2479-2486`); `escalation_events` (`schema.ts:862`) | Per session. Escalation events are kept forever, anonymised | Rule code, never a model (`schema.ts:591-594`) | Invariant 7. Precedent: elevated **and** crisis never get routed to a stranger (`lib/xolacerSuggestion.ts:104-127`), crisis never enters the pool (`lib/poolability.ts:19-24`) | **Yes, but only as an exclusion.** Using risk to *pick* a recipient would turn letters into an unreviewed crisis channel. The policy ticket decides whether elevated/crisis recipients are skipped or only get pre-vetted letters |
| **User's own words** (`userLanguageTags`, `rawInput`, `distilledText`) | `emotional_metadata.userLanguageTags` (`schema.ts:648`); `sessions.rawInput` / `distilledText` (`schema.ts:2462`, `:2301`) | Per session | Classifier tags / raw text / AI distillation | Own words. `personalMemoryEnabled = false` means "new reflections are kept without their words" (`schema.ts:1830-1833`, `apps/mobile/src/features/settings/components/screens/DataScreen.tsx:135-138`) | **Unclear / risky.** Embedding a letter against recipients' raw text matches best but stretches the memory promise. If used at all, only when memory is on, and never stored as a letter→session link (see the Xolacer precedent below) |
| **Personal episodic memory (vectors)** | RAG namespace = `emotionalProfileId` (`rag.ts:18-20`, `episodicMemory.ts:29-31`) | Updated per session. Metadata-only when memory is off or for crisis (`episodicMemory.ts:113-142`) | Embedding of raw/mirror text + metadata line | "Never cross-user by construction" (`rag.ts:20`, `episodicMemory.ts:31`) | **No.** One namespace per user means "find the best recipient" would search N namespaces, and the stated guarantee is that these never cross users. A letter→recipient search needs its own index |
| **Semantic profile** (recurring themes, signatures, trajectory) | `semantic_profiles` (`schema.ts:2182-2207`), pointer at `emotional_profiles.currentSemanticProfileId` (`:710`) | Consolidated at ≥5 sessions or ≥7 days since the last run (`ai/reflectionAgent/triggerQueries.ts:85-118`). `trajectory` also gets a lighter post-session pass (`schema.ts:2195-2197`) | Reflection Agent (LLM), append-only versions (`semanticProfiles.ts:9-18`) | "Read whole (never vector-searched) by the articulator context and … insights UI" (`semanticProfiles.ts:16-17`). The most intimate artifact in the system | **No (not as-is).** Free prose, not comparable across users without a model call per candidate, which backend AGENTS.md forbids for re-deriving known signal. Using it to target strangers' content goes beyond what it was written for |
| **Dominant emotion tags, frequent words** | `emotional_profiles.dominantEmotionTags` (`schema.ts:737`), `.frequentWords` (`:750`) | Recomputed after each session from a bounded recent window (`jobs/profileStats.ts:60-80`, `:139`) | Counts over recent metadata | `frequentWords` "never returned to the client while premium-gated" (`schema.ts:744-749`) | **Yes (dominant tags), as a cheap fallback** when the latest session is thin. Frequent words: no, same issue as raw words |
| **Steadiness domains / insights** | `emotional_profiles.unlockedDomains` (`schema.ts:836`); `steadiness_insights` (`schema.ts:2655`) | Per consolidation run | Compounding pipeline | Own insights | **Unclear.** It's longer-term, Plus-adjacent signal. Letters are free and should not lean on a Plus pipeline |
| **Intake answers** (`weighingOn`, `intent`, `copingStyle`…) | `intake_responses` (`schema.ts:1325-1340`, fields `lib/validators.ts:292-385`) | Written once at onboarding, v2 deferred answers later. Not aged out by retention (`schema.ts:1321-1323`) | Self-reported questionnaire | Copy promise: "No one else sees your answers or name. They only change how Xolace meets you." (`apps/mobile/src/features/intake/questionnaire/interstitials.tsx:13`) | **Unclear.** `intent: "feel_less_alone"` / `weighingOn` are useful for a cold start. Using them to choose what *Xolace* shows you fits "how Xolace meets you". It does not reveal answers, but it is a new use. Goes stale |
| **Open follow-up and its answer** | `follow_up_cards` (`schema.ts:1058-1121`), `follow_up_responses` (`:1136`) | At most one active card per profile. Answer is live | Follow-up workflow | Own data. `acute` tier and escalation-derived cards never share (`lib/poolability.ts:33-46`) | **Yes, as a timing signal** ("still with it"/"heavier" on a standard card = may welcome a letter). The acute/escalation-derived exclusion must carry over |
| **Post-session mood** | `sessions.postSessionMood`, `moodPosition` (`schema.ts:2442`, `:2420`) | Per session, optional | User tap | Copy: "Your answer stays private. It helps you notice patterns over time." (`apps/mobile/src/features/session-end/components/activity-variant.tsx:197-198`) | **Unclear.** Signal is fine, but the promise names only one purpose |
| **Recency / activity** | `emotional_profiles.lastSessionAt` (`schema.ts:768`), `typicalUsagePattern` (`:824`), presence (`presence.ts:22-24`) | Live | Session completion, heartbeat | Presence: "membership never reaches a client" (`presence.ts:23`) | **Yes, for eligibility and timing** (don't deliver to someone gone for months; deliver near their usual hour). Must not reward volume or create pressure (invariant 3) |
| **Timezone, quiet window** | `preferences.notifications.timezone`, `.quietWindow` (`schema.ts:1811-1827`) | Set when notifications are configured (`preferences.ts:355`). Age falls back to UTC (`age/status.ts:23`) | Client | Delivery preference | **Yes, for delivery timing only.** Not a matching signal. Timezone as a language proxy is unreliable |
| **Xolacer role / specialties** | `users.isXolacer` (`schema.ts:2863`); `xolacer_profiles.specialties` (`:3054`) | Live | Xolacer onboarding | Map: letters are separate from Xolacers chat | **No.** Mixing roles would create the link the map rules out |
| **Mirror tone / preferences** | `preferences.mirrorTone` etc. (`schema.ts:1782-1788`) | Live | Settings / learned | Own preference | **Unclear, low value.** Could steer which letter (gentle vs direct), not who gets it |
| **Account state, data wipe, retention** | `users.accountStatus` (`schema.ts:2840`), `emotional_profiles.dataWipeInProgress`, `preferences.dataRetentionPreference` (`:1755`) | Live | Lifecycle | Deleted/purging users must not be recipients. Retention purges sessions (`jobs/dataRetention.ts:24-46`) | **Yes, as hard exclusions** |
| **Consent ledger** | `consent_records` (`schema.ts:334-366`); API `consent.ts:9-107` | Append-only, latest wins (`consent.ts:68-96`) | Three types auto-granted at sign-up with no UI (`users.ts:172-187`). `voice_processing` granted by the client (`apps/mobile/src/features/consent/voice-processing-consent.ts`) | Schema principle "Consent is append-only. Never mutate, always audit." (`schema.ts:46`). No server path reads `pattern_analysis`, `reflection_pool_contribution`, `nudge_delivery` or `anonymized_research` | **The place a letters consent would go** (a new literal is an additive change). Today it gives no usable signal. Its defaults were never shown to the user, so they can't stand in for informed consent to letters |

## How cross-user features handle privacy today (precedents)

1. **Peer reflections (`reflections`).** The author link is cut when the row is created:
   "NO reference to users, profiles, or sessions … structural, not policy"
   (`schema.ts:2084-2092`). Entry needs fresh opt-in each time plus a crisis gate
   (`lib/poolability.ts:8-25`), and the timestamp is rounded to the day
   (`schema.ts:2097-2098`). Matching reads the **viewer's** own metadata
   (`reflections.ts:32-61`). Semantic matching is Plus-only (`sessions.ts:461-470`), so
   it is not a model for a free feature.
2. **Session-suggested Xolacer.** It picks a person from the seeker's own session.
   "Stores nothing … no record links a session to a xolacer"
   (`ai/xolacers/suggest.ts:20-23`). Analytics log the score, "never who was chosen"
   (`:28-29`). Suppressed themes, elevated/crisis, and tap-only entries never route to a
   stranger (`lib/xolacerSuggestion.ts:29`, `:83-127`).
3. **Weekly cohort.** It shows a count, never content. No safeguard filter is needed
   "because nothing about any session is surfaced" (`lib/cohortCard.ts:46-55`), and
   counts below 3 never ship (`lib/cohortCard.ts:30`).
4. **Personal memory.** One namespace per user, never searched across users
   (`rag.ts:18-20`). The toggle removes words, not metadata (`episodicMemory.ts:113-142`).

## Implications for matching (options and risks, not decisions)

- **Direction of data flow is the new thing.** In every precedent the viewer's data
  picks content *for the viewer*. Letters use the recipient's private data to decide
  *whose* content they receive. The sender learns nothing directly, but invariant 6
  ("anything shared with others is anonymised first") says nothing about this
  direction, and `VISION.md:20` leaves the exact promises as `TODO(founders)`.
  Options: (a) treat it like reflection matching (Xolace using your data for you,
  covered by "how Xolace meets you"), or (b) add a `letter_receiving` consent literal
  and an explicit opt-in to receive letters. That also handles supply and gives people
  a way out. (b) is an additive schema change. Don't reuse the silent sign-up
  defaults.
- **Inference risk on the sender side.** If the sender picks a theme or emotion ("for
  someone who's grieving"), a delivered letter and its acknowledgement tell the sender
  that *some* user matched it. With a small pool (adults × same language × recently
  active × matching emotion) that can narrow down to very few people. Mitigations used
  elsewhere: a floor before anything is revealed (`COHORT_FLOOR = 3`), rounded or
  delayed timestamps (`reflections.addedAt`), and storing no match rationale.
- **Store as little as possible.** Following the Xolacer precedent, the letter row
  could hold only `recipientProfileId`, never the session, emotion or score that chose
  them. Analytics would log match quality, never identities. Then a breach or admin
  view of letters reveals nothing about why someone got one.
- **Cheapest matching that respects the rules:** the recipient's most recent
  `emotional_metadata` (primary emotion family + theme + intensity band), with
  `dominantEmotionTags` as a fallback, compared against a classification of the letter
  made when it passes the safety check. That needs no new model call on the recipient
  side and no cross-namespace vector search. Its weakness is staleness: it's only as
  fresh as the recipient's last session.
- **Hard exclusions the code already implies:** not adult per `effectiveAgeStatus`;
  account deleted, purging, or wipe in progress; latest safeguard elevated/crisis, or an
  active acute or escalation-derived follow-up (unless the safety ticket chooses
  pre-vetted letters for them); suppressed themes; tap-only latest session (thin
  signal).
- **Missing prerequisites:** a user language signal (nothing exists), and an
  age-declaration path for letters (`age_declarations.surface` is
  `v.literal("xolacer_chat")`, so letters need a widened union, which is additive).
  Most users have `unknown` age today, which shrinks the initial pool.
- **Avoid:** cross-user search of personal RAG namespaces, semantic profiles and raw
  text as matching input (they break stated guarantees or need a model call per
  candidate), and Xolacer roles (the map keeps letters separate).
- **Open for founders:** whether consent defaults granted without UI count as consent
  (they currently do nothing). Whether the intake and mood copy ("only change how
  Xolace meets you", "helps you notice patterns") covers being chosen as a recipient.
  How retention and deletion treat a delivered letter that was chosen using data later
  purged.

## Sources not found

- `docs/adr/` doesn't exist in this repo. ADRs cited in code comments (0004, 0007,
  0018, 0021) refer to the pre-migration `xolace_app` repo and weren't read.
- The Glossary in root `AGENTS.md` doesn't yet define **letter / sender / recipient /
  acknowledge**. This doc uses the definitions in map #743.
