# Proactive outreach: reaching users outside the app

Researched 2026-10-30. Prices, policies and package versions go stale quickly; re-check them before you build. Users opt in explicitly in every option below, so this doc notes only the **hard** platform and policy rules that block or shape an implementation. Tags: **[V]** checked on a primary source this session, **[S]** secondary source only, **[U]** unverified.

## TL;DR

Xolace already has a strong proactive core: tiered follow-up workflows, AI-written nudge copy, Reach presets, a Quiet Window and per-type rate limits. The core is fine; delivery is the weak part. Everything leaves through one pipe, an Expo push (`convex/notifications.ts`), and a push can only be read. The user can't answer it where it lands. The opportunity is to keep the brain and add **channels people can reply on**, with every reply routed back into the same follow-up card.

Ranked recommendations:

1. **Build a channel-agnostic `outreach/` layer on Convex** (an outbox, a channel identity table and an inbound router). Make the current push path its first adapter. Everything below is an adapter on that layer. Write it ourselves; it is small, and no component does it.
2. **Telegram first among the messaging apps.** It is free and has no templates, no session window and no registration. Linking is a one-tap deep link (`t.me/<bot>?start=<token>`). A bot can message first once the user has pressed Start. The engineering cost is lowest. Use `convex-telegram` as a reference, or adopt it thinly (it is a typed Bot API client plus webhook verification).
3. **SMS as the universal fallback, via `@convex-dev/twilio`.** It reaches everyone, and replies are natural. It costs about $0.012 per US message with carrier fees. The hard gate is US A2P 10DLC or toll-free verification, which needs about two weeks of lead time. Rosebud is the only mainstream app doing SMS nudges, and it doesn't support replies.
4. **WhatsApp for markets outside the US.** Business-initiated messages need **pre-approved templates** (a utility category fits a check-in). Free-form AI replies are allowed only inside the 24h window the user's reply opens. Meta's 2026 terms ban *general-purpose* AI assistants but not a business using AI for its own service. Build our own adapter, borrowing from `convex-whatsapp`. Its Graph API v18.0 pin and missing window tracking rule it out as-is.
5. **Outbound AI voice check-ins.** We already run an ElevenLabs agent with our own Custom LLM brain (`convex/http.ts` `/v1/chat/completions`, `convex/talk/`). ElevenLabs offers Twilio outbound calls through an API (`POST /v1/convai/twilio/outbound-call`) at about $0.08/min plus about $0.014/min Twilio. A scheduled "two-minute call" follow-up is a **genuine first** in this category. It needs prior express consent under the TCPA (FCC 24-17).
6. **On-device surfaces that ask, not just tell.** These are an interactive "how's today?" widget (iOS 17 App Intents buttons, via `expo-widgets`) and an acute-tier Live Activity (push-to-start, iOS 17.2+). They need no third party and no per-message cost, and they never leave the device's privacy envelope.
7. **Email via `@convex-dev/resend`** for the weekly "your week in Xolace" note and as a long-gap re-entry channel. Use it directly.
8. **Skip for now:**
   - Apple Messages for Business: Apple is *not onboarding health businesses* and forbids bot-only setups [V].
   - Photon/spectrum-ts iMessage: a tiny, new, unsanctioned transport (see below).
   - Slack: B2B, with Marketplace gates.
   - Discord: its docs discourage unprompted DMs.
   - Smart speakers: Google Assistant's conversational Actions were sunset; Alexa offers notifications only.

**White space:** no credible mental-health product sends a check-in on a messaging channel **that the user can answer there, with the reply continuing the same AI follow-up thread**. Pi left messaging apps in May 2024. Woebot closed its consumer app on 2025-06-30. Ebb doesn't start conversations. The products that do message first are companionship and entertainment apps (Replika, Character.AI, Nomi, Kindroid, Meta AI). See [Competitors](#competitor-landscape).

## Current Xolace follow-up state

Everything proactive runs in Convex and is delivered only as Expo push.

- **Follow-up cards** (`packages/backend/convex/followUps.ts`, table `follow_up_cards`). A session that ends unresolved (escalation, gave up, or flagged by the AI) gets an AI-written card via `ai/followUpCard.ts`. It also starts a durable `@convex-dev/workflow` with two nudges and an expiry. The cadence comes from `lib/followUpCadence.ts`:
  - **acute** (safeguard crisis): nudges at 45 min and +4 h; expires after 48 h.
  - **elevated**: nudges at 12 h and +1 day; expires after 7 days.
  - **standard**: nudges at 24 h and +3 days; expires after 14 days.

  `sendFollowUpNudge` checks `preferences.notifications.enabled && gentleReturn`. An acute push uses a fixed copy with no reference to what hurt. A card naming a compounding domain stays in the app, because "the lock screen isn't private". When the user comes back, `markReturn` flips the card to `ready`. The in-app card then collects a response: `lighter | still_here | heavier | processed | vent | dismissed`, plus an optional reflection (`followUpResponses.ts`, table `follow_up_responses`).
- **Notification pipeline** (`notifications.ts` `schedule`):
  - Rate-limits per type bucket (`lib/rateLimits.ts`): `notification` 1/day, `followUpNudge` 1/day, `followUpAcute` 3/day, `kindlingReady` 1/day, `domainUnlock` 1/week.
  - Logs every attempt to `notification_log` with `suppressedReason`, `reachUsed`, `generatedBy`, `landed` (the "What landed?" feedback) and `resultedInSession`.
  - Delivers through the `@convex-dev/expo-push-notifications` component (`convex.config.ts`).
- **Crons** (`crons.ts`): gentle return every 6 h and pattern nudges hourly (`jobs/notificationTriggers.ts`; users inactive for 30+ days are skipped), plus nightly quotes.
- **Preferences** (`schema.ts` `preferences.notifications`):
  - Toggles: `enabled`, `gentleReturn`, `patternNudge`, `milestone`, `streakMilestone`, `chat`.
  - Settings: `quietWindow {dontReachBefore, dontReachAfter}`, `reach: warm|direct|quiet`, `timezone`.
  - All toggles default to false. Permission is requested after the third session.
- **Consent** (`consent.ts`, append-only `consent_records`): `consentType` already has `nudge_delivery`. A new channel needs a new literal, which is an additive union widening.
- **Safety**:
  - `ai/safeguard.ts` is a rule engine over moderation and classification. Levels: `none | gentle | elevated | crisis`.
  - `escalation.ts` writes one `escalation_events` row per session, holding categories only and never the user's words.
  - `notification_log.suppressedReason` already has `escalation_active`.
