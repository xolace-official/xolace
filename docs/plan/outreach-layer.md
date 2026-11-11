# Outreach layer and Telegram check-ins: handoff spec

> Handoff spec from the wayfinder map
> [Outreach layer and Telegram follow-ups](https://github.com/xolace-official/xolace/issues/723).
> Every decision here was made in one of that map's tickets, linked inline. Read the
> ticket for the reasoning; this file holds what to build. Scope: the Convex contract
> and the mobile app. Web, desktop, CLI and the admin UI read the same contract later.
>
> **Ready to cut into build issues.** The last section, "Build slices", suggests how.

Domain terms (root `AGENTS.md` → Glossary): **outreach** (and its **intent**),
**channel** (a user **links** one), **delivery**, **follow-up**, **answer**, **nudge**.
"Engine" is not a domain term; this is the outreach layer.

---

## Problem

Xolace reaches people outside the app only by push. A follow-up nudge asks "how is
this sitting now?", but answering means opening the app, and many people never do.
Telegram lets someone answer with a tap or write back where they already are.

Today's push path can't take a second channel
([Inventory](https://github.com/xolace-official/xolace/issues/726)):

- Seven outreach intents all go through `notifications.schedule`, which applies a rate
  bucket and writes `notification_log`, and nothing else.
- Each caller gates itself, and they disagree. The quiet window is ignored by
  follow-ups, skipped by the crons and deferred by unlocks and achievements. Only
  kindling checks escalation, so a gentle return can go out while an acute card is open.
- `notification_log` has no notion of a channel, and shipped builds depend on it.

## Solution

1. **An outreach layer that we own** (`convex/outreach/`). Callers say *when* and
   *what*; the layer says *where* and *whether*. One `enqueue` mutation runs every
   gate in one place, picks one channel, and delivers through a workpool per channel.
2. **Push rebuilt as the layer's first channel.** Push copy does not change. Three
   behaviours change on purpose (quiet-window deferral, escalation suppression for every
   intent, `enabled` becoming push-only). A test matrix proves nothing else changed.
3. **Telegram as the second channel.** The user links a chat from the app. Follow-up
   nudges arrive with answer buttons. Every reply is short, AI-written and personal,
   and free text goes through safeguard first, with a fixed crisis path.
4. **A mobile "Reach me on…" sheet** to link, pause, unlink and choose which channel
   comes first, plus a one-time offer after a lighter or still-here answer.
5. **Shipped to 100% from day one**, with no control group or soak period. The kill
   switch is per-channel config, and usage is read in PostHog.

## User stories

1. As a user, I want to answer a check-in with one tap in Telegram, so that I don't have to open the app to say how I'm doing.
2. As a user, I want to write back in my own words and get a reply that actually responds to me, so that checking in feels like a conversation, not a form.
3. As a user, I want a check-in's lock-screen preview to stay general, so that someone glancing at my phone doesn't learn what I'm working through.
4. As a user, I want to see what a check-in is about when I ask for it, so that it isn't just a vague ping.
5. As a user, I want old check-ins in the chat to close once they're answered or over, so that the history doesn't keep showing what I wrote about.
6. As a user, I want to choose which channel Xolace tries first, so that check-ins come where I'll see them.
7. As a user, I want to pause or unlink Telegram from the app, or send `/stop` in Telegram, so that I can stop it from either side.
8. As a user, I want my quiet hours to apply on every channel, so that a check-in doesn't wake me (an acute check-in still arrives, silently).
9. As a user in crisis who writes to the bot, I want the emergency number and helplines for my country right away, so that I can get help without opening anything.
10. As a user who deletes my account, I want Xolace to remove what it can from the chat and tell me plainly what Telegram keeps.
11. As a free user, I want a few AI replies a day, and to know that Xolace+ gives more, without being sold to when I'm struggling.
12. As a user who lost Xolace+ while Telegram was Plus-only, I want my link kept and check-ins to come as notifications until I'm back.
13. As a support person, I want to see a user's channels and recent outreach outcomes, without seeing anything they wrote or were sent, so that I can explain why a check-in didn't arrive.
14. As Xolace, we want to move a channel between free and Plus, or turn it off, with a config edit, so that we can change it without a release.
15. As Xolace, we want to see links, deliveries and answer rates per channel, so that we can tell whether Telegram helps people check in.

---

## Implementation decisions

### 1. Tables

All new, in `schema.ts`, owned by `convex/outreach/`. All additive.
([Contract](https://github.com/xolace-official/xolace/issues/727) §1, with fields added by later tickets.)

| Table | One row per | Fields |
|---|---|---|
| `outreach` | `enqueue` call | `emotionalProfileId`, `intent`, `followUpId?`, `tier?` (`acute \| elevated \| standard`), `content { title?, body }`, `variants? { telegram? { body } }`, `dedupeKey?`, `provenance { triggerReason, reachUsed?, generatedBy?, patternContextUsed?, affirmation? }`, outcome `queued \| suppressed`, `suppressedReason?`, `sendAt?` (quiet-window deferral), `resultedInSession?`, `answeredAt?`, `createdAt` |
| `outreach_deliveries` | attempt on one channel | `outreachId`, `channel`, `status`, `attempts`, `error?` (`ChannelError` kind + provider code, never raw text in analytics), `isFallback`, provider ids (Telegram `chat_id` + `message_id`), timestamps |
| `channel_identities` | linked chat (one per `(channel, externalId)`) | `emotionalProfileId`, `tokenIdentifier`, `channel`, `externalId` (string; Telegram ids are 64-bit), `telegramUserId?`, `status: active \| paused \| revoked`, `linkedAt`, `revokedAt?`, `revokedReason?`, `country?`, `awaitingReflection? { cardId, until }`, `lastInboundAt?`, `windowExpiresAt?` (reserved for WhatsApp) |
| `channel_link_tokens` | minted link token | `tokenHash` (SHA-256), `emotionalProfileId`, `channel`, `expiresAt`, `usedAt?`, `regionCode?`, `consentLanguageVersion?` |
| `inbound_events` | provider update | `channel`, `providerEventId`, `externalId`, `payload`, `receivedAt`, `status: received \| processed \| failed \| ignored` |
| `outreach_channels` | channel (config) | `channel`, `enabled` (kill switch), `plan: free \| plus` |
| `telegram_bot` | deployment (single row) | webhook `secretHash`, bot `username` (from `getMe`), written only by the setup action |

Indexes the decisions rely on:
- `outreach`: `by_dedupe` (`dedupeKey`), `by_profile_created` (`emotionalProfileId`, `createdAt`), `by_follow_up`.
- `outreach_deliveries`: `by_outreach`, and one to find open Telegram check-ins per identity for collapse.
- `channel_identities`: `by_channel_external`, `by_profile_channel`, `by_status_revokedAt` (30-day cleanup cron).
- `channel_link_tokens`: `by_hash`, `by_profile_channel`.
- `inbound_events`: `by_channel_event` (dedupe on `(channel, providerEventId)`), `by_status_received` (stuck-row cron), `by_received` (30-day cleanup).

Literal unions:
- **Intents:** `nudge` (was `follow_up`), `gentle_return`, `pattern_nudge`, `milestone`,
  `kindling_ready`, `domain_unlock`, `achievement`. `affirmation` is no longer an
  intent but `provenance.affirmation`; `streak_milestone` is dead.
- **`suppressedReason`:** `rate_limit`, `escalation_active` (also used for the 72 h crisis
  hold), `user_inactive`, `toggle_off`, `no_channel`, `account_deleted`.
- **`revokedReason`:** `user_app`, `user_telegram`, `relinked`, `blocked`,
  `unreachable`, `account_deleted`.
- **Channel ineligibility reasons** (computed, not stored; used by `listChannels` and
  the admin view): `disabled` (kill switch), `requires_plus`, `not_configured`,
  `paused`, `revoked`, `no_device` (push), `push_off` (push `enabled = false`),
  `intent_not_allowed`, `bucket_full`.

`channel_identities.status = paused` is the user's per-channel off switch.
`preferences.notifications` keeps the per-intent toggles, which apply on every channel.

### 2. `notification_log` stays as push's compatibility record

[ADR 0001](../adr/0001-notification-log-is-push-compatibility-only.md),
[Contract](https://github.com/xolace-official/xolace/issues/727) §2.

- Only the **push adapter** writes it: one row per push delivery, with a new optional
  `outreachId`. It maps intents back to old literals (`nudge` → `follow_up`; an
  affirmation-shaped send → `affirmation`).
- Suppressions are recorded only on `outreach`. A deferred push gets its row when sent.
- `markResultedInSession`, `list` and "What landed?" keep working for shipped builds.
- New readers (`recentNotificationContent`, session attribution, new-build history)
  read `outreach` / `outreach_deliveries`.
- Once no supported build reads it: `DEPRECATED(remove-after: data)`.

### 3. `enqueue` and the router

[Contract](https://github.com/xolace-official/xolace/issues/727) §3,
[Routing](https://github.com/xolace-official/xolace/issues/728),
[Cutover](https://github.com/xolace-official/xolace/issues/737) §2.

```ts
// internalMutation, convex/outreach/enqueue.ts
outreach.enqueue({
  emotionalProfileId, intent,
  followUpId?, tier?,
  content: { title?, body },           // channel-neutral, lock-screen safe
  variants?: { telegram?: { body } },  // optional per-channel override
  dedupeKey?,                          // repeat call returns the existing row
  provenance: { triggerReason, reachUsed?, generatedBy?, patternContextUsed?, affirmation? },
}) => { outreachId, outcome: "queued" | "suppressed", suppressedReason? }
```

Answer buttons are not content: the Telegram adapter builds them from `followUpId`.
The follow-up intent supplies each channel's preview line (see §6); adapters write no copy.

**One transaction, in this order:**

1. **Dedupe:** a matching `dedupeKey` returns the existing row.
2. **Account status:** `accountStatus: "deleted"` → `account_deleted`.
3. **Escalation and dormancy:**
   - While the user has any unresolved follow-up card with `escalationDerived`, every
     intent is suppressed (`escalation_active`) except the `nudge` for that card.
   - An `escalation_events` row from the last 72 h suppresses every intent
     (`escalation_active`). This covers a Telegram crisis with no card
     ([Inbound](https://github.com/xolace-official/xolace/issues/730) §6).
   - After 30 days with no session, `gentle_return`, `pattern_nudge` and
     `kindling_ready` are suppressed (`user_inactive`).
4. **Per-intent toggle** (`gentleReturn` for `nudge` and `gentle_return`, `patternNudge`,
   `milestone`, `achievementPushAllowed`, …), the same on every channel.
5. **Type bucket:** the per-type buckets move here from `schedule` unchanged and count
   across channels.
6. **Quiet window:** an acute `nudge` ignores it. Every other intent gets `sendAt` = the
   window's end; callers stop checking it.
7. **Pick the channel:** walk the user's channel order and take the first eligible
   channel, consuming its channel bucket. A channel is eligible when all of these hold:
   - the intent allows it: Telegram takes only `nudge`, `gentle_return` and
     `pattern_nudge`, acute included; everything else is push-only (a per-intent
     constant in the router);
   - its `outreach_channels` row is `enabled` (missing row = coded default: push
     enabled/free, Telegram **disabled**/free) and the user meets its `plan`;
   - for Telegram: a bot is configured (`telegram_bot` row + `TELEGRAM_BOT_TOKEN`),
     and the identity is `active`;
   - for push: a registered device and `preferences.notifications.enabled`;
   - the channel bucket has room: **`outreachTelegram` 3/day** counts every intent
     on Telegram; an acute `nudge` counts toward it but is never blocked; when it's full
     the router falls through to the next channel.
8. **No eligible channel** → `suppressed` with `no_channel`.
9. Write `outreach` and its delivery, and enqueue the delivery on that channel's
   workpool (at `sendAt` if deferred).

**Channel order** is stored per profile; absent means `[push]`. Linking Telegram puts
it first; the user can change which comes first. Intents have no default channel.

**Fallback:** only on a delivery failure (an adapter ends `failed` or `unreachable`),
the next eligible channel gets one fallback delivery, at most once per outreach. No
answer is not a failure: the follow-up cadence already sends the second nudge. 429 and
5xx retries stay inside the workpool and aren't a fallback.

**Lost Plus or kill switch:** the identity stays `active`; the channel is ineligible and
routing falls through. Nothing is unlinked or messaged; routing resumes when it's
eligible again. Pending deliveries on a channel that becomes ineligible are cancelled
and rerouted.

**`notifications.schedule`** keeps its validator and becomes a thin wrapper over
`enqueue`, marked `@deprecated` with a `DEPRECATIONS.md` line:
`follow_up` → `nudge` (`followUpTier` → `tier`); `affirmation` → `gentle_return` +
`provenance.affirmation`; `streak_milestone` → suppressed, nothing sent; `title` →
`content.title`; `scheduledFor` ignored, as today.

### 4. Delivery and the adapter seam

[Contract](https://github.com/xolace-official/xolace/issues/727) §5.

- Install `@convex-dev/workpool` (not installed today; `@convex-dev/workflow` is). One
  workpool per channel, plus `telegramInbound` (§8).
- Adapter: `{ channel, deliveryMode: "push" | "pull", send(ctx, delivery) }`. `send`
  throws a typed `ChannelError` of kind `retry` (`afterMs`), `permanent` or
  `unreachable`.
- Push-mode states: `queued → sending → sent`, ending `failed` or `unreachable`.
  Pull-mode states (`queued → available → acknowledged`) are reserved; no pull adapter
  is built.
- Only push and Telegram adapters are built.

**Push adapter.** Today's `sendPushToProfile` path, payload unchanged (`title`, `body`,
`channelId`, `sound`, `data { logId, type }` with old literals), and it writes the
`notification_log` row.

**Telegram adapter.** Sends with `protect_content` always, `disable_notification` only
for an acute nudge inside the quiet window. Stores `chat_id` + `message_id` on the
delivery. A 403 → `unreachable` (revokes the identity, §7). A 429 → `retry` with
`retry_after`.

### 5. Telegram transport

[Transport](https://github.com/xolace-official/xolace/issues/724),
[Bot API facts](https://github.com/xolace-official/xolace/issues/725).

- **Copy, don't install** `convex-telegram`: about 100 lines into
  `convex/outreach/telegram/` (Apache-2.0, keep the notice), with `@gramio/types` as a
  direct dependency. `convex.config.ts` is unchanged.
  - Reuse `botApiProxy`, changed to throw a typed `TelegramApiError` carrying
    `error_code` and `retry_after`; `generateSecret`; a constant-time check of
    `X-Telegram-Bot-Api-Secret-Token`.
  - Don't copy the `webhooks` table, `registerRoutes` or `deleteWebhook`'s bookkeeping.
- **Webhook** (`http.ts`): check the secret against `telegram_bot.secretHash` (401 if it
  doesn't match, or no bot is configured), insert into `inbound_events` deduped on
  `update_id` (by equality), enqueue processing, return 200. No work before the 200.
- Facts the code must respect: `callback_data` and the `/start` payload ≤ 64 chars
  `[A-Za-z0-9_-]`; text ≤ 4096; toast ≤ 200; about 1 msg/s per chat and 30/s per bot;
  we can delete our messages only within 48 h; treat "message is not modified" as
  success; taps on old messages keep arriving, so always check server-side that the
  card is open.

### 6. What a Telegram outreach says

[Content](https://github.com/xolace-official/xolace/issues/729),
[Conversation prototype](https://github.com/xolace-official/xolace/issues/732),
[Reach voice](https://github.com/xolace-official/xolace/issues/741),
[Push privacy bar](https://github.com/xolace-official/xolace/issues/736).

Telegram is held to a stricter bar than push: the preview reaches the lock screen
(the bot can't hide it) and the message persists in a history synced to every device.

**Follow-up nudge (standard, elevated):**
- First line: push's tier-generic line (`fallbackFollowUpCard(tier)` without a domain).
  Never the compounding domain, a day or a time. Not shaped by Reach.
- Answer buttons on one row: `🌤 Lighter` · `☁️ Still with it` · `🌧 Heavier`.
- `What was this about?` on its own row. Tapping it edits the same message (no new
  notification) to add the card text below the first line as a quote, compounding domain
  included, and removes the reveal button.
- `Support resources` (URL button, last row) when the card's `escalationDerived` is true.

**Acute nudge:** push's acute line, `🌤 Lighter` + `☁️ Still with it` only (no
Heavier, matching the app's `chipsForTier("acute")`), the reveal button, and Support
resources when `escalationDerived`.

**Collapse:** when the follow-up stops being open (answered anywhere, dismissed,
expired, superseded) or the link is revoked, the bot edits the message to a neutral line
with no buttons:
- answered: `✓ Checked in: lighter` / `✓ Checked in: still sitting with it` /
  `✓ Checked in: heavier`;
- otherwise: `This check-in is closed. Nothing to do here.`

So only the newest check-in is live in the chat.

**Gentle return, pattern nudge:** the same generated text push sends (already
Reach-shaped) + one `Open Xolace` button. No reveal, no answer buttons, no collapse.

**Push copy does not change:** standard/elevated nudges show the card text, a compounding
card uses the generic tier line, acute keeps its fixed line. A follow-up push must stay
personalized.

**Copy lives in one backend module** beside the Telegram adapter. The fixed lines
(welcome, crisis, goodbye, `/stop`, expired link, relinked, old chat, account deleted,
stranger, revoked, `/help`, failure, cap lines) are taken as drafted in the
[conversation prototype](https://github.com/xolace-official/xolace/tree/prototype/telegram-checkin-conversation)'s
`FIXED` block.

### 7. Link lifecycle

[Link lifecycle](https://github.com/xolace-official/xolace/issues/731).

A person has **one** private chat with the bot, whose `chat_id` equals their Telegram
user id. A link token never creates a chat; it only says which Xolace account the chat
belongs to. Every relink lands in the same chat with its history.

**Mint.** Authed action `outreach.telegram.createLink({ regionCode?, consentLanguageVersion })`:
- 32 random bytes, base64url (43 chars); store only the SHA-256 hash, with
  `regionCode` and `consentLanguageVersion`;
- TTL 15 min, one live token per user per channel (minting marks older ones used);
- rate bucket **`telegramLinkMint` 10/hour**;
- throws a typed error when Telegram isn't eligible for the user (kill switch, plan,
  `not_configured`);
- returns `https://t.me/<telegram_bot.username>?start=<token>`. The app opens it, with
  a Copy link fallback. No QR code.

**`/start <token>`**, in the inbound workpool, private chats only:
- **Bad token** (unknown, expired, used, or a repeated `/start`): fixed "This link has
  expired…" reply; nothing stored.
- **Good token**, one mutation:
  - sets `usedAt`;
  - upserts the identity as `active`, with `country` from the token's `regionCode` and
    the Telegram user id;
  - puts Telegram first in the channel order;
  - writes a `telegram_outreach` consent `granted` row with the `consentLanguageVersion`;
  - turns on `gentleReturn` if it's off, through `updateNotificationPrefs` (a merge);
    `patternNudge` and `enabled` are left alone.
- Then the fixed welcome. `setMyCommands` registers `/stop` and `/help`.

**Latest link wins.** One active Telegram chat per Xolace account, and one Xolace account
per chat:
- same chat, second Xolace account: the old identity is revoked `relinked`, the row moves
  to the new account, and the bot says so;
- same account, a new chat: the old chat's identity is revoked `relinked`, and the old
  chat is told.

**Relink** reactivates the one row per `(channel, externalId)`: `active`, new `linkedAt`,
`revokedAt` cleared, profile moved if different. Revoked rows are deleted by a cron 30
days after `revokedAt`; after that the chat is a stranger.

**Unlink from the app** (`unlinkChannel({ channel })`): revoke `user_app`, one goodbye,
collapse every open check-in, cancel and reroute pending deliveries.
**Pause / resume** (app only): `paused`; nothing is sent and nothing collapses.
**`/stop`:** a full unlink with reason `user_telegram`, the same collapse, and a reply
that says how to relink. No `/pause` or `/resume`.

**Blocked or unreachable:** `my_chat_member` → `kicked` revokes `blocked`; any 403 on a
send revokes `unreachable` and ends the delivery `unreachable` (triggering the one
fallback). Unblocking doesn't relink. No push about it; the sheet shows "disconnected".

**Consent:** new type `telegram_outreach` in both `schema.ts` `consent_records` and
`lib/validators.ts` `consentTypeValidator`. Every revoke, whatever the reason, appends a
`revoked` row.

**Account deletion:**
- During the grace period, the router suppresses everything with `account_deleted`.
- At purge, a new first step `cleanupTelegramChat` (action):
  1. deletes every message we sent in the last 48 h (`deleteMessages`, ≤100 ids per call);
  2. collapses any open check-in;
  3. sends the fixed "Your Xolace account was deleted…" message.
- Then `drainOutreach` deletes `outreach`, `outreach_deliveries`, `channel_identities`,
  `channel_link_tokens` and the user's `inbound_events`.
- The app's deletion copy says Telegram keeps earlier messages.

**Data wipe:** keeps the link and its consent. Runs the same 48 h delete and collapse
without the final message, then deletes `outreach`, `outreach_deliveries`,
`inbound_events` and unused tokens, and clears `awaitingReflection`.

New tables are added by hand to `jobs/dataWipe.ts` and `jobs/accountDeletionSteps.ts`.
A guard test for this is [filed separately](https://github.com/xolace-official/xolace/issues/735).

### 8. Inbound

[Inbound](https://github.com/xolace-official/xolace/issues/730), narrowed by the
[conversation prototype](https://github.com/xolace-official/xolace/issues/732) and
[Reach voice](https://github.com/xolace-official/xolace/issues/741).

**Processing.** The webhook enqueues an internal action on the `telegramInbound`
workpool, with retries, one chat's updates in order and one at a time. A tap's
`answerCallbackQuery` is the first step. A cron re-enqueues rows stuck in `received`
for more than 5 minutes.

**Who is writing:**

| Sender | Handling |
|---|---|
| No identity, not `/start <token>` | One fixed reply per chat per 24 h (works with the Xolace app; link from Settings; static "if you're in danger, call your local emergency number"). No safeguard, no escalation, no text stored. |
| `revoked` | Same, saying how to link again. |
| `paused` or `active` | Everything below. Pausing means "don't reach out", not "ignore me". |

**Taps.**
- Extract one shared internal function, e.g.
  `followUps.resolveCardCore(cardId, response, source)`. The app's public `resolveCard`
  / `record` keep today's behaviour.
- The Telegram path accepts only `pending | ready | shown` cards. A tap on a closed card
  gets the toast "This check-in has closed" and the collapse is re-sent. The reveal tap
  works the same way.
- First answer wins from either surface; a later tap gets "Already answered" and the
  collapse. Changing an answer is app-only. Telegram offers lighter / still with it /
  heavier only; `processed`, `vent` and `dismissed` stay app-only.
- After a tap, an AI reply that knows the card and the answer:
  - lighter: asks what helped, and sets `awaitingReflection { cardId, until: +30 min }`;
  - heavier: carries `Support resources` + `Open Xolace` to the heavier step
    (`heavierChoice` stays unset).
- `callback_data` holds an id only, validated as untrusted input.

**Free text.**
- Safeguard runs on every text from a linked user: OpenAI moderation plus Haiku
  classification with the `UNCLASSIFIED` fallback, as in intake. If both fail, the reply
  goes out with Support resources attached.
- `crisis` → crisis path below. Anything else → an AI reply; at `elevated` the reply
  also carries Support resources.
- **Reflection:** only the next text inside `awaitingReflection`, and only when
  safeguard returns `none | gentle`, is saved through `record` with
  `shareRequested: false`. No other text is saved, and no reply confirms a save.

**AI replies.**
- Single turn, built on Talk's pipeline (`ai/talk/chatCompletions`). Context: the open or
  most recent card (domain, text, answer), Understanding/memory **read-only**, and recent
  Telegram turns. Writes nothing into sessions, memory or Understanding.
- First line short and general, safe on a lock screen: never the domain, never the
  person's words. `protect_content` on every reply.
- Voice by Reach (`notifications.reach ?? "warm"`):
  - **warm:** about three sentences plus one question;
  - **direct:** two plain lines ending in one question;
  - **quiet:** two short lines, never one, the second a soft invite.

  No struggling floor; buttons, resources and the crisis reply don't follow Reach.
- **Daily reply cap: Plus 50, free 5.** At the cap:
  - free and not struggling: the Xolace+ upsell line with `Get Xolace+` (paywall deep
    link) + `Open Xolace`;
  - struggling (elevated or acute card, `escalationDerived`, heavier answer, safeguard
    `elevated` this turn, or a crisis in the last 72 h): the plain cap line + Support
    resources + Open Xolace;
  - Plus: the plain cap line.
- **Bursts:** `sendChatAction: typing`; wait 6 s after the last message, reply once to
  the batch. Safeguard still runs per message on arrival.
- **Failure** after retries: one fixed "I couldn't reply just now…" line + Open Xolace.

**Crisis.**
- `escalation.create`, widened additively:
  - `sessionId` becomes optional (it's required today);
  - new `source: "session" | "telegram"`, `inboundEventId?`, `followUpCardId?`;
  - dedupe: one event per card when a card is open, else one per identity per 24 h.
- If a card is open, set `escalationDerived: true`. The 72 h router hold (§3) applies
  either way.
- The **fixed** reply contains:
  - "I'm really glad you told me.";
  - the country's emergency number and priority-1 helplines in the body;
  - "I'm still here, and so is Xolace.";
  - buttons `More support options` (app crisis screen, `from=telegram`; `Find a helpline`
    → IASP when the country is unknown) and `Open Xolace`.

  No AI reply in a crisis turn; the next normal reply knows it happened.
- **One resource list:** move `COUNTRY_RESOURCES` from
  `apps/mobile/src/features/crisis-resources/data.ts` to a client-safe
  `convex/lib/crisisResources.ts` on the allowlist. The app screen and the bot both read
  it. Country = `channel_identities.country` (from `regionCode` at link time, refreshed
  when "Reach me on…" opens).

**Retention.** `inbound_events.payload` text is stripped once the row is processed. Rows
are deleted after 30 days by a cron.

### 9. Client contract (mobile)

All public, under `convex/outreach/`, using `requireAuth`, with validators on args and
returns.

| Function | Kind | Notes |
|---|---|---|
| `listChannels` | query | One entry per channel the deployment offers (Telegram omitted when `not_configured`): `channel`, `status` (`linked \| paused \| needs_plus \| disconnected \| not_linked`), `available`, `requiresPlus`, `linked`, `isFirst`, `revokedReason?`, `displayHandle?`. Reactive, so the link step updates live. |
| `telegram.createLink` | action | §7. Args `regionCode?`, `consentLanguageVersion`. |
| `unlinkChannel` | mutation | `{ channel }` |
| `setChannelPaused` | mutation | `{ channel, paused }` |
| `setFirstChannel` | mutation | `{ channel }` (the "Try this first" button) |
| `refreshCountry` | mutation | `{ regionCode }`, called when "Reach me on…" opens |

`displayHandle` is the Telegram `@username` from the `/start` message, if the user has one,
stored on the identity only to show the user their own link. It's never sent to
PostHog or the admin view.

### 10. Mobile "Reach me on…"

[Reach me on… prototype](https://github.com/xolace-official/xolace/issues/733) (variant B).

- **Entry:** Settings → Notifications gets a "Check-ins" section with one row, "Reach me
  on…". Its value is "Telegram" when Telegram is linked, active and first, otherwise
  "Notifications". It opens its own page sheet. Behind the PostHog flag.
- **Sheet:** the heading and "Where Xolace checks in on you. We use the one marked First,
  and the other if it can't get through." One card per channel, Telegram first. The card
  the router tries first has a **First** badge; another usable card has **Try this
  first**. The Notifications card says "Always used for chat messages from people."
- **Telegram card per `listChannels` state:**
  - not linked: description + **Link Telegram**;
  - linked: "Linked · @handle", **Pause** / **Unlink**;
  - paused: **Resume** / **Unlink**;
  - needs Plus: Xolace+ badge, "your link is kept" line, **Get Xolace+**;
  - disconnected: a warning per `revokedReason` + **Link again**.
- **Linking, three steps in the card:**
  1. disclosure: what arrives, "Linking turns on check-ins", lock-screen previews stay
     general, chat stays on notifications; **Open Telegram** + **Copy link for another
     device**;
  2. "Tap Start in Telegram", spinner, 15-minute note, Cancel;
  3. linked: the card switches live and Telegram gets First.
- **Offer card** after a lighter or still-with-it answer in the app: "Want the next
  check-in on Telegram?" with **Link Telegram** / **Not now**.
  - Never after heavier, acute or crisis.
  - At most once: "Not now" hides it for good (local flag).
  - Hidden when Telegram is linked or ineligible for this user.
- **Account deletion screen:** add a line that Telegram keeps its chat history.
- A real sheet component (not the prototype's), and it sends `regionCode` +
  `consentLanguageVersion`.

### 11. Admin

[Admin view](https://github.com/xolace-official/xolace/issues/742),
[Contract](https://github.com/xolace-official/xolace/issues/727) §6.

- **Channel config:** an `adminMutation` in `convex/admin/outreach.ts` upserts an
  `outreach_channels` row (`enabled`, `plan`). Moving Telegram to Plus is a row edit.
- **User outreach view:** one look-only `adminMutation` that takes a Clerk user id, writes
  an audit row (which admin viewed whose outreach, when), then returns:
  - **channels** in the user's order: status, `revokedReason`, linked-at and revoked-at
    times, and eligibility with its reason;
  - **outreach**, newest first, last 30 days capped at 50 rows (indexed on profile +
    `createdAt`): intent, `createdAt`, routing outcome; per delivery: channel, status,
    error kind, attempt time, fallback flag;
  - **active suppressions** as `safety` (escalation and crisis hold, collapsed) or
    `dormancy`, with end times only;
  - **today's counts:** `outreachTelegram` used of 3, AI replies used of the plan cap.
- **Never returned:** message or card text, user text or AI replies, safeguard or crisis
  details, Telegram ids or handle, tokens or hashes. No admin actions on a user's links.
- The admin UI page is outside this spec.

### 12. Bot provisioning

[Provisioning facts](https://github.com/xolace-official/xolace/issues/738),
[Provisioning](https://github.com/xolace-official/xolace/issues/739).

- **Bots:** one shared bot each for prod and staging, created in @BotFather from one
  Xolace-owned Telegram account; tokens live in the team password manager and Convex env.
  A developer testing Telegram makes a personal bot for their own dev deployment.
  Previews, e2e and agent worktrees get none.
- **Env:** `TELEGRAM_BOT_TOKEN` only, set per deployment with `convex env set`. Never a
  project default (defaults are copied into every preview).
- **Setup:** an idempotent `internalAction`, e.g. `outreach/telegram/setup.configureBot`,
  run by hand with `bunx convex run`. It:
  - calls `setWebhook` with `CONVEX_SITE_URL`, `allowed_updates`
    `["message", "callback_query", "my_chat_member"]` and `drop_pending_updates: false`;
  - generates a fresh `secret_token` and stores its hash plus the `getMe` username in
    `telegram_bot`;
  - sets the bot's name, description and commands from code.

  Re-running it rotates the secret. It never runs on deploy.
- **No bot configured:** Telegram is ineligible (`not_configured`), `listChannels` omits
  it, `createLink` throws a typed error, and the webhook answers 401.
- **Drift cron (daily):** `getWebhookInfo`; compare `url` with `CONVEX_SITE_URL`, check
  `last_error_date` in the last 24 h and a growing `pending_update_count`. On drift, log
  an error and send one PostHog event. Never re-point.
- **Docs:** new `docs/setup/telegram.md` runbook; token name in
  `packages/backend/.env.example`; pointers from `docs/setup/staging.md`, `release.md`,
  `pr-previews.md` (Step 3) and `packages/backend/AGENTS.md`.

### 13. Usage measurement

[Usage](https://github.com/xolace-official/xolace/issues/740).

- **Where it's read:** PostHog, one **Outreach channels** dashboard. `outreach` tables
  are the operational record, never charted. `distinctId` = emotional profile id.
- **Server events** go through one typed `captureOutreach(ctx, event, props)` helper:

  | Event | Properties |
  |---|---|
  | `channel_linked` | `channel`, `relink`, `plan`, `source` (`settings \| offer_card`) |
  | `channel_unlinked` | `channel`, `reason`, `days_linked` |
  | `outreach_routed` | `intent`, `tier?`, `outcome` (`routed \| deferred \| suppressed \| no_channel`), `channel?`, `suppressed_by?` (`escalation \| dormancy \| rate_limit`) |
  | `outreach_delivery` | `channel`, `intent`, `status` (`delivered \| failed`), `error_kind?`, `is_fallback` |
  | `follow_up_resolved` | `surface` (`app \| telegram`), `nudge_channel` (`push \| telegram \| none`), `response`, `tier`, `escalation_derived`, `plan` |
  | `telegram_inbound` | `kind` (`tap \| text`), `outcome` (`ai_reply \| cap_reached \| stale_card \| stranger`), `plan`; not sent for a crisis text |

  Plus the person property `telegram_linked` via `$set`. The webhook drift event is also
  sent through this helper.
- **Client events** (behind the same flag): `reach_screen_opened`, `channel_link_started`,
  `channel_link_copied`, `channel_link_abandoned`, `channel_order_changed`,
  `channel_offer_shown` / `_tapped` / `_dismissed`. No client "link completed".
- **Never sent:** any message, card, reply or user text; safeguard results; domains;
  Telegram ids or username; tokens; raw errors; `outreachId` / `followUpId`. Crisis
  events stay out of PostHog entirely. A `convex-test` checks every event's keys against
  the helper's allowlist.
- **Dashboard** (made after Telegram is on): link funnel by `source`; unlinks by
  `reason`; deliveries by channel × status and routing by outcome; answer rate (answers ÷
  nudges delivered) by `nudge_channel` × tier; inbound outcomes by plan.
- **Review:** a 30-day read of three numbers: share of active users with Telegram linked,
  answer rate per `nudge_channel`, and 30-day link retention by reason. No automatic
  kill thresholds.

---

## Rollout

[Cutover](https://github.com/xolace-official/xolace/issues/737). Three stages, each
released as soon as it's ready, with no soak, shadow mode or watch gate:

1. **Schema + layer, dark.** Tables, optional `notification_log.outreachId`, `enqueue`,
   the router, the push adapter on its workpool, coded `outreach_channels` defaults, and
   the intent test matrix written against today's `schedule`. Nothing calls `enqueue`.
2. **Push cutover.** `schedule` wraps `enqueue`; all seven callers move to `enqueue` in
   one PR, each dropping its own quiet-window, escalation and dormancy checks and adding
   a `dedupeKey` (e.g. `nudge:<cardId>:<n>`). `generateNotification` passes the true intent
   plus `provenance.affirmation`. Telegram stays disabled by default.
3. **Telegram on.** Webhook, inbound, link flow and admin functions ship; bots are set up
   on staging then prod; the Telegram `outreach_channels` row is enabled. The mobile
   sheet ships in the next app build behind the PostHog flag.

- **No backfill.** Absent channel order = `[push]`; push has no identity row; a missing
  `outreach_channels` row = coded default; consent is recorded at link time.
- **Kill switch:** the `outreach_channels` rows, read inside `enqueue`. Off means push
  only, through the layer; no legacy branch. A bug in `enqueue` itself is reverted in
  code. The PostHog flag gates only the mobile entry point.
- **In-flight work:** old-args `schedule` calls are seconds old and go through the
  wrapper. Sleeping follow-up workflows call `sendFollowUpNudge`, whose args don't change.

## Testing

- **Intent matrix** (`convex-test`), one row per intent × {before, after}, kept green
  through stage 2.
  - Allowed diffs:
    - (a) non-acute outreach in the quiet window is deferred;
    - (b) an open escalation-derived card suppresses every intent but its own nudge;
    - (c) `enabled = false` no longer blocks a linked Telegram;
    - (d) suppressions leave `notification_log`.
  - Invariants:
    - push payload shape and old `type` literals;
    - one `notification_log` row per push delivery;
    - rate-bucket counts;
    - `markResultedInSession` and `lastDelivered`;
    - push copy (card text for standard/elevated, generic for compounding, fixed acute).
- **Router** unit tests: the order of gates, fallback once, bucket fall-through, acute
  never blocked, lost Plus and kill switch, the 72 h hold, `no_channel`, `account_deleted`.
- **Telegram:** the webhook (bad secret 401, dedupe, 200 before work), the inbound
  workpool (order per chat, stale-card toast, first answer wins, reflection window,
  cap and struggling check, crisis path), the link lifecycle (bad/used/expired token,
  latest link wins, `/stop`, block, 403), deletion and wipe. Use a `fetch` seam for the
  Bot API.
- **Analytics allowlist** test (§13).
- **Evals** for the reply prompt: all three Reach values on lighter / still / heavier /
  free text / safeguard elevated, checking the lock-screen-safe first line.
- **Simulator** for the sheet and offer card. What it can't prove: the real Telegram
  round trip, push delivery and lock-screen previews; those are checked by hand on
  staging.

## Out of scope

- SMS, WhatsApp, email, voice, widgets, Slack/Teams/Discord, and pull channels (CLI,
  agent hooks, MCP). The contract leaves room for them.
- Web, desktop and CLI settings screens; the admin UI page and admin user search.
- Sending one outreach to more than one channel.
- An A/B test with a push control group.
- A full AI conversation in Telegram (sessions, memory and Understanding written from
  Telegram).
- Outside this map but noticed:
  - pattern nudges compare times in UTC
    ([Inventory](https://github.com/xolace-official/xolace/issues/726));
  - `ai/safeguard.ts`'s Ghana-only `CRISIS_RESOURCES` should read the shared list;
  - the purge coverage test ([filed](https://github.com/xolace-official/xolace/issues/735)).

## Filled in while writing this spec

The tickets left a few small gaps or disagreed on details. This spec settles them as
follows; change them in review if they're wrong.

- **Kill switch:** the [Contract](https://github.com/xolace-official/xolace/issues/727)
  said `enqueue` checks a PostHog flag; [Cutover](https://github.com/xolace-official/xolace/issues/737)
  replaced that with the `outreach_channels` rows. This spec follows Cutover.
- **Webhook secret:** [Transport](https://github.com/xolace-official/xolace/issues/724)
  assumed a `TELEGRAM_WEBHOOK_SECRET` env var and only `message` + `callback_query`;
  [Provisioning](https://github.com/xolace-official/xolace/issues/739) settled on a hashed
  secret in `telegram_bot` and adds `my_chat_member`. This spec follows Provisioning.
- **Acute buttons and collapse wording:** the
  [conversation prototype](https://github.com/xolace-official/xolace/issues/732) narrowed
  [Inbound](https://github.com/xolace-official/xolace/issues/730) (no Heavier on acute)
  and replaced [Content](https://github.com/xolace-official/xolace/issues/729)'s
  collapse lines. This spec uses the prototype's.
- **Where the channel order lives:** not decided. Proposed: an optional `channelOrder`
  array on `preferences.notifications`, written only on link or "Try this first", absent
  = `[push]`.
- **The `@handle` on the linked card:** the sheet shows it, but no ticket stored it.
  Proposed: optional `displayHandle` on the identity, shown only to the user.
- **`toggle_off` suppressed reason and the ineligibility reason list:** named here so
  routing, `listChannels`, the admin view and analytics share one set.
- **New mutations** (`setChannelPaused`, `setFirstChannel`, `refreshCountry`): the
  prototypes needed them, and no ticket named them.

## Build slices

A suggested cut into build issues, in dependency order. Stage numbers are the rollout's.

1. **Layer schema and `enqueue`, dark** (stage 1): tables, literals, router, push
   adapter, workpool install, `outreach_channels` defaults and admin config mutation,
   intent test matrix against today's `schedule`.
2. **Push cutover** (stage 2): `schedule` wrapper, seven callers onto `enqueue`, new
   readers onto `outreach`, `DEPRECATIONS.md`.
3. **Telegram transport and provisioning:** copied client, webhook, `telegram_bot`,
   `configureBot`, drift cron, `docs/setup/telegram.md`.
4. **Link lifecycle:** `createLink`, `/start`, relink rules, unlink / pause / `/stop`,
   block and 403 handling, consent type, client mutations and `listChannels`.
5. **Telegram adapter and check-in message:** sending, reveal, collapse, copy module.
6. **Inbound taps:** `resolveCardCore`, tap handling, stale and duplicate taps.
7. **Inbound text and AI replies:** safeguard, reflection window, Talk-based single-turn
   reply with Reach voice, caps and upsell, bursts, failure line, evals.
8. **Crisis path:** shared crisis resources module, `escalation.create` widening, 72 h
   hold, fixed reply.
9. **Deletion and wipe:** `cleanupTelegramChat`, drain steps, retention crons.
10. **Analytics:** `captureOutreach` helper and allowlist test, server events, then the
    dashboard once Telegram is on.
11. **Admin user outreach view** (function + audit table).
12. **Mobile "Reach me on…" sheet, link flow and offer card**, behind the flag, plus the
    deletion-screen line.

Slices 3–12 depend on 1; 2 can run beside 3–4. 6–8 depend on 4 and 5. 12 needs 4's client
contract but can start against stubs.
