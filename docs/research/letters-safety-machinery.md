# Letters: safety machinery a letter check can reuse

Researched 2026-11-12 for [#746](https://github.com/xolace-official/xolace/issues/746) (map: [#743 Letters to strangers](https://github.com/xolace-official/xolace/issues/743)). Read-only survey: nothing here is a decision. Paths are relative to `packages/backend/convex/` unless they start with `docs/` or `apps/`. Prices and line numbers go stale; re-check before relying on them.

## Short answer

Xolace already has every building block a **pre-delivery letter check** needs, but no single function that does the whole job, and no human review surface at all.

- **Crisis in the sender's words:** the safeguard engine (OpenAI moderation + Haiku classifier + rules) already runs on short, free-standing text in intake's `checkAnswerSafety`. That is the closest template for a letter.
- **Harm aimed at the other person, spam, contact details:** the Xolacer DM classifier (`ai/chat/classify.ts`) asks exactly those questions (crisis about the *sender*, harassment, spam/solicitation, contact leak) in one Haiku call. Its prompt is DM-specific today.
- **Phone numbers, @handles, app names, URLs:** only as Stream blocklist rules on the chat channel type. They run inside Stream, not in Convex, so a letter (which is not a Stream message) can't use them as they are.
- **Identifying details (names, places, employers):** only the peer-pool distiller strips these, by *rewriting* the text. Nothing *detects* them.
- **Recipient report:** `product_feedback` (`kind: "concern" | "flag"`) plus its rate-limit bucket is the existing report path. It is keyed to `xolacer_conversations` and also files into Stream's dashboard.
- **Who is alerted:** nobody, in real time. Escalation events, chat moderation verdicts and concerns are rows in Convex (and flags in Stream's dashboard). `apps/admin` has no view of any of them, and there is no alert, email or Slack hook.

## The pieces

### 1. OpenAI moderation (`moderateInput`)

- **Where:** `ai/providers/moderation.ts:63-119`. Cached variant `moderationCache` (`ai/cached.ts:10-16`, 48 h TTL, keyed on the text).
- **Input/output:** `text` (+ optional `AbortSignal`) → `{ flagged, categories, categoryScores }` over 13 categories: harassment(/threatening), hate(/threatening), illicit(/violent), self-harm(/intent, /instructions), sexual(/minors), violence(/graphic) (`moderation.ts:3-23`). Model `omni-moderation-latest` (`:81`).
- **Fails open:** any error, missing key or 10 s timeout returns `MODERATION_UNAVAILABLE` (`flagged: false`, empty scores) (`:41-54`). Callers must tell "clean" from "never checked" themselves; `dailyQuotes.reply` does (`dailyQuotes.ts:321-334`, `schema.ts:436-452`).
- **Cost:** free. OpenAI: "The moderation endpoint is free to use" ([OpenAI moderation guide](https://developers.openai.com/api/docs/guides/moderation)). The guide lists no languages and no rate limits.
- **Latency:** not measured in the repo; callers bound it (10 s hard timeout, 8 s in intake, 3 s phrase wait).
- **Catches:** explicit harm categories. **Doesn't:** contact details, links, spam, identifying info, or subtle non-crisis harm (the guide lists only the harm categories).
- **Who it alerts:** no one by itself.
- **Fit:** pre-delivery check, yes (cheap first gate). Recipient report: no.

Existing "moderation only" uses, each a different reading of the same scores:
- `dailyQuotes.reply` (`dailyQuotes.ts:280-341`): reply is *kept* even if flagged; flagged → client shows crisis resources; no escalation row. ADR 0006.
- Vent (`vent.ts:119-161`): keyword hit is confirmed by moderation (self-harm ≥ 0.35); unavailable → stays in crisis (fails safe).
- Live talk (`talk/safety.ts:93-95`): `evaluateSafeguard(UNCLASSIFIED, m, [])`, so only moderation's explicit signals can escalate.

### 2. The safeguard engine (`evaluateSafeguard`)

- **Where:** `ai/safeguard.ts:244-269`. Pure, no LLM. Inputs: a `ClassificationResult` (Haiku 5.5 classifier, `ai/providers/anthropic.ts:26`), a `ModerationResult`, and recent-session metadata for pattern escalation.
- **Output:** `level` (`none | gentle | elevated | crisis`), `shouldReject` + `rejectionReason`, `triggerType`, `triggerConfidence`, `triggerEvidence` (clinical summary, never the user's words), `resourcesPresented`, plus derived `isCrisis`, `isEscalation`, `riskFlag` (`:42-64`).
- **Rules, in order** (`:249-259`):
  - *Reject:* `sexual/minors` (unless a survivor narrative), `hate/threatening`, `violence + harassment` (unless survivor) (`:413-448`).
  - *Crisis:* `self-harm/intent > 0.7` or `self-harm/instructions`; or `self-harm > 0.5` with intensity ≥ 9 (`:458-507`).
  - *Elevated:* survivor narrative with sexual/violence flags; `self-harm > 0.3`; intensity ≥ 9 + high-distress emotion; 3 of the last 5 sessions in 48 h risk-flagged + current distress (`:518-605`).
  - *Gentle:* violence without harassment; intensity ≥ 7 + distress emotion (`:617-647`).
- **Resources:** `CRISIS_RESOURCES`, `SUPPORT_RESOURCES`, `TRAUMA_RESOURCES` are Ghana-only plus an IASP link (`:101-172`). The outreach spec already flags this and plans a shared `convex/lib/crisisResources.ts` built from `apps/mobile/src/features/crisis-resources/data.ts` (outreach spec lines 443-447, 652).
- **Cost per call (estimate):** classifier prompt file is ~11.5 KB (`ai/prompts/classifier.ts`), so roughly 3k input tokens + the letter, `max_tokens: 512`. Haiku 5.5 is $0.10/MTok in, $0.50/MTok out up to 100k tokens ([Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)). About **$0.0005 per letter**, plus free moderation.
- **Catches:** the sender's own risk (explicit and implicit), and gross content-policy violations. **Doesn't:** hostility that isn't threatening/hateful, contact info, links, spam, identifying details. Its rejection is tuned to *let a person's own pain through* (survivor carve-outs). For a letter that is the wrong default: a graphic trauma story is fine in your own journal and not fine in a stranger's inbox.
- **Who it alerts:** writes nothing itself. In the session pipeline, an escalating verdict becomes an `escalation_events` row (see 4).
- **Fit:** pre-delivery, yes, for "is the sender in crisis". Recipient report: no.

The closest template is **intake's `checkAnswerSafety`** (`ai/intake/read.ts:161-173`). It runs safeguard over free-standing words with no session and no history:
- a deterministic phrase floor first (`talk/safety.ts:29-75`, English-only regexes): a clear crisis phrase answers at once;
- moderation and the classifier in parallel, each with its own 8 s deadline (`read.ts:57`, `:117-151`), falling back to `MODERATION_UNAVAILABLE` / `UNCLASSIFIED`;
- a content-policy rejection there just means "no escalation" (`:147-150`);
- nothing stored or cached (`:2-8`).

The outreach spec reuses this same recipe for Telegram free text: "OpenAI moderation plus Haiku classification with the `UNCLASSIFIED` fallback, as in intake. If both fail, the reply goes out with Support resources attached" (`docs/plan/outreach-layer.md:396-398`, on branch `feat/outreach-channels`, commit `79db9b1b`; not yet on `dev`).

### 3. Xolacer DM moderation (post-delivery lane, #344)

- **Where:** `ai/chat/classify.ts` (prompt, parser), `ai/chat/moderate.ts` (action). Triggered from `streamWebhook.ts:106-121` *after* the message was delivered and its push scheduled.
- **Input/output:** `text`, `senderRole` → `{ crisis: SafeguardLevel, harassment, spam, contact, confidence }` (`classify.ts:15-21`). One Haiku 5.5 call, `max_tokens: 200` (`moderate.ts:79-85`, model `anthropic.ts:57`). Skips text under 2 words or with no letters (`classify.ts:38-60`). Malformed output degrades to "quiet" and never flags anyone (`:101-133`).
- **What the prompt asks** (`classify.ts:66-96`):
  - crisis about the *sender's own* safety (a message wishing harm on the other person is harassment, not crisis);
  - harassment aimed at the other person;
  - spam: selling, recruiting, MLM, church, asking for money;
  - contact: phone, @handle, email, invitation to WhatsApp/Telegram/Signal/etc.
- **Effects:** crisis/elevated → a resources card posted into the channel; any category → `flagStreamMessage` into Stream's dashboard queue; then one `chat_moderation_events` row (categories + confidence, never text) (`moderate.ts:133-171`, `schema.ts:225-244`). Retries 5 times with backoff (`moderate.ts:121-166`).
- **Cost (estimate):** system prompt ~3 KB ≈ 750 tokens + the letter ≈ 1k input, ~40 output. About **$0.00012 per letter** at Haiku 5.5 prices.
- **Who it alerts:** the sender (via the card) and the Stream dashboard queue. No Convex view of it.
- **Fit:** the four questions are close to what a letter needs. As written it is post-delivery, hard-wired to Stream ids, and its prompt frames "a seeker talks one-to-one with a volunteer listener". A letter check would need the same prompt reworded for "an anonymous letter to a stranger" and a pre-delivery verdict instead of a card + flag.

### 4. Escalation events (`escalation.ts`)

- **Where:** `escalation.create` (`escalation.ts:15-56`), `recordUserResponse` (`:61-90`); table `escalation_events` (`schema.ts:855-890`).
- **Shape:** requires `sessionId` and `emotionalProfileId`; stores `actionTaken`, `resourcesPresented`, `triggerType`, `triggerConfidence`, `triggerEvidence` ("NEVER paraphrased user language", `escalation.ts:10-13`); one event per session (`:26-34`); marks `sessions.escalationTriggered`.
- **Retention:** never deleted; anonymised on account deletion (`schema.ts:855-861`).
- **Human review:** `reviewedByHuman`, `reviewedAt`, `reviewerNotes` fields exist (`schema.ts:878-883`), but no function writes them and no admin view reads them.
- **Cost:** a mutation; no external call.
- **Fit:** a letter whose sender is in crisis would want an escalation row, but `sessionId` is required today. The outreach spec already plans the additive widening: `sessionId` optional, new `source` field, its own dedupe (`outreach-layer.md:429-432`). Letters could add a source value the same way.

### 5. Stream pre-delivery regex lane (chat only)

- **Where:** `lib/streamSetup.ts:41-79`, applied by `streamSetup.setup` (`streamSetup.ts:56-172`).
- **Rules:** `contact_leak` regex blocklist (phone shapes `\+?\d[\d\s().-]{7,}\d`, `@handle`, WhatsApp/Telegram/Snapchat/Instagram, "my ig / on snap / via signal") plus Stream's built-in `url_detection_v1`. Action is **flag, never block**: "a phone number can be a step someone chose, and a human decides that, not a regex" (`lib/streamSetup.ts:41-45`). Automod and profanity lists stay off (`:7-11`).
- **Cost:** included. Stream's chat pricing lists "Profanity Filter & Block List" in every plan ([Stream pricing](https://getstream.io/pricing/)).
- **Fit:** the regexes are the useful part. They live in Stream's matcher (RE2), so a letter stored in Convex would need them run in Convex, or would need Stream's general check API (next item).

### 6. Stream Moderation `check` API (not used today)

- Stream's Moderation product can check arbitrary content, not just chat messages: `client.moderation.check` with `entity_type` (any identifier, e.g. `user:profile`), `entity_id`, `entity_creator_id`, optional `moderation_payload.texts` and `config_key`. Returns `recommended_action` `flag | remove | keep`. "An item is created whenever the action isn't `keep`", reviewable in the dashboard or the review-queue API ([Stream check docs](https://getstream.io/moderation/docs/node/content-moderation/check/), [custom content](https://getstream.io/moderation/docs/node/integrations/custom-content/)).
- **Cost:** AI text moderation pay-as-you-go **$2.00 per 1,000 text items**, with $100 of free credit each month ([Stream moderation pricing](https://getstream.io/moderation/pricing/)). That is ~$0.002 per letter: 4x the full safeguard pair, 16x the DM classifier.
- **Fit:** it would put letters in the same dashboard queue where chat flags and concerns already land, which is the only review surface the team uses today. It also sends letter text to one more processor (privacy, invariant 6). Not evaluated hands-on.

### 7. Recipient report: concerns and flags (`productFeedback.ts`, `productFeedbackFlags.ts`)

- **Concern:** `productFeedback.submit` with `kind: "concern"`, 1-1000 chars of text, optional `subjectProfileId` and `conversationId` (`productFeedback.ts:68-124`). Own rate-limit bucket `concernReport`, 2 per day (`lib/rateLimits.ts:65`); the limit message points to support@xolaceinc.com (`productFeedback.ts:31-37`). With a subject, it schedules `flagSubjectOnStream` → Stream `/moderation/flag` on the user (`productFeedbackFlags.ts:55-71`, `integrations/stream.ts:357-364`). PostHog gets only `{ hasSubject }` (`productFeedback.ts:126-151`).
- **Flag:** `productFeedbackFlags.flagMessage`: one message, no text, no budget; the subject is derived server-side from the conversation (`productFeedbackFlags.ts:14-52`).
- **Table:** `product_feedback` (`schema.ts:1915-1960`). Kept past account deletion, anonymised.
- **Fit:** the shape (no budget for pointing at evidence, subject derived server-side, structural-only analytics) suits a letter report. But `flagMessage` requires a `conversationId`, and the table has no letter id. A letter report needs an additive field (e.g. `letterId`), or its own mutation. The recipient must not learn the sender, so the subject must be derived server-side from the letter, never shown.

### 8. Block and freeze (Xolacers)

- `xolacerChat.blockConversation` freezes every Stream channel the pair holds, permanently, and nobody is told (`xolacerChat.ts:1779-1818`; `freezeStreamChannel`, `integrations/stream.ts:244-252`).
- **Fit:** letters are one-way with no channel, so freezing doesn't apply. The idea that may carry over is "this sender never reaches me again", which would be a matching exclusion, not a Stream call.

### 9. Account suspension

- `users.accountStatus` has `"suspended"` (`schema.ts:2840-2845`) and `requireAuth` refuses any non-active account (`lib/auth.ts:43-48`). No function sets `suspended`; the only operator tool is `admin/xolacers.promoteXolacer`, run by CLI (`admin/xolacers.ts:1-77`).
- **Fit:** a blunt last resort for a repeat abuser. It locks the whole app, not just letters, and has no UI.

### 10. The distiller (anonymiser for the peer pool)

- `ai/prompts/distiller.ts` rewrites raw text into an anonymous first-person reflection: "Remove all proper nouns (people, places, companies, schools)" (`:46`, `:59`). Haiku 5.5 (`anthropic.ts:37`). Gate: `lib/poolability.ts:19-47` (consent + never crisis).
- **Fit:** the only existing tool against identifying details, but it *rewrites*. Running it on a letter means the recipient reads Xolace's words, not the sender's. It could be repurposed as a detector ("does this name a person, place, school or employer?") rather than a rewriter.

## Summary table

| Piece | Catches | Cost / letter | Alerts | Pre-delivery | Report |
|---|---|---|---|---|---|
| OpenAI moderation | explicit harm categories | free | nobody | yes, first gate | no |
| Safeguard engine (+ Haiku classifier) | sender crisis, gross policy violations | ~$0.0005 (est.) | nobody; escalation row in session flow | yes (`checkAnswerSafety` template) | no |
| DM classifier | sender crisis, harassment, spam, contact | ~$0.00012 (est.) | sender card + Stream queue | yes, if reworded and made pre-delivery | no |
| `escalation_events` | records a crisis verdict | none | nobody (no review UI) | yes, needs `sessionId` widening | no |
| Stream `contact_leak` + URL lists | phones, handles, app names, links | included | Stream queue | only inside Stream chat | no |
| Stream `moderation.check` | configurable engines | $0.002 after free credit | Stream queue | possible | possible (queue) |
| Concern / flag | human judgment | none | Stream queue + `product_feedback` | no | yes, needs letter id |
| Suspension | repeat abuser | none | n/a | n/a | last resort |
| Distiller | identifying details (by rewriting) | ~Haiku call | nobody | possible as detector | no |

## Gaps letters would leave

Options and risks only; decisions belong to the policy ticket.

### A sender in crisis writing a letter

- **Gap:** every crisis path today answers the person *where they are*: a mirror, a talk, a DM card, a Telegram reply. A letter is written into a compose screen and then held, so there is no defined place to answer. `escalation.create` also needs a session.
- **Options:** run the `checkAnswerSafety` recipe (phrase floor + moderation + classifier) on submit and show the crisis screen inline before anything is sent; widen `escalation.create` the way the outreach spec does (`source: "letter"`); hold the letter (don't deliver; maybe offer to send it later) rather than reject it.
- **Risks:** the check must answer within the compose screen's wait, or the person leaves before seeing help (intake's 8 s / 12 s budget is the precedent). Rejecting a crisis letter with no explanation is the "worse than not asking" outcome ADR 0006 warns about. Delivering it is worse: it puts a stranger in the position of a crisis responder. The phrase floor is English-only; same-language matching means non-English letters rely on moderation and the classifier alone.

### Subtle harm that isn't crisis

- **Gap:** moderation and safeguard reject only threatening hate, violence + harassment, and sexual content involving minors, with survivor carve-outs. Nothing catches advice that hurts ("just stop taking your meds", diet tips, "God is punishing you"), minimising ("others have it worse"), forced positivity (invariant 3), proselytising, or graphic trauma dumped on a stranger. The DM classifier's "harassment" means hostility toward the reader, which most of these aren't.
- **Options:** a letter-specific classifier prompt (DM classifier shape, new questions: medical/medication advice, religious push, minimising, graphic detail, is it addressed to the reader at all); a Stream `check` policy with LLM review; human review of every letter at launch volume.
- **Risks:** a too-strict prompt holds back sincere letters and makes writing feel policed. A soft one lets through the letters that hurt a vulnerable recipient most. Human review of everything doesn't scale, and there is no admin view to do it in.

### Contact details, links and identifying info

- **Gap:** the regexes exist only as Stream blocklist rules on the chat channel type. Nothing in Convex checks a free text for phones, handles, emails or URLs. Names, schools, towns and employers are caught only by the distiller rewriting text.
- **Options:** port `CONTACT_LEAK_BLOCKLIST` and a URL pattern into a pure Convex helper (RE2-compatible today, so JS-compatible); the DM classifier's `contact` question; a distiller-style "identifying details?" question in the same call. For letters, "hold or bounce back to the sender to edit" fits better than chat's "flag, never block", because the recipient can't ask, and a letter has no back-and-forth to correct course.
- **Risks:** regex false positives (years, prices, verse numbers); misses on obfuscation ("zero five five…"). Identifying info is the hardest to detect and the most damaging for privacy (invariant 6), both for the sender (doxxing themselves) and for third parties named in the letter.

### Spam and volume abuse

- **Gap:** the DM classifier's `spam` flag catches selling, recruiting, MLM and money. Nothing yet throttles letters or catches one person sending the same letter to many people, or a copy-paste farm.
- **Options:** a rate-limit bucket (`lib/rateLimits.ts` pattern, charged before any paid call like `dailyQuotes.beginReply` at `dailyQuotes.ts:304-318`); a hash or embedding check for near-duplicates; the classifier's `spam` question.
- **Risks:** a strict cap pushes people toward volume-as-achievement thinking if sparks enter later (open on the map). Near-duplicate detection would block sincere, short, common letters ("you're not alone").

### Review and alerting (cross-cutting)

- **Gap:** no one is alerted in real time by any existing path, and `apps/admin` has no view of escalations, chat verdicts or concerns. Stream's dashboard is the de facto queue, and letters aren't in Stream.
- **Options:** an admin moderation view (`convex/admin/*`, `adminQuery`) over a letter verdict table; or Stream `moderation.check` to reuse the dashboard; or both, with the Convex row as the record.
- **Risks:** a hold-for-review policy without a working queue means letters stuck forever. A report that lands where nobody looks breaks invariant 7's promise.

### Smaller gaps noted

- Crisis resources are Ghana-only in `ai/safeguard.ts`; a shared list is planned on the outreach branch but not on `dev`.
- `MODERATION_UNAVAILABLE` is indistinguishable from clean unless the caller checks identity (`dailyQuotes.ts:321-323` does). A pre-delivery check must decide whether "no verdict" holds the letter.
- Store-gap: any new verdict fields on `escalation_events` or `product_feedback` must be optional (root `AGENTS.md`, store-gap rule).

## Sources

- Code: files and lines cited inline (branch `dev` at `de3a3e38`).
- `docs/plan/outreach-layer.md` at commit `79db9b1b` (branch `feat/outreach-channels`), lines 395-447, 652.
- [OpenAI moderation guide](https://developers.openai.com/api/docs/guides/moderation): free, text + image, category list.
- [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing): Claude Haiku 5.5 $0.10 / $0.50 per MTok (prompts up to 100k tokens).
- [Stream Chat pricing](https://getstream.io/pricing/): blocklist and moderation dashboard included in all chat plans.
- [Stream Moderation pricing](https://getstream.io/moderation/pricing/): AI text $2.00 per 1,000 items, $100 monthly free credit.
- [Stream `moderation.check`](https://getstream.io/moderation/docs/node/content-moderation/check/) and [Moderate any content](https://getstream.io/moderation/docs/node/integrations/custom-content/).