- **Voice**: Talk runs on an ElevenLabs Conversational AI agent whose LLM is our own endpoint (`http.ts` → `ai/talk/chatCompletions`). Post-call deletion goes through a webhook (`talk/provider.ts`), and minutes are metered (`talk/time.ts`, `@clipin/convex-credits`).
- **Not present**:
  - Any HTTP inbound channel besides Stream, ElevenLabs and RevenueCat.
  - Phone or email outreach.
  - A channel identity table.
  - Widgets, Live Activities, calendar or HealthKit (`apps/mobile/package.json` has `expo-notifications` only).

## Channel matrix

Reach figures are self-reported by the platforms. "Effort" is for our stack (Convex + Expo + Clerk).

| Channel | Business can initiate? | Hard constraints | Cost (US) | Reach | Effort | Fit for check-ins |
|---|---|---|---|---|---|---|
| **Expo push** (today) | Yes | Android 13+ needs runtime permission, off by default [V]; vendor median opt-in about 50-61% [S] | Free | All app installs | Done | Good, but can't be answered in place |
| **Telegram bot** | Yes, **after the user presses Start** [V] | About 1 msg/s per chat, about 30/s broadcast [V] | Free | ">1B" MAU [S] | **Low** | **High**: free-form, replies inline, buttons |
| **SMS (Twilio)** | Yes, with consent | US 10DLC brand+campaign registration, or toll-free verification; unregistered traffic blocked since 2023-09-01 [V]; CTIA consent and opt-out [S] | $0.0083/segment + about $0.0035-0.005 carrier fee [V]; 10DLC fees about $4.50-46 once + $10/mo [S] | Every phone | Low-Med | **High**: universal; "reply 1/2/3" works |
| **RCS (Twilio/Google RBM)** | Yes | Carrier approval per agent; Google AUP bars misleading or harmful health content and PHI without consent [S] | Same as SMS for text [V] | iOS 18+ and Android, carrier-dependent [V] | Med | Medium: an SMS upgrade later |
| **WhatsApp Cloud API** | **Templates only**; free-form only in the 24h window after a user message [V] | Template approval; messaging tiers 250 → unlimited unique users per 24h [V]; Meta terms §4.7 bans general-purpose AI assistants [V]; health-data rule conditional on local law [V] | Per delivered template, by market; utility within the window **charged again from 2026-10-01** [V]; US rates not extracted [U] | 3B+ MAU [S] | Med | **High outside the US**; template-gated |
| **Apple Messages for Business** | No unsolicited messages; customer starts [V] | **"Not onboarding businesses that primarily offer medical or health-related services"**; no bot-only setups [V] | Via an MSP | iOS | n/a | **Blocked** |
| **iMessage via third party (Photon / spectrum-ts)** | Yes, technically | Not an Apple-sanctioned API; mechanism undisclosed [U] | Not published | iOS | Med | Risky; watch only |
| **Email (Resend)** | Yes | Gmail and Yahoo bulk rules: SPF/DKIM/DMARC, one-click unsubscribe, spam rate <0.3% [V] | Free 3k/mo; $20/50k [V] | Universal | **Low** | Medium: weekly digests, long-gap return |
| **Outbound AI voice** | Yes, with prior express consent (TCPA; AI voice = "artificial", FCC 24-17) [V] | Caller ID and disclosure; STIR/SHAKEN attestation [U] | Twilio $0.014/min + ElevenLabs about $0.08/min + LLM [V] | Every phone | Med (agent exists) | **High for elevated tier**; novel |
| **Widgets (interactive)** | n/a (on device; refreshed by push or timeline) | iOS 17+ for buttons [V]; dev build | Free | App installs | Med | High: "tap how you feel" on the home screen |
| **Live Activities** | Yes, push-to-start iOS 17.2+ [V] | 8 h active + 4 h on lock screen, 4 KB, hourly push budget [V] | Free | iOS installs | Med | Good for **acute** 48 h window only |
| **Calendar** | Yes, by .ics email or on-device event | iOS 17 write-only access via `expo-calendar` [V]; Google `events.insert` needs OAuth [V] | Free | Universal | Low | Good: "reflection appointments" |
| **Wearables** (HealthKit / Health Connect) | A trigger, not a channel | HealthKit background delivery entitlement, hourly caps for some types, observer must complete [V]; Health Connect `READ_HEALTH_DATA_IN_BACKGROUND` [V] | Free | Watch and band owners | High | Experimental trigger |
| **Slack** | Yes, DM where installed [V] | Marketplace needs 10+ workspaces and weeks of review; non-Marketplace apps get 1 req/min `conversations.history` since 2025-05-29 [V] | Free | Work contexts | Med | Low for consumers; B2B/EAP later |
| **Discord** | Technically (Create DM) | Docs: "DMs should generally be initiated by a user action"; mass DMs get blocked [V] | Free | 200M+ MAU [V, self-reported] | Med | Low |
| **Smart speakers** | Alexa notifications only (Proactive Events API, capped per 24h) [V]; Google conversational Actions sunset 2023-06-13 [V] | Skill certification | Free | Declining | High | Low |

## Per-channel notes

### Telegram
- **First contact:** "Bots can't start conversations with users. A user must either add them to a group or send them a message first" ([core.telegram.org/bots](https://core.telegram.org/bots)) [V]. After that, a bot may send unprompted messages ([bots/features](https://core.telegram.org/bots/features)) [V].
- **Linking:** a deep link `https://t.me/<bot>?start=<payload>` passes up to 64 characters (`A-Za-z0-9_-`) to the bot as `/start <payload>` ([bots/features#deep-linking](https://core.telegram.org/bots/features#deep-linking)) [V from general knowledge of the page; re-check the length cap]. Mint a single-use, short-lived token in Convex from a Clerk-authed mutation. The app opens the link, the webhook consumes the token, and we store `{chatId ↔ tokenIdentifier}`.
- **Interaction:** inline keyboards give one-tap answers (`lighter / same / heavier`) as `callback_query` updates, a direct map to `followUpResponses.record`. Mini Apps could host a mini check-in UI later [V].
- **Limits and cost:** about 1 msg/s per chat, 20/min per group, about 30/s overall; free ([bots/faq](https://core.telegram.org/bots/faq)) [V].
- **Fit:** best price/effort, strong in Eastern Europe, the Middle East, India, Nigeria, Iran and parts of LatAm. Weaker in the US.

### SMS and RCS (Twilio)
- **Price:** $0.0083 per outbound segment plus carrier fees (AT&T $0.0035, T-Mobile $0.0045, Verizon $0.005 on 10DLC) ([twilio.com/en-us/sms/pricing/us](https://www.twilio.com/en-us/sms/pricing/us)) [V].
- **Registration:** A2P 10DLC needs a Brand + Campaign with documented opt-in, opt-out (STOP) and HELP ([docs](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc)) [V]. Unregistered traffic gets error 30034 ([errors/30034](https://www.twilio.com/docs/api/errors/30034)) [V]. Toll-free numbers need verification instead ([docs](https://www.twilio.com/docs/messaging/compliance/toll-free/console-onboarding)) [V]. Plan about 2 weeks for vetting [U, typical].
- **Copy:** keep the content wound-free like today's acute push. The SMS preview sits on the lock screen and carrier filters dislike sensitive keywords [U].
- **RCS:** Twilio RCS went GA in Aug 2025 ([press](https://www.twilio.com/en-us/press/releases/rcs-general-availability)) [S]. iPhone has supported RCS since iOS 18, carrier-dependent ([support.apple.com/122195](https://support.apple.com/en-us/122195)) [V]. Google RBM policy bars PHI without consent and harmful health content [S]. Treat RCS as an upgrade of the SMS adapter (branded sender, buttons), not as a separate channel.
- **Convex:** `@convex-dev/twilio` 0.2.2 (Apache-2.0, updated 2026-10-07) sends SMS, registers `/twilio/incoming-message` and `/twilio/message-status`, and stores status [V: npm README]. **Use it directly.**

### WhatsApp (Cloud API)
- **First contact:** only approved templates (marketing / utility / authentication). Free-form service messages only in the 24h window opened by the user's last message or call. A click-to-WhatsApp ad opens a 7-day free entry window ([pricing](https://developers.facebook.com/docs/whatsapp/pricing)) [V].
- **Pricing:**
  - Charged per delivered message since 2025-07-01 ([updates](https://developers.facebook.com/docs/whatsapp/pricing/updates-to-pricing)) [V].
  - **From 2026-10-01:** utility messages inside the window are charged again; 1,000 free service messages per month per number; Meta Business Agent tokens cost $2/1M [V].
  - The marketing page still says utility replies are free. Trust the dated developer doc.
  - Per-country US/UK/IN/NG rates sit in CSV rate cards [U].
- **Limits:** messaging tiers of 250 → 2K → 10K → 100K → unlimited unique business-initiated users per 24h ([messaging-limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits)) [V]. Per-user marketing caps tied to read rate don't apply to utility templates [V].
- **AI policy:** Meta Terms for WhatsApp Business Platform §4.7 "AI Providers" bars providers of LLMs and general-purpose AI assistants where AI is the primary function ([terms](https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform), modified 2026-09-23) [V]. TechCrunch reports Meta saying businesses using AI for their own customer service aren't affected (new accounts from 2025-10-15, existing from 2026-01-15) [S]. Position Xolace's WhatsApp presence as **Xolace's own follow-up service**, not "chat with an AI about anything".
- **Health policy:** "Don't use WhatsApp for telemedicine or to send or request any health related information" applies *where regulations prohibit* sending it to systems without heightened protections ([policy](https://whatsappbusiness.com/policy/)) [V]. Xolace isn't telemedicine. Keep templates generic ("checking in on how this week's going") and avoid diagnoses.
- **Template design:** a `utility` "check-in" with quick-reply buttons (`Lighter`, `About the same`, `Heavier`). A button tap is a user message, so it **opens the 24h window**. The AI can then talk free-form at service-message rates. This button-tap-opens-window pattern is the key WhatsApp design move.

### Apple Messages for Business and iMessage
- **Apple Messages for Business policy** (v3.1, 2026-07-21) ([register.apple.com](https://register.apple.com/resources/messages/messaging-documentation/policies)) [V]:
  - No unsolicited messages.
  - Requires an approved Messaging Service Provider and live agents during business hours; "must not provide a limited or bot-only solution".
  - **"Apple is not onboarding businesses that primarily offer medical or health-related services or products."**
  - **Verdict: blocked.**
- **From the app itself:** an app can't send iMessages. `MFMessageComposeViewController` presents a draft the person sends themselves ([docs](https://developer.apple.com/documentation/messageui/mfmessagecomposeviewcontroller)) [V].
- **Branded identity:** Apple Business (formerly Business Connect) offers Branded Mail and Business Caller ID ([newsroom 2026-03](https://www.apple.com/newsroom/2026/03/introducing-apple-business-a-new-all-in-one-platform-for-businesses-of-all-sizes/)) [V-search]. Branded Caller ID is worth registering if we do voice calls, so the call shows "Xolace" rather than an unknown number.

### Email
- Resend: free 3,000/mo (100/day), Pro $20 for 50k ([pricing](https://resend.com/pricing)) [V].
- Gmail bulk sender rules (SPF/DKIM/DMARC, one-click unsubscribe, spam rate <0.3%) ([support.google.com/a/answer/81126](https://support.google.com/a/answer/81126)) [V]. Yahoo has the same ([senders.yahooinc.com](https://senders.yahooinc.com/best-practices/)) [V].
- `@convex-dev/resend` 0.2.10 (Apache-2.0, updated 2026-10-22) handles queueing, batching, idempotency keys, rate limits and status webhooks [V: npm README]. **Use it directly.**
- Best uses:
  - A weekly "what moved" note built from `compounding/insights`.
  - A one-time re-entry email after a stretch of no app use.
  - A `.ics` attachment for reflection appointments.

### Outbound voice check-ins
- **Cost:**
  - ElevenLabs Agents: `POST /v1/convai/twilio/outbound-call`, plus batch calling ([API](https://elevenlabs.io/docs/api-reference/twilio/outbound-call)) [V-search]. $0.08/min overage, LLM billed separately ([pricing](https://elevenlabs.io/pricing/agents)) [V].
  - Twilio: $0.014/min outbound ([voice pricing](https://www.twilio.com/en-us/voice/pricing/us)) [V].
  - A 3-minute check-in costs about **$0.30** plus LLM tokens.
- **Rules:** FCC 24-17 (Feb 2024) puts AI-generated voices under the TCPA's "artificial voice" rules: prior express consent, identification and disclosure ([FCC](https://docs.fcc.gov/public/attachments/FCC-24-17A1.pdf)) [V-search].
- **Why it's cheap for us:** the voice persona, safety rules (`talk/safety.ts`) and memory (`talk/memory.ts`) already exist and are driven by our Custom LLM endpoint. An outbound call is a new *trigger* for the existing Talk brain, not a new system.
- **Gaps to close:**
  - A phone number on the account (Clerk phone verification can supply it).
  - Answering-machine handling.
  - Post-call ingestion into a follow-up response.
  - Talk-time metering (`talk/time.ts`) for outbound minutes.
- OpenAI Realtime SIP is an alternative with a per-org outbound flag [S].

### Widgets, Live Activities, calendar
- **Interactive widgets:** iOS 17+ App Intents buttons ([WidgetKit](https://developer.apple.com/documentation/widgetkit/adding-interactivity-to-widgets-and-live-activities)) [V]. A widget showing today's question ("How's the weight you named Tuesday?") with three buttons can write a follow-up response with no app open (App Intent → shared storage → sync on next launch, or an authed fetch).
- **Expo:** `expo-widgets` covers iOS and Android widgets plus Live Activities with APNs updates; push-to-start needs iOS 17.2+; a dev build is required ([docs](https://docs.expo.dev/versions/latest/sdk/widgets/)) [V-search]. Android widgets use Jetpack Glance ([docs](https://developer.android.com/develop/ui/compose/glance)) [V].
- **Live Activities:** at most 8h + 4h, 4 KB payload, hourly push budget ([ActivityKit](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)) [V]. That fits the **acute** tier's 45-minute and 4-hour nudges exactly: a quiet lock-screen presence ("We're here. Tap to talk.") instead of two pushes. Android 16 Live Updates are restricted to rideshare, delivery and navigation-style uses [V-search], so it is iOS only.
- **Calendar:** `expo-calendar` offers iOS 17 write-only access, so we can add an event without reading the user's calendar ([docs](https://docs.expo.dev/versions/latest/sdk/calendar/)) [V]. Google `events.insert` with `sendUpdates=all` emails invites ([API](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert)) [V]. A recurring "10-minute reflection" event makes the *user's own calendar* the reminder system, which survives notification fatigue.

### Wearables as triggers
- **HealthKit:** `enableBackgroundDelivery` needs the background-delivery entitlement. Some types are capped hourly. Delivery stops after 3 uncompleted callbacks. It doesn't run in the Simulator ([docs](https://developer.apple.com/documentation/healthkit/hkhealthstore/enablebackgrounddelivery(for:frequency:withcompletion:))) [V]. Exact HRV and sleep delivery cadence [U].
- **Health Connect:** `READ_HEALTH_DATA_IN_BACKGROUND`, 30 days of history by default ([docs](https://developer.android.com/health-and-fitness/guides/health-connect/develop/read-data)) [V].
- **Precedent:** Headspace's Apple Watch app already nudges on HRV ([headspace.com](https://www.headspace.com/articles/headspace-unveils-new-apple-watch-experience)) [V via subagent].
- **Use:** a *trigger* (sleep debt three nights running, resting HRV below the personal baseline) that schedules a check-in on the user's chosen channel. Never a diagnosis.

### Slack, Discord, smart speakers
- **Slack:** a fine DM channel for an employer/EAP edition. Marketplace needs 10+ active workspaces and up to 10 weeks of review ([guide](https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide)) [V]. Non-Marketplace commercial apps get 1 req/min `conversations.history` ([changelog](https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps)) [V]. That doesn't hurt a check-in bot, which only needs `chat.postMessage` and events.
- **Discord:** "DMs should generally be initiated by a user action" ([docs](https://docs.discord.com/developers/resources/user)) [V]. Low fit.
- **Alexa Proactive Events API:** still documented, capped per customer per 24h, notification only ([docs](https://developer.amazon.com/en-US/docs/alexa/smapi/proactive-events-api.html)) [V].
- **Google:** conversational Actions were sunset 2023-06-13 ([docs](https://developers.google.com/assistant/ca-sunset)) [V].

## Component and sample-app evaluation

| Candidate | What it is (from source) | Maturity | Verdict |
|---|---|---|---|
| **`@spectrum-ts/convex`** (Photon) | iMessage/RCS/SMS through Photon's Spectrum Cloud. Inbound webhook HMAC-verified and written to a durable `inbound` table **before** the 200. Turn pipeline with `immediate` or `collapse` modes, cooperative cancellation (`isCancelled`), carry-forward context, paced `outbox` with deterministic `clientGuid`. Sends go through a gRPC sender in a Node action. `send()` takes an optional `chainId`, so a proactive send works, **but only to a `spaceId` already in `spaces`**, i.e. after the user has messaged once (`src/component/schema.ts`, `src/client/index.ts`). Outbound content: text and markdown only. | v0.1.1, created 2026-08-21, no commit since 2026-08-22, 4 GitHub stars, 0 weekly downloads, MIT, maintainers `qwerzl` + `photon_dev` ([npm](https://www.npmjs.com/package/@spectrum-ts/convex), [repo](https://github.com/photon-hq/spectrum-convex), [convex.md](https://www.convex.dev/components/spectrum-ts/convex/convex.md)) | **Don't adopt.** Photon doesn't disclose how it reaches iMessage ([photon.codes/spectrum](https://photon.codes/spectrum)) [U]. Apple's only sanctioned business channel excludes health [V], so the transport could vanish. **Borrow the pipeline design**: durable-before-ack, collapse mode with cancellation for LLM replies, outbox with idempotency keys. It is the best-thought-out inbound design of the four. |
| **`convex-whatsapp`** (sample on disk) | Meta Cloud API direct. GET verify plus POST with `x-hub-signature-256` HMAC; hands the raw body to `convex-webhook-receiver` (3 attempts, 30-day expiry) then `processEvent`. Tables: `messages` (status queued → sent → delivered → read → failed), `conversations` (per phone), `templates` (synced from the Graph API, status via webhook), `config`. `registerInboundHandler(handle)` schedules our mutation per inbound message. Outbound: text, template, media, interactive. | v1.1.5, Apache-2.0, 9 stars, last push 2026-06-19. **Pins Graph API `v18.0`** (`src/component/messages.ts:6`), released 2023; probably past Meta's ~2-year support window [U]. Depends on `convex-webhook-receiver: "latest"`. | **Reference / fork.** Reuse: signature check, template sync and status, the status state machine, the inbound-callback pattern. Gaps: no **24h service-window tracking**; no pricing-category awareness; `getMessages` reads a whole conversation; no identity linking; single phone number; unpinned dependency; old API version. |
| **`convex-telegram`** (sample on disk) | Thin component. One `webhooks` table (bot username, id, `secretHash`, settings). `setupWebhook` calls `setWebhook` with a generated `secret_token` and stores its SHA-256. `registerRoutes` checks `X-Telegram-Bot-Api-Secret-Token`, then calls typed per-update handlers **inline in the HTTP action**. Returns 500 on handler error, so Telegram retries. `bot.api.*` is a typed proxy over the full Bot API (`@gramio/types`). | v0.1.2 (2026-09-30), Apache-2.0, 3 stars, active (push 2026-10-25) | **Use thinly, or copy (about 300 lines).** Reuse: secret verification, the typed API proxy, webhook setup. Add ourselves: write the update to a table and return 200 before any LLM work (spectrum's pattern), `update_id` dedupe, `/start <token>` linking, `callback_query` → follow-up response, outbound pacing. |
| **`convex-slack`** (sample on disk) | Full multi-workspace Slack: OAuth v2 install with token rotation, signature check with 5-minute replay window (`src/client/index.ts:249`), Events API dedupe on `event_id` (`webhookEvents`), mirrors of channels/users/messages/reactions, interactions and commands logs, `scheduleMessage`, App Home `publishHomeView`, modals. | v0.0.3, Apache-2.0, 5 stars, push 2026-09-18 | **Reference only, later.** Good for a B2B/EAP edition. Too heavy for consumers: it mirrors every message, which we don't want. |
| **`@convex-dev/twilio`** | Send SMS; routes for incoming messages and delivery status; stores status. | 0.2.2, Apache-2.0, 2026-10-07 | **Use directly** for SMS. Voice calls go through ElevenLabs' Twilio integration, not this component. |
| **`@convex-dev/resend`** | Queue, batch, idempotency, rate limits, status webhook. | 0.2.10, 2026-10-22 | **Use directly.** |
| **`@convex-dev/expo-push-notifications`** | Already installed. | 0.4.2 | Keep. It becomes the `push` adapter. |
| **`@convex-dev/workflow`**, **`rate-limiter`** | Already installed and used by follow-ups. | 0.4.10 / 0.4.3 | Keep. Cadence stays in workflows; add per-channel buckets. |
| **`@convex-dev/workpool`** | Bounded parallelism with retries. | 0.4.15 | **Use** for outbox delivery (per-channel concurrency, retries on 429/5xx). |
| **`@convex-dev/action-retrier`** | Retries for one-off actions. | 0.3.1 | Optional; workpool covers it. |
| **`@convex-dev/crons`** | Runtime-registered crons. | 0.2.3 | **Use** for per-user check-in times (e.g. "Tuesdays 8pm Lagos time") instead of the hourly scan. |
| **`@convex-dev/agent`** | Threads and messages for LLM agents. | 0.7.9 | **Skip.** Our AI lives in `convex/ai/` with its own Understanding. The backend rules forbid re-deriving that state elsewhere (`packages/backend/AGENTS.md`). |

Package metadata comes from `npm view` and the GitHub API on 2026-10-30.

**Reuse list (concrete):**
- spectrum's durable inbound-then-ack, collapse + cooperative cancel, and `clientGuid` outbox.
- convex-telegram's `secret_token` hashing and typed Bot API proxy.
- convex-whatsapp's Meta HMAC check, template sync table and message status machine.
- convex-slack's replay-window signature check and `event_id` dedupe table.

## Competitor landscape

Details and full citations were gathered 2026-10-30. Several official sites blocked automated fetches; those rows rely on App Store listings or press (marked).

| Product | Proactive outreach today | Visibly not doing |
|---|---|---|
| **Woebot** | Consumer app **closed 2025-06-30**; now provider/payer tooling ([woebothealth.com](https://woebothealth.com/); shutdown via [MobiHealthNews](https://www.mobihealthnews.com/news/woebot-health-shutting-down-its-app)) [S] | n/a |
| **Wysa** | Push at agreed check-in times ([Wysa PDF](https://blogs.wysa.io/wp-content/uploads/2022/09/AI-and-IAPT-the-pathway-forward-Webinar.pdf)); WhatsApp in India per a Wysa-authored post [S; currently live U] | No SMS, widgets or Watch on the listing ([App Store](https://apps.apple.com/us/app/wysa-mental-health-support/id1166585565)) |
| **Headspace / Ebb** | Scheduled push reminders with calendar add ([help](https://help.headspace.com/hc/en-us/articles/115008276788-How-can-I-set-up-Reminders)); HRV-timed Apple Watch nudges ([article](https://www.headspace.com/articles/headspace-unveils-new-apple-watch-experience)); Ebb follows up *inside* chats on big moments ([BusinessWire 2025-12](https://www.businesswire.com/news/home/20251208896917/en)) | **Ebb never starts a conversation**; no messaging apps ([Ebb page](https://www.headspace.com/ai-mental-health-companion)) |
| **Calm** | Push reminders incl. Mood Check-In ([help](https://support.calm.com/hc/en-us/articles/360008620774-How-to-Set-Reminders)); Watch app | No AI companion; no messaging |
| **Replika** | AI-initiated push messages "throughout the day"; "checks in when it matters" ([App Store](https://apps.apple.com/app/replika/id1158555867)); in-app calls | No SMS or WhatsApp; "real contact" claim [U] |
| **Pi** | Was on SMS, WhatsApp, Telegram, iMessage and Messenger; **dropped May 2024** ([Neowin](https://www.neowin.net/news/inflection-ai-drops-support-for-pi-ai-on-messaging-apps/)) [S] | No messaging now; "personalized check-ins" claim [U] |
| **Character.AI** | "Away messages" by push and email [S/U] | No messaging apps |
| **Meta AI Studio bots** | Unprompted follow-ups in Messenger, WhatsApp and IG only within 14 days of the last user message, only after 5+ user messages, stop after one ignored ([TechCrunch 2025-07](https://techcrunch.com/2025/07/03/meta-has-found-another-way-to-keep-you-engaged-chatbots-that-message-you-first/)) [S] | Not wellbeing |
| **Sonia** | Morning and evening push, per a user review ([App Store](https://apps.apple.com/us/app/sonia-ai-for-mental-health/id6472111765)) [U] | No SMS, Watch or widgets |
| **Ash** | Push; weekly insights and Health Score prompts ([App Store](https://apps.apple.com/app/6474862947), [talktoash.com](https://www.talktoash.com/)) | "Text" means in-app; no SMS or WhatsApp |
| **Youper** | Daily check-in prompts [U] | No messaging |
| **Rosebud** | **Push and SMS reminders** (US/CA), daily and weekly ([help](https://help.rosebud.app/daily-journaling/notifications)) | No WhatsApp; SMS is a reminder, not a conversation [U] |
| **Daylio** | Push reminders, widget, Siri ([App Store](https://apps.apple.com/us/app/daylio-journal-daily-diary/id1194023242)) | No AI; no messaging |
| **Finch** | Widget as check-in reminder ([help](https://help.finchcare.com/hc/en-us/articles/39758423780621-The-Finch-Widget)); friends send "good vibes" | No SMS |
| **BetterHelp / Talkspace** | SMS, email and push for appointments ([BetterHelp terms](https://www.betterhelp.com/mobile-terms/), [Talkspace help](https://help.talkspace.com/hc/en-us/articles/54033538810779)) | No AI that starts conversations |
| **Kai** | Lives in WhatsApp and iMessage ([Product Hunt](https://www.producthunt.com/products/kai-ai)) [S] | Proactivity [U] |
| **Cass (ex-Tess, X2AI)** | SMS-first, B2B via EAPs ([CBP FAQ](https://www.cbp.gov/employee-resources/family/employee-assistance-program/enhanced-services/tess-faqs)) | Not consumer |
| **Peppi** | SMS-only AI with proactive check-ins ([Product Hunt](https://www.producthunt.com/products/peppi-ai-through-sms)) [S] | Tiny, unvetted |
| **Kindroid / Nomi** | Proactive messages; Kindroid reportedly texts via iMessage/RCS [U] | Companion, not care |
| **Crisis Text Line** | SMS 741741, web, WhatsApp; **never starts contact** ([texting-in](https://www.crisistextline.org/texting-in/)) | n/a |
| **Hume** | API company plus a voice app ([App Store](https://apps.apple.com/app/id6502917807)) | No messaging |
| **Vitalk** | Messaging-based programme with research in Malawi ([Frontiers](https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2020.576361/pdf)) | The "WhatsApp, Malaysia" claim is **not verified** |
| **"Sunny" SMS therapist** | Not found | **Possibly nonexistent** |

**White space**
1. **Conversational check-ins on messaging channels from a care-grade product.** Nobody credible does it. Pi retreated, Woebot closed, Wysa's WhatsApp is regional and unconfirmed. The products that do message first are companionship apps optimising engagement.
2. **Replies that continue the follow-up.** Rosebud's SMS and Talkspace's reminders are one-way. Xolace's follow-up card already has a response vocabulary; letting the user answer on Telegram, SMS or WhatsApp and having the card resolve is new.
3. **Voice that calls you.** No wellbeing product found places a scheduled AI call. Replika's calls are in-app.
4. **A published outreach contract.** Meta's rules (14-day window, stop after one ignored message) are the only public ones. Xolace could publish "how and when we'll reach you" as a feature. The current Reach, Quiet Window and rate buckets are most of it already.
5. **Telegram is unclaimed.**
6. **Wearable and widget signals feeding an AI follow-up.** Headspace uses HRV for breathing nudges, but nothing routes body signals into a conversation.

## Experiments worth running

Each experiment sits behind a PostHog flag (the `@posthog/convex` component is installed) and logs to `notification_log`, or its successor `outreach_messages`, so `resultedInSession` and `landed` keep working.

| # | Hypothesis | Channel | Minimal build | Success metric |
|---|---|---|---|---|
| E1 | A follow-up the user can answer in place gets more responses than a push that needs an app open | Telegram | Link flow + inline keyboard → `followUpResponses.record` for `standard`/`elevated` cards | Card response rate (any of the 6 responses) vs push control; target +50% relative |
| E2 | SMS check-ins re-engage lapsed users better than gentle-return push | SMS (Twilio, 10DLC) | Gentle-return cron gains an SMS adapter for opted-in users; replies "1/2/3" map to responses; a free-text reply starts a session | 7-day return rate among 14-30-day-lapsed users |
| E3 | A short scheduled AI call after an elevated session lowers "heavier" outcomes | Voice (ElevenLabs outbound + Twilio) | Elevated tier stage 2 offers "want a 2-minute call tomorrow at 7?"; the call uses the Talk agent with a follow-up opener; transcript → response | Share of `heavier` responses; call pickup rate; cost per completed call |
| E4 | A home-screen widget that asks a question keeps daily check-ins alive without push | iOS interactive widget | `expo-widgets` with 3 App Intent buttons + today's question, synced from Convex | DAU among widget installers; check-ins per week |
| E5 | During acute windows, a calm Live Activity reads as presence rather than pressure | Live Activity (push-to-start) | Replace acute stage-1/2 pushes with one Live Activity for 8h | `landed=felt_right` vs `too_much`; return within 4h |
| E6 | A user-owned calendar slot beats app reminders for weekly reflection | Calendar (`expo-calendar` write-only, or .ics email) | "Add a weekly 10-minute reflection" button | Weekly reflection completion over 4 weeks |
| E7 | Body signals predict good moments to check in | HealthKit / Health Connect | Read sleep + resting HRV; trigger a check-in when a personal baseline drops for 2+ days | Response rate to triggered vs random-time check-ins |
| E8 | A small opt-in group of peers keeps people coming back | Telegram group (or WhatsApp group via user-created invite) | Bot posts a weekly prompt to a 4-6 person group the users formed; replies stay in the group; Xolace posts only prompts and resources | 4-week retention of group members vs matched controls |
| E9 | Messaging-native onboarding converts people who never install the app | WhatsApp click-to-chat ad (7-day free window) or Telegram | Short intake in chat; account link later via Clerk | Cost per activated user vs app install campaigns |

Bold but grounded: E3, E7 and E8 are the novel ones. Every API they need exists today. E8 needs no new platform permission, because Telegram bots can be added to groups by members [V].

## Recommended architecture on Convex

All additive: new tables, new functions, new optional fields and new union literals. Nothing existing changes shape, so the shipped app keeps working (store-gap rule, `packages/backend/AGENTS.md`).

```
            follow-ups / gentle return / pattern nudges / experiments
                       │  (existing workflows + crons decide WHEN and WHAT)
                       ▼
          outreach.enqueue({ profileId, intent, tier, content variants })
                       │
         ┌─────────────┴─────────────┐
         │  router (internalMutation) │  consent? channel prefs? quiet window?
         │                            │  escalation_active? rate bucket per channel?
         └─────────────┬─────────────┘  picks channel + fallback chain
                       ▼
               outreach_messages (outbox)  ── workpool ──▶ adapter actions
                                                             push | telegram | sms | whatsapp | email | voice
                                                                  │
   provider webhooks (http.ts) ─▶ inbound_events (durable, deduped) ─▶ inbound router
                                                                  │
                    link token? ─▶ channel_identities         reply to a message?
                                                                  ▼
                                   follow_up_responses / new session / safeguard
```

**New tables** (domain folder `convex/outreach/`):
- `channel_identities`:
  - Fields: `{ emotionalProfileId, tokenIdentifier, channel, externalId (chatId / E.164 / wa_id / email), verifiedAt, status: active|paused|revoked, lastInboundAt, windowExpiresAt? }`.
  - Indexes: `by_channel_external`, `by_profile_channel`.
  - Keyed to Clerk's `tokenIdentifier` (the repo's user identity, root `AGENTS.md`) and to the emotional profile the follow-up code uses.
- `channel_link_tokens`: `{ tokenHash, profileId, channel, expiresAt, usedAt }`. These are minted by an authed mutation from a Settings screen and consumed by the webhook. For SMS and WhatsApp, use an OTP sent to the number instead, or Clerk's verified phone number.
- `outreach_messages`: one row per send.
  - Fields: `{ profileId, channel, intent (follow_up|gentle_return|pattern_nudge|check_in|…), followUpCardId?, providerMessageId?, idempotencyKey, status, suppressedReason?, sentAt, deliveredAt, readAt?, repliedAt? }`.
  - Keep writing `notification_log` too, so existing analytics and the "What landed?" card keep working.
- `inbound_events`: `{ channel, providerEventId (dedupe), externalId, payload, receivedAt, status }`. Written **before** returning 200, which is the spectrum-ts pattern. All processing is scheduled after that.

**Preferences:** add optional `preferences.outreach: { channels: [{channel, enabled}], order: [...], callWindow? }`. A missing value means push only, today's behaviour. Add consent literals (`messaging_outreach`, `voice_outreach`) to `consent_records.consentType`, a union widening.

**Routing rules** (one pure function, unit-tested beside it):
1. Escalation guard. If there is an `escalation_events` row in the last N hours, or the card tier is `acute`:
   - Only *presence* copy is allowed, on the user's most private channel (push, Live Activity, or the messaging channel they marked as private).
   - Never voice unless the user pre-chose it.
   - Always attach crisis resources from `ai/safeguard.ts` `Resource`s.
2. Respect `quietWindow` and `timezone`. The current follow-up path deliberately skips the quiet window; decide whether external channels should honour it (recommended: yes).
3. Add a per-channel rate bucket on top of the per-type bucket (e.g. `outreachSms` 1/day, `outreachVoice` 1/week).
4. Channel-specific constraints:
   - **WhatsApp:** free-form only if `now < windowExpiresAt`, else pick the approved template for the intent.
   - **Telegram:** require a `/start` link.
   - **SMS:** require 10DLC-registered sender and opt-in record; honour STOP (Twilio does this automatically [U]).
5. Fallback chain: if not delivered or not read within X, fall through to the next channel, at most once per intent.

**Inbound:**
- A Telegram `callback_query`, WhatsApp button, SMS "1/2/3" or widget intent maps to a `userResponseValidator` value and goes into `followUpResponses.record`'s logic. Refactor it into an internal function both paths share; the public mutation stays unchanged.
- Free text runs **the same safeguard pipeline** as in-app input before any AI reply. A `crisis` result:
  - writes `escalation_events` (reusing `escalation.create`);
  - replies on that channel with the resources list (phone or text numbers render natively in SMS, WhatsApp and Telegram);
  - suppresses further proactive outreach for the escalation window;
  - offers to move to the app.
- AI replies go through `convex/ai/` and read the session's Understanding, per the backend rules. Use spectrum-style `collapse` mode so bursts of messages produce one reply and a newer message cancels a stale one.

**Delivery:** a `@convex-dev/workpool` per channel with retries. Idempotency key = `outreach_messages._id`. Status webhooks update the row.

**Clients:**
- Mobile gets a "Reach me on…" settings screen (link Telegram via deep link, verify a phone for SMS/WhatsApp, voice call opt-in).
- Admin gets a read-only view of a profile's channel identities and outreach history in `convex/admin/*` (`adminQuery`).
- Web/desktop can show the same settings later. CLI: none.

## Phased roadmap

| Phase | Scope | Exit criterion |
|---|---|---|
| **0. Groundwork (1-2 wks)** | `convex/outreach/` tables, router, push adapter wrapping today's `notifications.schedule`; consent literals; preferences field; admin view. Start 10DLC brand + campaign registration and a WhatsApp Business account (both have lead time) | Push still behaves identically; router unit tests cover quiet window, escalation guard and buckets |
| **1. Telegram + email (2 wks)** | Telegram adapter (from `convex-telegram`), link flow, inline-keyboard responses, inbound safeguard path; `@convex-dev/resend` weekly note | Experiment E1 live behind a flag |
| **2. SMS (2 wks after 10DLC approval)** | `@convex-dev/twilio` adapter, OTP link, "1/2/3" replies, STOP handling | E2 live in the US/CA |
| **3. Voice check-ins (2-3 wks)** | ElevenLabs outbound call from the elevated-tier workflow, scheduled call windows, post-call → response, talk-time metering, Business Caller ID registration | E3 with a small cohort |
| **4. On-device (3 wks, needs a store build)** | `expo-widgets` interactive widget + acute Live Activity; `expo-calendar` write-only reflection slot | E4-E6 |
| **5. WhatsApp (2-3 wks + template approval)** | Own adapter (patterns from `convex-whatsapp`), 24h-window tracking, utility check-in templates with quick replies | Non-US cohort live |
| **6. Explore** | HealthKit / Health Connect triggers (E7), peer groups (E8), messaging-first onboarding (E9), RCS upgrade, Slack for an EAP edition | Decide per experiment data |

## Not verified

- WhatsApp per-country rates (US/UK/IN/NG): the rate cards were not text-readable.
- Whether Graph API v18.0 (pinned by `convex-whatsapp`) is already retired.
- How Photon delivers iMessage, and its pricing.
- Wysa's WhatsApp channel being live today.
- Pi's 2026 "check-ins" feature.
- Character.AI away messages (official page).
- Replika "real contact" phone numbers.
- Kindroid iMessage/RCS texting.
- Youper and Sonia proactive cadence.
- Kai proactivity.
- Vitalk in Malaysia.
- "Sunny" SMS therapist.
- STIR/SHAKEN specifics.
- iOS 26-specific notification features.
- Exact 10DLC vetting time.
- Twilio auto-STOP behaviour on the Convex component.
- The Telegram deep-link payload length (64 chars, from memory of the docs).
- WhatsApp's 3B MAU and Telegram's 1B MAU: secondary reports of executive statements.
- Push opt-in rates: vendor (Airship) data.

## Sources

**Repo**
- `packages/backend/convex/followUps.ts`, `followUpResponses.ts`, `lib/followUpCadence.ts`
- `notifications.ts`, `lib/rateLimits.ts`, `crons.ts`, `jobs/notificationTriggers.ts`
- `consent.ts`, `escalation.ts`, `ai/safeguard.ts`
- `schema.ts` (`follow_up_cards`, `notification_log`, `preferences`, `consent_records`, `escalation_events`, `users.by_token`)
- `http.ts`, `talk/provider.ts`, `talk/live.ts`, `convex.config.ts`
- `apps/mobile/package.json`
- `packages/backend/AGENTS.md`

**Sample apps (on disk)**
- `/Users/nathan/Developer/XolaceInc/sample apps/convex-whatsapp-main/src/component/{http,messages,schema,webhook,templates}.ts`, `src/client/index.ts`
- `.../convex-telegram-main/src/client/index.ts`, `src/component/schema.ts`, `example/convex/*`
- `.../convex-slack-main/src/component/schema.ts`, `src/client/index.ts`

**Components**
- https://www.convex.dev/components/spectrum-ts/convex/convex.md
- https://www.convex.dev/components/spectrum-ts/convex/llms.txt
- https://github.com/photon-hq/spectrum-convex (`src/component/schema.ts`, `src/client/index.ts`, README)
- https://photon.codes/spectrum
- npm metadata for `@convex-dev/{twilio,resend,workpool,crons,agent,action-retrier,workflow,rate-limiter,expo-push-notifications}`, `convex-whatsapp`, `convex-telegram`, `convex-slack`, `convex-webhook-receiver` (2026-10-30)

**Platforms**
- **WhatsApp:**
  - https://developers.facebook.com/docs/whatsapp/pricing
  - https://developers.facebook.com/docs/whatsapp/pricing/updates-to-pricing
  - https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits
  - https://whatsappbusiness.com/policy/
  - https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform
  - https://techcrunch.com/2025/10/18/whatssapp-changes-its-terms-to-bar-general-purpose-chatbots-from-its-platform/
- **Telegram:**
  - https://core.telegram.org/bots
  - https://core.telegram.org/bots/features
  - https://core.telegram.org/bots/faq
- **Slack:**
  - https://docs.slack.dev/reference/methods/chat.postMessage
  - https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps
  - https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide
- **Discord:**
  - https://docs.discord.com/developers/resources/user
  - https://docs.discord.com/developers/topics/rate-limits
- **Twilio:**
  - https://www.twilio.com/en-us/sms/pricing/us
  - https://www.twilio.com/docs/messaging/compliance/a2p-10dlc
  - https://www.twilio.com/docs/api/errors/30034
  - https://www.twilio.com/docs/messaging/compliance/toll-free/console-onboarding
  - https://www.twilio.com/en-us/voice/pricing/us
  - https://www.twilio.com/en-us/press/releases/rcs-general-availability
- **RCS:**
  - https://developers.google.com/business-communications/rcs-business-messaging/terms-and-policies/aup
  - https://support.apple.com/en-us/122195
- **CTIA:** https://api.ctia.org/wp-content/uploads/2023/05/230523-CTIA-Messaging-Principles-and-Best-Practices-FINAL.pdf
- **Apple:**
  - https://register.apple.com/resources/messages/messaging-documentation/policies
  - https://developer.apple.com/documentation/messageui/mfmessagecomposeviewcontroller
  - https://www.apple.com/newsroom/2026/03/introducing-apple-business-a-new-all-in-one-platform-for-businesses-of-all-sizes/
- **Email:**
  - https://resend.com/pricing
  - https://support.google.com/a/answer/81126
  - https://senders.yahooinc.com/best-practices/
- **Voice:**
  - https://docs.fcc.gov/public/attachments/FCC-24-17A1.pdf
  - https://elevenlabs.io/docs/api-reference/twilio/outbound-call
  - https://elevenlabs.io/pricing/agents
  - https://developers.openai.com/api/docs/guides/realtime-sip
- **On-device:**
  - https://developer.apple.com/documentation/widgetkit/adding-interactivity-to-widgets-and-live-activities
  - https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities
  - https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications
  - https://docs.expo.dev/versions/latest/sdk/widgets/
  - https://developer.android.com/develop/ui/compose/glance
  - https://developer.android.com/develop/ui/views/notifications/live-update
  - https://docs.expo.dev/versions/latest/sdk/calendar/
  - https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- **Health:**
  - https://developer.apple.com/documentation/healthkit/hkhealthstore/enablebackgrounddelivery(for:frequency:withcompletion:)
  - https://developer.android.com/health-and-fitness/guides/health-connect/develop/read-data
- **Speakers:**
  - https://developers.google.com/assistant/ca-sunset
  - https://developer.amazon.com/en-US/docs/alexa/smapi/proactive-events-api.html
- **Push:**
  - https://developer.android.com/develop/ui/views/notifications/notification-permission
  - https://developer.apple.com/documentation/usernotifications/unnotificationinterruptionlevel
  - https://www.airship.com/blog/your-guide-to-airships-mobile-app-push-notification-benchmarks-for-2026/ (vendor)

**Competitors:** inline in the [Competitor landscape](#competitor-landscape) table.
