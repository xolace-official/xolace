# In-house chat: replacing Stream with Convex

Researched 2026-11-19, with follow-up sections the same day (voice/video, scale, a Xolacer's AI stand-in, component vs domain folder) and a third on the on-device store (WatermelonDB and alternatives). Prices, limits and package versions go stale quickly; re-check them before you build. This is research to inform a decision, not a plan. Tags: **[V]** checked on a primary source this session (docs, pricing page, or the code itself), **[S]** secondary source only (community answer, search-result excerpt, or an older internal note), **[U]** unverified.

Sample-app findings came from reading their source this session; line numbers are approximate and a sample of them was re-opened and confirmed. Paths under "sample apps" are relative to `/Users/nathan/Developer/XolaceInc/sample apps/`.

## TL;DR

**Recommendation: build it on Convex, in stages, and switch off Stream only once the in-house version matches today's surface.** Do it now, while chat is dark and barely used, rather than later. Don't run a long-lived hybrid.

Why build:

1. **Xolace already owns everything except the pipe.** The conversation lifecycle, caps, pseudonyms, block, rating, archive, chat notifications, the crisis card and the moderation verdicts all live in Convex. Stream holds message rows, reactions, read state, typing, its own offline SQLite and a moderation queue (`xolacer_conversations` schema comment: "Stream only holds message content for accepted conversations"; old `CONTEXT.md` "The Connect list is Convex-owned; Stream is transport only") [V]. Most of the glue between the two halves exists only *because* they are two systems:
   - a gzip-sniffing, HMAC-verifying webhook with its own dedupe table;
   - one Stream REST call per push to read the unread count;
   - identity overrides on every Stream UI component so that pseudonyms don't leak;
   - two moderation inboxes.
2. **The motivating features fit Convex better than Stream.** Short-lived circles with an AI motivator, cards and custom flows are all things Xolace would define itself:
   - lifecycle and expiry;
   - an AI participant that reads Xolace's own context (memory, safeguard, follow-ups);
   - typed card messages;
   - holding a message until it has been checked.

   Convex gives these one transactional, reactive model with components already installed (presence, rate limiter, workflow, workpool, push, agent available). Stream can carry custom fields and an AI agent channel type. But every Xolace-specific rule still has to be enforced in Convex and mirrored into Stream.
3. **Moderation gets stronger, not weaker.**
   - A Convex send mutation can enforce membership, blocks, rate limits and the contact-leak regex *in the same transaction* as the write.
   - It can also **hold** a message until the AI classifier clears it. Stream's before-send hook can't host a model call: it has a 1.5 s default budget and fails open [S].
   - Review moves out of Stream's dashboard into `apps/admin`, beside the concern tray it already duplicates.
4. **There is one less processor of message content.** The feature "ships dark until the ambassador-consent + DPA review clears" (`xolacerChat.ts:215-216`) [V]. With messages in Convex, Stream drops out of that review (Anthropic still classifies).
5. **Xolace's conversations have a shape Convex handles well.** This is about how our conversations are shaped, not a Convex ceiling.
   - Convex is comfortable with very many conversations running at once, each with a few writers. Every conversation is its own set of documents, and the Professional plan allows 10,000 concurrent client sessions [V].
   - What strains it is one document written by many people at the same moment: a room with thousands of people posting at once. Convex retries conflicting writes and eventually errors if calls keep arriving faster than they can run [V].
   - Xolace's conversations are 1:1 or small circles. The one wide surface, the app-wide Xolace channel, has a single writer and is better modelled as a feed than as an "every user is a member" channel.
   - See [Scale](#scale-what-convex-handles-and-what-would-be-hard).

What it costs (the reason "stay" is still a fair answer):

- The **mobile thread UI** has to be rebuilt without `stream-chat-expo`: 32 files and about 3.1k lines import the SDK.
- An **offline story** has to be built. Convex has no persistent client cache; it retries mutations "until they are confirmed" [V] but holds them in memory [S].
- A **moderation review page** is needed in admin.
- Realistically that is one focused engineer for several weeks. The backend half is the smaller part.

**When to stay on Stream instead.** The founder has settled ownership: someone will own chat, and Connect can be switched off during the rebuild. That leaves two cases where Stream would still win:

- the roadmap needs **large live rooms**, where thousands of people post at once;
- the roadmap needs **an offline-first SDK sooner than we can build one**.

**Live voice and video calls are no longer a reason to stay.** Stream sells Video as a separate product, billed per participant-minute, and it can sit beside an in-house chat. LiveKit and Daily are alternatives (see [Voice and video](#voice-and-video-what-it-means-and-why-it-no-longer-decides-this)).

**Photos and videos *in* messages** are the remaining media gap. We would build them on R2 with a moderation API.

See [What would change this](#what-would-change-the-recommendation).

**Answers to the founder's follow-up questions (2026-11-19):**

1. **Calls.** These can come from Stream Video, LiveKit or Daily without keeping Stream Chat.
2. **Scale.** The limit is about conversation shape, not Convex. A room with thousands of people writing at once is the one hard case. Xolace has no planned feature like that, and the design has an answer if one appears.
3. **A Xolacer's AI stand-in.** It fits the sketch (an `ai` author acting `onBehalfOf` a Xolacer, with `held` reused for approval). It brings real disclosure duties (EU AI Act Art. 50, California SB 243, Utah HB 452) and needs a legal read before it is built.
4. **A local Convex component for chat.** My lean is not yet. Start with a `convex/chat/` domain folder and `chat_*` tables, shaped so the core can later be pulled out into a component without rework. See [Component or domain folder](#chat-as-a-local-convex-component-or-a-domain-folder).
5. **WatermelonDB for offline.** No.
   - Upstream has been quiet since Aug 2025, and New Architecture support relies on community patches.
   - It needs patches on React Native 0.88, which we ship.
   - Its pull/push protocol would make us re-implement chat rules as a generic sync endpoint and keep a second source of truth beside Convex's subscriptions.
   - Use a disposable `expo-sqlite` cache plus a durable outbox instead.
   - Revisit only if chat must be fully offline-first. See [Options for the on-device store](#options-for-the-on-device-store).

**Hybrid?** Not as an end state. Keeping 1:1 chat on Stream and building circles on Convex means two read-state systems, two thread UIs and two moderation pipelines. ADR 0013 rejected exactly that "second, divergent read-state mechanism" when it chose Stream for the Xolace channel [V]. The only hybrid worth having is temporary: during cutover, old binaries keep reading Stream (see [store gap](#cutover-and-the-store-gap-rule)).

## What Stream does for Xolace today

### Inventory

| Concern | Who does it today | Where |
|---|---|---|
| Conversation lifecycle (requested, open, resting, closed), caps, camper tags, archive, delete, rating gate | **Convex** | `convex/xolacerChat.ts` (2,666 lines), table `xolacer_conversations` (`schema.ts` ~3294-3403) [V] |
| Stream user + channel creation on accept; deterministic channel id `xolacer_<conversationId>` | Convex → Stream REST | `xolacerChat.acceptRequest`, `lib/chatNotifications.ts` `xolacerChannelId` [V] |
| Auth to Stream: a 30-day user token minted by Convex | Convex | `integrations/stream.ts` `mintUserToken`, `xolacerChat.getStreamToken` [V] |
| Message storage, ordering, edit, delete | **Stream** | Client SDK; actions allowed: copy, edit, delete, flag, retry (`thread/messages/channel-config.tsx` `ALLOWED_ACTIONS`) [V] |
| Reactions (7 curated: hug, love, thanks, growth, fire, smile, laugh) | Stream | `features/connect/reactions.ts` [V] |
| Quoted replies (swipe-to-reply) | Stream | `thread/messages/quoted-reply.tsx`; no threads (`replies: false`) [V] |
| Attachments | **Off by design** ("Text plus a curated reaction set, no thread replies, no attachments") | `channel-config.tsx:18-20`, `TEXT_ONLY_CAPABILITIES` [V] |
| Link previews | Stream `url_enrichment`, on "by ruling" | old `CONTEXT.md` "Chat moderation lanes" [V] |
| Typing + online/last-active | Stream channel events | `thread/use-counterpart-activity.ts` [V] |
| App presence (directory "around now") | **Convex** `@convex-dev/presence`, one room `app` | `convex/presence.ts` [V] |
| Read state + unread | Stream `total_unread_count` is the single owner; the client folds events, and the push path asks Stream `GET /unread` | `lib/stream-chat/unread-badge.ts`, `chatNotifications.sendMessagePush` [V] |
| Offline cache + queued sends | Stream RN SDK `OfflineDB` (op-sqlite); Xolace adds reset-on-account-switch generation guards | `lib/stream-chat/offline-db.ts`, `connect-plan.ts`, `use-chat-warmup.ts` [V] |
| "Message sent" signal to the backend | Stream `message.new` webhook → `notifyNewMessage` (counts messages, pushes, schedules moderation) | `streamWebhook.ts`, `streamGunzip.ts`, table `stream_webhook_events` [V] |
| Push for chat | **Convex** via `@convex-dev/expo-push-notifications`; body is content-free ("Sent you a message"); 2-minute suppression window, then badge-only pushes | `chatNotifications.ts`, `lib/chatNotifications.ts` [V] |
| Pre-delivery moderation | Stream blocklists: `contact_leak` regex + `url_detection_v1`, action `flag` (never block); automod off | `lib/streamSetup.ts:41-79` [V] |
| Post-delivery moderation | **Convex**: one Haiku call per qualifying message → verdict row (no text) → crisis/support card as a Stream system message, or `flagStreamMessage` | `ai/chat/moderate.ts`, `ai/chat/classify.ts`, table `chat_moderation_events` [V] |
| Flag (one message) / report (a person) | Both: `product_feedback` row **and** Stream's moderation queue; review is "the Stream dashboard, only" | `productFeedbackFlags.ts`, `thread/use-flag-message.ts` [V] |
| Block | Convex closes rows; Stream channels are frozen | `xolacerChat.blockConversation` [V] |
| The Xolace channel (one broadcast to every user) | Stream channel type `xolace-broadcast`, one sender role, every profile a member; Convex keeps `xolace_channel_cache` for the list row and fans out pushes | `streamSetup.ts`, `xolaceChannelNotifications.ts`; ADR 0013 (pre-monorepo, `git show 35e0adb4^:docs/adr/0013-...`) [V] |
| Account deletion | Convex rows plus `purgeStreamUser` (fail-open) | `jobs/accountDeletionFinalize.ts:182-185` [V] |
| App config as code | `bun stream:setup` / `stream:webhook` per environment | `packages/backend/package.json:32-35` [V] |

Footprint: about 4.8k backend lines import `integrations/stream` [V]. On mobile, 32 files (about 3.1k lines) import `stream-chat`/`stream-chat-expo` [V]. The rest of `features/connect` (about 11.7k lines) is Xolace's own models and screens, and most of it survives a switch.

### Friction that exists only because there are two systems

These come from code comments and the pre-monorepo `CONTEXT.md` (all [V]):

- **Webhook plumbing.**
  - Stream gzips large payloads, so production broke until `streamGunzip` sniffed the magic bytes (`streamWebhook.ts:27-35`).
  - Retries can double-count, which is why there is a dedupe table keyed on `x-webhook-id`.
  - A `kind` check stops Xolace's own card from coming back through the webhook as a message.
- **Unread.** "One unread number" exists because a second counter "already caused two stale-badge bugs" (#139). The fix was to read Stream's number before every push (one REST call per push), plus a client fold that has to wait for Stream's handshake.
  - With messages in Convex, the count is written in the same transaction as the message. The reason that rule rejected a Convex counter goes away (see [Unread](#unread-and-the-badge)).
- **Identity leakage.**
  - "Any Stream component that renders a user's name or image must be overridden here" (`channel-config.tsx:44-46`). The Stream user record is shared and pseudonymous, while camper tags differ per pair.
  - The SDK's `Reply` and "who reacted" views needed their own overrides too.
- **Two review places.** A flag is written twice (`useFlagMessage` settles both halves independently and reports each to Sentry). Review happens in Stream's dashboard, outside `apps/admin`.
- **The Xolace channel.**
  - Every user is a Stream member.
  - `read_events` had to be turned back on, or it never badged.
  - Broadcast pushes make one Stream unread call per member per message (`xolaceChannelNotifications.ts:8-10`, a noted shortcut).
  - The webhook branches on its id before conversation resolution.
- **Client warm-up.** `useChatWarmup` re-queries on every foreground and caps prefetch at 30 channels. The SDK's `channels.queried` fires before counts are hydrated, so the hook re-dispatches it.

None of these is a bug in Stream. Each is the price of putting a vendor's channel model under a domain model Xolace already owns.

## Lessons from the sample apps

### Per app

**Mattermost** (`mattermost-mobile-main`, WatermelonDB) [V]
- **Membership row carries the read state.** `my_channel` has `last_viewed_at`, `message_count`, `mentions_count`, `manually_unread` and `last_fetched_at` (`app/database/schema/server/table_schemas/my_channel.ts:13-25`). Unread = `channel.total_msg_count − member.msg_count`, and the server sends counters, not lists (`handlers/channel.ts:254-260`).
- **Idempotent send.** `pending_post_id = "${userId}:${Date.now()}"`; the client refuses to resend while a non-failed local copy exists, and the server echo replaces the temp row (`app/actions/remote/post.ts:88-95`; `handlers/post.ts:~513`).
- **Gaps are recorded explicitly.** `posts_in_channel(earliest, latest)` ranges are merged, and only contiguous ranges render. Catch-up asks for "updated since `lastFetchedAt`", which also returns edits and deletes (`actions/remote/post.ts:347-439`).
- **Message type is one string.** System messages are `system_*` with a JSON `props` payload (`app/constants/post.ts:7-36`). Soft delete uses `delete_at`, and the edit window is server config.
- **Content-free push.** An `id_loaded` push carries no content; the iOS extension acks it and fetches the text (`ios/Gekidou/.../PushNotification.swift:43-79`). There is also a `clear` push for badge sync and reply-from-notification. No user-facing report flow in mobile.

**Rocket.Chat** (`Rocket.Chat.ReactNative-develop`) [V]
- **The client id is the real id.** `_id = random(17)`, so the echo is an upsert. Status SENT/TEMP/ERROR, and a SENT row never moves backwards (`app/lib/methods/sendMessage.ts:114`, `:17-33`).
- **The subscription row holds unread state.** `unread`, `alert`, `user_mentions`, `tunread[]`, `ls`, `last_open`, `blocked`/`blocker`, `muted`, `ro`, plus `sys_mes` to hide system types per room (`app/lib/database/schema/app.js:7-78`).
- **Catch-up uses separate UPDATED and DELETED cursors.** `lastOpen` advances only after the UPDATED cursor has drained (`loadMissedMessages.ts`, `updateLastOpen.ts`). History pages insert a `load_more` placeholder row where a gap remains.
- **Moderation primitives.** Report message (`restApi.ts:338-340`), block DM, ignore user, mute, read-only rooms, and permission strings mapped to roles (`getPermissions.ts`).
- **Private push mode.** `messageIdOnly` lets the notification service extension fetch content with auth (`ios/NotificationService/NotificationService.swift:25`).

**Chatwoot** (`chatwoot-mobile-app-develop`; the closest model for "an AI-guided group") [V]
- **Bots are senders.** A sender can be Contact, Agent, `AgentBot` or `CaptainAssistant` (AI). Conversation status includes `bot`/`pending` until a human takes over, then `open`. Also snooze, priority and SLA (`src/types/Message.ts`, `constants/index.ts:97-111`).
- **Two discriminators.** `messageType` is incoming / outgoing / **activity** (system) / template. `contentType` covers interactive cards (`input_select`, `form`, `cards`, `input_csat`). `private: true` marks staff-only notes.
- **Optimistic send.** The UUID is both `id` and `echoId`; status goes `progress` → `failed` with `meta.error`. Retry is disallowed after 24 h (`src/utils/messageUtils.ts:16-68`).

**Signal-iOS** [V]
- **One wide timeline table.** `model_TSInteraction` uses a `recordType`. Trust-and-safety events are timeline rows: `TSInfoMessageReportedSpam`, `BlockedOtherUser`, `AcceptedMessageRequest` (`SignalServiceKit/Messages/Interactions/TSInfoMessage.h:15-58`).
- **Delete-for-everyone keeps the row.** It strips content, reactions and attachments and sets `wasRemotelyDeleted` (`TSMessage.m:678-703`). Admin deletes record who did it (`AdminDeleteManager.swift`).
- **Edits are full revision rows** linked by `EditRecord`. Past revisions are excluded from the unread index (`GRDBSchemaMigrator.swift:~2917-2953, 6457-6490`).
- **Quotes are snapshots.** A reply still renders after the original is deleted (`Quotes/TSQuotedMessage.h:27-56`).
- **Attachments are split into blob and reference.** `Attachment` holds the blob; `MessageAttachmentReference` holds owner, order and caption. Orphans are garbage-collected (`GRDBSchemaMigrator.swift:~6610-6913`).
- **Message requests withhold read receipts** until the request is accepted (`MessageRequestPendingReceipts.swift`).
- **E2EE limits what the server can do.** With E2EE the server sees ciphertext, so a spam report is a sender id plus an opaque token. Server-side crisis detection and moderator review are impossible by construction. **Not appropriate for a moderated mental-health product;** borrow Signal's privacy UX, not its cryptography.

**Status** (`status-app-master`; status-go not vendored, read from Nim DTOs) [V]
- **Chat model.** Chat types run from one-to-one to community. The server computes capability flags per viewer (`canPost`, `canView`, `canPostReactions`) and sends them with the chat (`src/app_service/service/chat/dto/chat.nim:67-105`).
- **Deletes are attributed.** `deletedBy` is empty when the sender deleted the message; `deletedForMe` covers a local hide (`message/dto/message.nim:121-122, 257-260`).
- **Fine-grained roles.** `ManageUsers`, `ModerateContent` and `Admin` are separate. There are ban states, including `BannedWithAllMessagesDelete`, and timed mutes (`For15min`…`TillUnmuted`) (`community/dto/community.nim:24-50`).
- **Moderation is advisory.** It is peer-to-peer (Waku) with E2EE, so a ban or delete for everyone can't be guaranteed. Take the vocabulary, not the transport.

**flutter_chat_ui** [V]
- **A sealed `Message` union.** It has `@Freezed(unionKey: 'type', fallbackUnion: 'unsupported')`, with `text`, `image`, `file`, `audio`, `system`, **`custom`** (app payload in `metadata`) and **`unsupported`** (`packages/flutter_chat_core/lib/src/models/message.dart:15-16, 425, 472`).
- **Status is derived from timestamps**: `sentAt`, `deliveredAt`, `seenAt`, `failedAt` (`resolvedStatus`, :521-536).
- **Old clients degrade, they don't crash.** An unknown type renders "not supported, please update". This is the pattern for Xolace's store-gap rule.

**convex-slack** (a Convex component mirroring Slack) [V]
- **Soft edit/delete.** `messages` has `editedAt` and `deletedAt` so a reactive UI can show "edited" or "deleted" (`src/component/schema.ts:98-124`).
- **Webhook dedupe table and HMAC with replay window.** A dedupe table keyed on event id, plus HMAC verification with a 5-minute replay window (`src/client/index.ts:237-251`).
- **What to avoid.** There is **no auth in the example's public queries**, and it uses `take(50)` rather than `paginate`. Don't copy those.

**chat-template** is not a Convex app. It is an AI chatbot UI (`src/components/chat/types.ts:1-5`), useful only for its ~30 fps throttled rendering of streamed text [V].

### Cross-cutting patterns

1. **The client generates the message id, and the server dedupes on it.** All three non-E2EE apps do this. On Convex it is a `clientId` field with an index and an "already there → return the existing id" check inside the send mutation.
2. **Read state lives on the membership row,** as a counter or a last-read pointer, never as per-message receipt rows. Mentions are counted separately, and "mark unread" is a flag.
3. **System events are rows in the same timeline,** told apart by a kind/type field with a JSON payload. Cards are a `custom` kind. Unknown kinds fall back to an "update the app" bubble.
4. **Deletes are tombstones.** Keep the row and record who deleted it (self, moderator, system). Strip the body and attachments, and let quotes snapshot what they need. Edits stamp `editedAt`. Keep revisions only where moderation needs evidence.
5. **History pages by cursor; catch-up by "changed since".** Convex reactive queries remove the catch-up half while online, but an offline cache still needs an `updatedAt` to reconcile.
6. **Pushes carry no content,** or only an id the device resolves with auth. Xolace already does the content-free half.
7. **Roles are capability sets**, not one admin flag. Moderation verbs (report, block, mute, ban, remove-with-messages) are first-class records with an audit trail.
8. **A bot or AI is a sender with its own kind,** and a conversation status marks whether a human or the bot is "holding" it (Chatwoot).

## A Convex foundation (sketch)

This is a sketch to make the decision concrete. Names are placeholders; a real design goes through `packages/backend/AGENTS.md` and an ADR.

### Principles

- **One model for every chat surface.**
  - Xolacer DMs, circles and the Xolace channel are all conversations with a `kind`.
  - The domain rules per kind (seeker–Xolacer lifecycle, caps, rating) stay in their feature folders.
  - A shared `convex/chat/` core owns messages, membership, reads, reactions and moderation hooks.
- **The send mutation is the choke point.** Auth, membership, block, rate limit, regex, sequence number, counters and push scheduling all happen in one transaction. Nothing depends on a webhook to learn that a message exists.
- **Store message text, deliberately.** Today Stream holds it. In-house, Convex will, so retention and deletion rules must be explicit. Verdict rows keep their "never the text" rule, and the AI layers must not read chat into Understanding/Memory without a decision.
- **Additive and forward-compatible** (store-gap rule):
  - `kind` unions only widen;
  - clients render unknown kinds as "update Xolace to see this";
  - new fields are optional.

### Candidate tables

```ts
// convex/chat/schema-sketch.ts (illustrative, not code to paste)

conversations: defineTable({
  kind: v.union(
    v.literal("xolacer_dm"),   // seeker <-> Xolacer, 1:1
    v.literal("circle"),       // small group, time-boxed, may include the AI
    v.literal("broadcast"),    // the Xolace channel: one writer, no member rows
  ),
  status: v.union(v.literal("active"), v.literal("frozen"), v.literal("closed")),
  // Domain row that owns lifecycle, e.g. xolacer_conversations._id or circles._id
  ownerRef: v.optional(v.union(
    v.object({ table: v.literal("xolacer_conversations"), id: v.id("xolacer_conversations") }),
    v.object({ table: v.literal("circles"), id: v.id("circles") }),
  )),
  // Monotonic per conversation; assigned in the send mutation.
  lastSeq: v.number(),
  // Messages that count toward unread (user + AI text; not system/cards).
  countedMessages: v.number(),
  lastMessageAt: v.optional(v.number()),
  lastMessagePreview: v.optional(v.string()), // or omit, and keep previews out of list queries
  expiresAt: v.optional(v.number()),          // circles
  settings: v.object({ reactions: v.boolean(), attachments: v.boolean(), typing: v.boolean() }),
})
  .index("by_kind_and_status", ["kind", "status"])
  .index("by_status_and_expiresAt", ["status", "expiresAt"]),

conversation_members: defineTable({
  conversationId: v.id("conversations"),
  emotionalProfileId: v.id("emotional_profiles"),
  role: v.union(v.literal("member"), v.literal("facilitator"), v.literal("xolacer"),
                v.literal("seeker"), v.literal("observer")),
  displayAlias: v.string(),        // per-conversation pseudonym (camper tag), never the real name
  joinedAt: v.number(),
  joinedAtSeq: v.number(),         // no history before this for circle joiners
  readCount: v.number(),           // unread = conversation.countedMessages - readCount
  lastReadSeq: v.number(),         // position marker for "new messages" divider
  mutedUntil: v.optional(v.number()),
  archivedAt: v.optional(v.number()),
  leftAt: v.optional(v.number()),
  removedBy: v.optional(v.union(v.literal("self"), v.literal("moderator"), v.literal("system"))),
  canPost: v.boolean(),            // server-computed capability, Status-style
})
  .index("by_conversation", ["conversationId"])
  .index("by_profile_and_lastActivity", ["emotionalProfileId", "archivedAt"]) // inbox + badge sum
  .index("by_conversation_and_profile", ["conversationId", "emotionalProfileId"]),

messages: defineTable({
  conversationId: v.id("conversations"),
  seq: v.number(),
  clientId: v.optional(v.string()),     // idempotency key from the device (uuid)
  author: v.union(
    v.object({ type: v.literal("member"), profileId: v.id("emotional_profiles") }),
    v.object({ type: v.literal("ai"), persona: v.string() }),   // the motivator
    v.object({ type: v.literal("system") }),                    // Xolace speaking
  ),
  kind: v.union(
    v.literal("text"),
    v.literal("card"),         // typed payload below: crisis_resources, check_in, prompt...
    v.literal("event"),        // joined, left, circle_opened, circle_closing, removed...
  ),
  body: v.optional(v.string()),
  payload: v.optional(v.any()), // validated per card/event type in code; never trusted from clients
  replyTo: v.optional(v.object({ messageId: v.id("messages"), snapshot: v.string() })),
  visibility: v.union(
    v.literal("visible"),
    v.literal("held"),         // awaiting classifier; sender sees it as "sending"
    v.literal("hidden"),       // moderator/system removed; tombstone shown
  ),
  editedAt: v.optional(v.number()),
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.union(v.literal("author"), v.literal("moderator"), v.literal("system"))),
  hasAttachments: v.optional(v.boolean()),
})
  .index("by_conversation_and_seq", ["conversationId", "seq"])
  .index("by_conversation_and_clientId", ["conversationId", "clientId"]),

message_reactions: defineTable({            // one row per (message, user, type): no hot arrays
  messageId: v.id("messages"),
  conversationId: v.id("conversations"),
  profileId: v.id("emotional_profiles"),
  type: reactionTypeValidator,              // the curated seven, widenable
})
  .index("by_message", ["messageId"])
  .index("by_message_and_profile", ["messageId", "profileId"]),

message_attachments: defineTable({          // Signal-style reference row
  messageId: v.id("messages"),
  conversationId: v.id("conversations"),
  storage: v.union(v.object({ convex: v.id("_storage") }), v.object({ r2Key: v.string() })),
  mime: v.string(), bytes: v.number(), order: v.number(),
  scan: v.union(v.literal("pending"), v.literal("clean"), v.literal("blocked")),
}).index("by_message", ["messageId"]),

message_revisions: defineTable({            // only if edits stay on: evidence for moderation
  messageId: v.id("messages"), body: v.string(), replacedAt: v.number(),
}).index("by_message", ["messageId"]),

chat_reports: defineTable({                 // replaces Stream's queue; links product_feedback
  conversationId: v.id("conversations"),
  messageId: v.optional(v.id("messages")),
  reporterProfileId: v.id("emotional_profiles"),
  subjectProfileId: v.optional(v.id("emotional_profiles")),
  source: v.union(v.literal("flag"), v.literal("report"), v.literal("classifier"), v.literal("regex")),
  categories: v.array(chatModerationCategoryValidator),
  status: v.union(v.literal("open"), v.literal("actioned"), v.literal("dismissed")),
  evidence: v.optional(v.string()),         // snapshot of the reported text, purged on resolve + N days
  resolvedBy: v.optional(v.string()), resolvedAt: v.optional(v.number()),
  action: v.optional(v.union(v.literal("none"), v.literal("hide_message"), v.literal("mute"),
                             v.literal("remove_member"), v.literal("suspend_chat"))),
})
  .index("by_status_and_createdAt", ["status", "_creationTime"])
  .index("by_subject", ["subjectProfileId"]),

profile_blocks: defineTable({               // person-level, not conversation-level
  blockerProfileId: v.id("emotional_profiles"),
  blockedProfileId: v.id("emotional_profiles"),
  createdAt: v.number(),
})
  .index("by_blocker_and_blocked", ["blockerProfileId", "blockedProfileId"])
  .index("by_blocked", ["blockedProfileId"]),

chat_restrictions: defineTable({            // moderator actions on a person
  profileId: v.id("emotional_profiles"),
  type: v.union(v.literal("muted"), v.literal("suspended")),
  until: v.optional(v.number()), reason: v.string(), by: v.string(),
}).index("by_profile", ["profileId"]),

typing: defineTable({                       // or the presence component, one room per open thread
  conversationId: v.id("conversations"),
  profileId: v.id("emotional_profiles"),
  until: v.number(),
}).index("by_conversation", ["conversationId"]),
```

Notes on the sketch:

- **`xolacer_conversations` stays the source of truth for the DM lifecycle.** It gains an optional `conversationId` pointing at the new core row, replacing `streamChannelId`; the old field is deprecated, not removed. `chat_moderation_events` gains an optional `messageId: v.id("messages")` next to `streamMessageId`.
- **`v.any()` for `payload` is deliberate in the sketch only.** In practice use a `v.union` of per-card validators so each card type is checked at write time. Clients never write cards; only internal functions do.
- **Indexes cover every read path** (inbox, thread page, idempotency, reaction toggle, report queue, block check), so nothing needs `.filter` on a scan.

### The send path

`chat/messages.send` is a mutation with args `{ conversationId, clientId, body, replyToId? }`. Its steps:

1. `requireAuth`, then load the member row through `by_conversation_and_profile`. Reject if the caller is not a member, has `leftAt` set, or has `canPost` false.
2. **Idempotency.** Look up `by_conversation_and_clientId`. If the row exists, return its id. Combined with Convex's own exactly-once guarantee for retried mutations ("every mutation call only executes once" [V]), this also covers a device-side outbox resending after an app restart.
3. Check blocks against every other member (`profile_blocks`, both directions), `chat_restrictions`, and the conversation's `status` and `expiresAt`.
4. Rate-limit through `@convex-dev/rate-limiter`. It is transactional ("all rate limit changes will roll back if your mutation fails") and supports per-user keys and token buckets [V]. Buckets are per user per minute and per conversation, with a stricter bucket for new circle members.
5. Run the cheap synchronous checks: length, the existing contact-leak regexes (moved from `lib/streamSetup.ts`), and URLs. Choose `visibility`:
   - **1:1 Xolacer DM:** `visible`. This matches today's "flag, never block" ruling and today's post-delivery lane.
   - **Circle:** `held` when the regex hits, or for a member's first N messages. Otherwise `visible`.
6. `seq = conversation.lastSeq + 1`. Insert the message, patch the conversation (`lastSeq`, `countedMessages`, `lastMessageAt`), and set the sender's `readCount`/`lastReadSeq` to match, because sending implies having read.
7. Schedule the side effects with `ctx.scheduler.runAfter(0, …)`. If one fails, it never rolls back the send:
   - pushes to the other members;
   - the moderation classifier for qualifying text (`shouldModerateChatMessage`, unchanged);
   - for a `held` message, a release step.

**The conversation document is the hot spot.** Every send in one conversation writes it, and Convex resolves conflicts by retrying the transaction (OCC [V]). That is fine at DM and circle scale, a handful of writers. It would not be fine for a 10k-member room; that shape is the broadcast kind, which has exactly one writer.

### Unread and the badge

- **Per conversation:** `unread = conversation.countedMessages − member.readCount`. This is Mattermost's model.
  - Mark-read is a mutation called as the newest message comes into view. It sets `readCount` to `countedMessages` and `lastReadSeq` to `lastSeq`.
  - System events and cards don't increment `countedMessages`. That replaces Stream's `skip_last_msg_update_for_system_msgs`.
- **Badge:** sum over the caller's `conversation_members` rows, plus the broadcast pointer. One reactive query feeds the Connect tab badge, and the push path computes the same number inside the send transaction.
  - The single-owner invariant of "One unread number" is kept: the owner is now Convex.
  - The old objection to a Convex counter (#140 option 3: two counters drift) doesn't apply, because the counter and the message commit together.
  - The `null`-until-handshake logic and the `GET /unread` call per push both disappear.
- **The Xolace channel (broadcast):** no member rows for 'every user'. Each user gets a lazily created pointer row, `broadcast_reads {profileId, readCount}`, and unread = `countedMessages − (pointer?.readCount ?? countedAtSignup)`.
  - This fixes the shape ADR 0013 accepted as a cost: every user a member, read fan-out, one unread fetch per member per broadcast.
- **Not needed for this:** the aggregate component. It counts in O(log n) with a namespace per channel, but warns that time-keyed inserts "will wait for each other" [V]. It is worth it only if exact "unread since timestamp" over long histories becomes a need.
- **Third-party components exist but are early.** `convex-chat` ("early alpha … API and data model may change") and `convex-unread-tracking` [V]. Read them for ideas; don't depend on them for a safety-critical surface.

### Pagination and sync

- **Thread history:** a `messages.page` query over `by_conversation_and_seq`, `.order("desc").paginate(opts)`, consumed by `usePaginatedQuery`.
  - Convex paginated queries are "completely reactive": pages grow when items are added and shrink when they are removed [V].
  - Cursors are bound to the exact query (index, range, order). Changing args resets to page one [V], so keep the args stable per thread.
  - The query must filter `visibility` per viewer (a held message is shown to its author only) and members' `joinedAtSeq`. Do that in JS on the page, not with a data-dependent `.filter`, which the docs warn can scan widely [V].
- **Limits are comfortable:** 16 MiB and 32,000 documents scanned per query, 1 MiB per document [V]. A page of 30-50 text messages with reactions joined is small.
  - Join reactions per page through the `by_message` index, or keep a small denormalized `reactionSummary` on the message, written by the reaction mutation.
  - Avoid patching the message document on every reaction in busy circles; per-user reaction rows avoid hot-document conflicts.
- **Inbox:** member rows by profile, joined to their conversations. The list is small: caps are 8 open conversations per Xolacer and 3 per seeker (`xolacerChat.ts:167-184`) [V]. Today's `myConversations` keeps its role-aware shaping.
- **No gaps to manage online.** While connected, subscriptions are consistent ("a consistent view of the query results based on a single state" [V]). Gaps exist only in an offline cache (next section).

### Offline (the biggest thing Stream gives us)

What Stream's RN SDK does today [V]:

- loads from SQLite before the network;
- queues send/delete/reaction actions, which "survive app restarts and OS kills";
- syncs missed events on foreground;
- needs `op-sqlite` and a reset on sign-out.

Xolace already wraps the reset carefully (`offline-db.ts`).

What Convex gives:

- mutations retried until confirmed and executed exactly once [V];
- reconnect handling;
- **no persistent query cache and no durable outbox.** Staff describe "intermittent connection" support, not offline [S].

What we would build:

- **Read cache:** persist the last ~50 messages and the inbox per conversation in `expo-sqlite`, keyed by account and cleared the same way `ChatLocalDataGuard` clears today. (MMKV isn't installed; `expo-sqlite` already backs the Zustand store through `expo-sqlite/kv-store`, `src/lib/storage/unified-storage.ts` [V].)
  - Paint from cache, then let the live query replace it.
  - Messages carry `seq` and `editedAt`/`deletedAt`, so a reconciling merge is "live page wins".
- **Outbox:** pending sends `{clientId, conversationId, body, createdAt}` persisted on device and flushed on reconnect.
  - The server dedupes on `clientId`. The UI shows "sending" or "failed, tap to retry", reusing the same `clientId` (Rocket.Chat and Chatwoot rules: never move a sent message backwards; give up after a window).
  - Optimistic rendering through `withOptimisticUpdate` covers the online case: the docs' chat example inserts a placeholder with a random id and rolls it back on the server result [V].
- **Accept** that offline edits, reactions and deletes are not queued in v1; the UI disables them offline. Stream's offline threads don't work either [V], and Xolace doesn't use threads.

Effort: moderate (about 1-2 weeks including tests). It is well-trodden, and the Signal, Mattermost and Rocket.Chat patterns above are the reference.

#### Options for the on-device store

The founder asked whether **WatermelonDB**, the local database Mattermost and Rocket.Chat use, could back Xolace chat's offline side.

**WatermelonDB, checked on its repo, docs and releases this session:**

- **Maintenance: effectively stalled.**
  - Last stable release `v0.28.0` (2025-04-07); last prerelease `v0.28.1-0` (2025-07-24). The last commit on the default branch was 2025-08-11 (a docs fix). There are 51 commits since 2025-01-01 and **none in 2026** [V] (GitHub API).
  - There are 317 open issues [V]. The issue "Has WatermelonDB been abandoned?" (#1963, April 2026, 11 comments) has no maintainer reply [V].
  - A maintainer wrote in Nov 2024 that he had "not been able to find enough time recently to work on WatermelonDB" (#1769) [V].
  - A community member announced a TypeScript/Nitro-modules rewrite ("NitromelonDB") in Aug 2026, as an alpha [V] (issue comments; the fork itself was not evaluated).
- **New Architecture / bridgeless.**
  - 0.28 added "Support for React Native 0.74+" and a new Android JSI package registration (CHANGELOG) [V].
  - The "Bridgeless Mode support (New Architecture)" issue is still open with 82 comments, and its fixes are community patches (#1769) [V].
  - An Oct 2026 comment reports 0.28.0 doesn't build on React Native 0.88 / Android Gradle Plugin 9 without patches (#1969) [V]. **Xolace is on React Native 0.88.1** (`apps/mobile/package.json:103`) [V].
  - Both sample apps run `newArchEnabled=true` (`android/gradle.properties:38`) on `0.28.1-0`. Mattermost carries a 752-line `patches/@nozbe+watermelondb+0.28.1-0.patch` [V].
- **Expo.** The installation docs don't mention Expo or a config plugin [V]. Open issues report Expo SDK 52/54 problems (#1892, and Nov–Dec 2025 issues) [V]. It needs native code and a dev build; Xolace already uses dev builds, so that part is fine.
- **Sync protocol** (docs) [V]:

  | Side | Requirement |
  |---|---|
  | Pull | `{lastPulledAt, schemaVersion, migration}` → all created/updated/deleted ids for every collection since `lastPulledAt`, plus a `timestamp`. Queries must be consistent ("synchronously or in a write lock") |
  | Push | "MUST be fully transactional", and must abort if any record changed on the server after `lastPulledAt` |
  | Server rules | A server-set `last_modified` on every row, monotonic timestamps, tracked deletions (soft-delete flag or a deleted-ids table), revoked access sent as `deleted` |
  | Client | Default conflict resolution is per column: "All columns that were changed locally win and will be applied on top of the remote version" (`src/sync/impl/helpers.js:11-14`) |

- **What a Convex backend for it would need:**
  - an `updatedAt` field and index on every synced table, or a single change-log table;
  - tombstones for every delete;
  - a pull query that returns *the caller's* changes across conversations, which means filtering by membership. That means many index ranges, and pagination when a user's change set is large (4,096 index ranges and 32,000 scanned docs per call [V]);
  - membership changes turned into `created`/`deleted` for whole conversations;
  - a push mutation that re-implements every send, edit, react and delete rule (auth, blocks, rate limits, `held`) in a generic "apply these rows" shape;
  - rate limits on push.

  Convex's native reactivity (live paginated queries) would sit *beside* this. You either drop subscriptions and poll `synchronize()`, or keep both and treat the local DB as **a second source of truth** that the UI reads while subscriptions only trigger syncs.
- **How the sample apps actually wire it.** Neither uses WatermelonDB's `synchronize()`; no `@nozbe/watermelondb/sync` import exists in either app [V]. Each writes server data into the DB with its own handlers:
  - Mattermost: socket event → `handleNewPostEvent` → `operator.handlePosts` → `batchRecords` (`app/actions/websocket/posts.ts:60-233`) [V].
  - Rocket.Chat: `stream-room-messages` → `db.write`/`db.batch` (`app/lib/methods/subscriptions/room.ts:53, 159-163`) [V].

  WatermelonDB is their local store and observable query layer; they own sync themselves. Their servers were designed for it (`since`/`updatedSince` endpoints, earlier sections).
- **Web, desktop and CLI.** Web uses the LokiJS adapter over IndexedDB (`src/adapters/lokijs`) [V]. Xolace's web and desktop are Convex-live by default and don't need an offline chat store today. The CLI runs on Bun, where WatermelonDB's Node path uses `better-sqlite3` (CHANGELOG) [V], with no reason to add it. **WatermelonDB would be mobile-only for us.**

**Alternatives:**

| Option | Status (primary source) | Fit for Xolace chat |
|---|---|---|
| **(a) The plan above:** read cache + outbox on `expo-sqlite`, optionally with Drizzle | Already installed (`expo-sqlite ~58.0.17`). Drizzle has an `expo-sqlite` guide with `drizzle-kit` migrations; SQLCipher via config plugin; `addDatabaseChangeListener`; `deleteDatabaseAsync` for wiping (Expo docs) [V]. `op-sqlite` is installed only for Stream's offline DB; nothing in `src` imports it directly [V] | **Best.** Convex subscriptions stay the source of truth; the cache is disposable. Small surface, maintained by Expo, works on the RN version we ship |
| **(b) TinyBase / Legend-State** | No Convex persister among TinyBase's listed persisters (custom SQLite persisters possible) [S]. Legend-State has sync plugins for Keel, Supabase and others and a generic CRUD plugin; the only Convex plugin found is a 2024 community repo [S] | No advantage over (a) for a message cache; adds a state library alongside Zustand |
| **(c) Convex's own offline work** | Convex's sync page: "Convex doesn't currently provide a full offline sync mechanism … The team is actively exploring this space" (undated) [V]. The alpha "offline sync engine for Convex" demo (`convex/curvilinear`) is **archived** [V]. The "Object Sync Engine" blog post describes a direction, not a product [S]. **No official offline/local-first component or engine exists as of 2026-11-19** as far as I could find | Nothing to adopt; watch it |
| **(d) Postgres sync engines** | Zero: "Today only Postgres is supported" [V]. **PowerSync announced *experimental* Convex source support on 2026-06-10.** It reads Convex's Streaming Export API (snapshot, then polling `document_deltas` every 1000 ms on Cloud), needs a deploy key and a checkpoints table, and sends writes back through your own Convex mutations. "Long-term support can't be guaranteed" [V] | Interesting but **experimental**, and it puts a deploy-key-holding third party in the path of every chat row. That re-opens the DPA question this rebuild is meant to close. Not for v1; revisit if it leaves experimental |

**Lean: (a), a disposable `expo-sqlite` cache plus a durable outbox, with Convex live queries as the only source of truth. Not WatermelonDB.**

- Its maintenance has stalled.
- It needs patches on the React Native version we ship (0.88.1).
- Its sync protocol would make us rebuild every chat rule as a generic push endpoint and keep a second source of truth beside Convex's subscriptions.
- The sample apps that use it are large offline-first clients that wrote their own sync anyway.

**What would change it:** a need for **full offline-first chat**:

- offline edits, reactions and deletes that queue and merge;
- large local history, months of messages;
- offline full-text search.

Even then, the first candidates are SQLite plus our own sync (Mattermost-style handlers writing an `expo-sqlite`/Drizzle schema), or PowerSync once its Convex source is stable. WatermelonDB would only come back if the NitromelonDB rewrite or a revived upstream ships New Architecture and Expo support.

**Store-gap and sign-out wiping:**

- **The cache is disposable.**
  - Its schema can change freely: bump a version and drop and rebuild it, because the server holds everything.
  - Only the outbox must survive an app update. Keep its row shape small and versioned, and have the server accept old outbox payloads (optional new fields only).
  - A synced store like WatermelonDB would instead tie the client schema to server pull/push shapes, with migrations that must be kept forever: the sync docs warn that deleting old migrations can leave the app "permanently unable to sync" [V].
- **Sign-out wipe** stays a single choke point.
  - `ChatLocalDataGuard` → a `resetChatLocalData` that calls `deleteDatabaseAsync` on the chat database and clears the outbox. Today's generation counter in `offline-db.ts` keeps its job: dropping late writes after a reset.
  - The Stream-specific parts (`clearStreamCredential`, `disconnectUser`, the op-sqlite `resetDB` ordering) go away.
  - The outbox must also be wiped on account switch. A queued message must never send as the next account; key outbox rows by Clerk user id and drop foreign rows on start.

### Typing and presence

- **Presence:** keep the app-wide `@convex-dev/presence` room. Its design note, that per-purpose rooms multiply heartbeats (`convex/presence.ts:9-15`) [V], argues against a room per thread.
  - "Online / last active" for a counterpart is a derived query over that room, the same as the directory's.
- **Typing:** a `typing` row per (conversation, member) with `until = now + 5s`, written at most every ~3 s while composing, and cleared on send. Clients hide it past `until` using their own clock.
  - The cost is one tiny write and one subscription re-run per member per ~3 s while someone types. Fine for DMs and circles.
  - Typing stays off for broadcast, as today.
  - Alternative: the presence component also supports status like "typing" with automatic clearing [V], at the cost of a second room.

### Push (these are notifications, not outreach)

- **Reuse what exists.** Reuse `sendPushToProfile`, the content-free bodies, the chat preference toggle, the master switch and the 2-minute suppression window from `chatNotifications.ts`, unchanged in spirit.
  - The send mutation schedules one push job per recipient, which is the same shape as today minus the webhook.
  - The badge is computed in the job from Convex, so no Stream call is needed.
- **Circles fan out per member,** each recipient with their own mute and suppression stamp on the member row (today's `lastNotifiedUserAt`/`lastNotifiedXolacerAt` generalised).
  - If circles ever exceed a few dozen members, move fan-out to a `@convex-dev/workpool` pool, as `outreachPush` does, to bound concurrency.
- **Broadcast:** keep the paginated fan-out in `broadcastXolaceChannelPush`, but compute the badge locally.
- **Optional later:** Mattermost/Rocket.Chat-style "id-only" pushes plus a notification-service fetch, which would let a push show *something* without content leaving Convex. A content-free body already meets the privacy bar, so this is a nice-to-have.

### Attachments (off today; design for them, don't ship them first)

- **Two storage options:**
  - **Convex file storage:** upload URLs expire in 1 h and uploads have no size limit but a 2-minute POST timeout [V]. Its catch is that `getUrl` URLs grant access to "anyone with the URL" and are revocable only by deleting the file [V]. For private chat media, either serve through an HTTP action that checks membership (responses are capped at 100 MiB [V]) or use R2.
  - **`@convex-dev/r2`, already installed** (`convex.config.ts`). It issues signed upload URLs with `checkUpload`/`onUpload` callbacks, and `getUrl` returns expiring signed URLs (default 15 minutes) (`@convex-dev/r2@0.10.4` README, lines ~127-159 and ~356-376) [V].
  - **R2 is the better default for chat media:** membership checked at URL issue, short-lived URLs, CDN delivery.
- **Image moderation must exist before images ship.** OpenAI `omni-moderation-latest` takes images, scores self-harm categories on them, and the endpoint "is free to use" [V]. Stream's image moderation is $4-$10 per 1,000 images [V]. Hold attachments as `scan: "pending"` until cleared.
- Attachments raise the bar on CSAM handling (Play's Child Safety Standards; see below). That is another reason to keep chat text-only until there is a reviewed process.

### The AI participant, cards and circles

- **A circle** would be a domain row (`circles`: theme, facilitator, `opensAt`, `closesAt`, max members, entry criteria). It links to a `conversations` row of kind `circle` with `expiresAt`.
  - A `@convex-dev/workflow` (already installed) drives the lifecycle: open, scheduled prompts, a "closing soon" event, close (freeze), and an archive/purge policy.
  - Expiry sweeps use `by_status_and_expiresAt`.
- **The AI motivator** is an author type (`{type: "ai", persona}`), not a fake user. That avoids today's hack of the `XOLACE_SYSTEM_USER_ID` pseudo-user in Stream (`integrations/stream.ts:376`).
  - It posts through an internal mutation, so it gets the same seq, counters and pushes, with no client path.
  - Triggers are scheduled (workflow steps) or reactive (after N member messages, a quiet stretch, a member's first message). It reads Xolace's own safeguard and context.
  - `@convex-dev/agent` supports threads "shared by multiple users and agents (including human agents)" [V]. It is worth evaluating for the motivator's memory and tools. Even so, keep the *canonical* timeline in the chat tables, so moderation, unread and push stay single-sourced.
- **Cards** (`kind: "card"`, typed payload) cover:
  - the crisis/support resources card (today's Stream system message with `kind: "crisis_resources"`);
  - check-ins;
  - "what helped" prompts;
  - circle rules on entry;
  - closing reflections.

  Chatwoot's `contentType` cards (`input_select`, `form`, `input_csat`) are the precedent [V]. Card answers are mutations against the card's own table, not free-text messages.
- **Forward compatibility.** Every client renders an unknown `kind`, or an unknown card type, as a neutral "Update Xolace to see this" bubble, as flutter_chat_ui's `unsupported` does [V]. This is what makes new card types store-gap safe.
- **Fun touches** fit without a vendor: the curated reactions already exist, plus haptics, card animations and ember-style visuals. These are client work either way. In-house, a "touch" can also carry server state, such as a hug count toward an achievement. Sparks are sized by showing up, never by struggle, so check any reaction-driven achievement against the glossary.

## Chat as a local Convex component, or a domain folder?

The founder likes the idea of a component partly because chat's tables then stay out of the app schema.

### What a component can and can't do (Convex docs, checked this session)

| Question | Answer | Source |
|---|---|---|
| Local or published? | Both. Local components "can be stored anywhere in your project"; packaged ones ship on npm | Authoring [V] |
| Table isolation | Own tables, schema "only accessible by the component". The app can't read or write them directly, and "can't read your app's tables … unless you pass them in explicitly" | Components, Understanding [V] |
| Dashboard | Not described in the docs. The data page doesn't mention components. The CLI addresses component functions with `--component <name>` (migrations README) | Dashboard data page [V]; browsing component tables in the dashboard **[U]** |
| `ctx.auth` | **Not available inside a component.** "Do authentication in the app, then pass around identifiers like `userId`". Component HTTP actions don't get auth either | Authoring [V] |
| Client calls | **Not directly callable** from clients ("not directly accessible from clients via HTTP or WebSockets"). The app wraps every function it exposes | Authoring [V] |
| Pagination | `.paginate()` works and `usePaginatedQuery` works on the app wrapper. But "a query can only make one paginated call across all app and component `runQuery` calls"; `convex-helpers` `stream` is the workaround | Authoring [V] |
| File storage | "File storage, independent of the main app's file storage" | Understanding [V] |
| Scheduler / crons | Scheduler yes. Static `crons.ts` inside a component exists in practice: `@convex-dev/action-cache` ships `src/component/crons.ts` with `cronJobs()` (installed in this repo) | Authoring [V]; package source [V] |
| Child components | Yes: "a tree of components, with the main app at the root", added through the component's `convex.config.ts`. So chat could use the rate limiter or presence internally | Authoring [V] |
| Transactions | Writes "commit transactionally across calls to components". Each component call is a sub-transaction, and "a thrown exception will always roll back the component's sub-transaction". An app mutation that calls `components.chat.send` commits or rolls back with it | Understanding [V] |
| Joins with app tables | No direct reads. App ids become plain strings at the boundary, and "cannot currently have a `v.id("table_name")` validator that represents a table in another component / app". Profiles, blocks and escalation must be passed in as arguments, or the app joins after the call | Authoring [V] |
| Reactivity | Component reads are reactive like any Convex read ("data reads are automatically reactive"). App queries that call component queries stay live | Understanding [V] |
| Env vars | Isolated; declared in the component's `convex.config.ts` and passed in by the app | Authoring [V] |
| Migrations of component tables | Not documented. The migrations component's README only covers app tables | Migrations README [V]; whether it can target a component's tables **[U]** |
| Testing | `convex-test` with `t.registerComponent(name, schema, modules)`. The repo already does this for workpool (`convex/test/compoundingFollowUp.test.ts:364-369`) | Authoring [V]; repo [V] |
| Codegen | Each component has its own `_generated`. Local components are generated by `npx convex dev`; outside code imports only `_generated/component` | Authoring [V] |
| Advice from Convex | "Hybrid" components (partly overridden by the app) "introduce a lot of complexity"; compose or extend instead | Authoring [V] |

### How it fits Xolace

| | Local `components/chat` | `convex/chat/` folder with `chat_*` tables |
|---|---|---|
| Schema crowding | Tables hidden from the app schema | Namespaced prefix in the app schema (`schema.ts` is already one file of ~3,400 lines; chat would add ~10 tables) |
| Boundary | **Enforced** by the platform; clients can only reach chat through app wrappers, which is a good security property | By convention; needs a rule ("only `convex/chat/*` touches `chat_*`") and review |
| Send path | App mutation: `requireAuth` → app checks (blocks, restrictions, escalation context) → `components.chat.send({ profileId: string, … })` → app schedules push and moderation. One transaction [V] | One mutation, direct reads |
| Blocks, profiles, crisis | Live in the app. They are passed into every call (blocked ids for the page filter, alias map), or the component keeps its own copies that must stay in sync | Direct `withIndex` reads in the same query |
| Thread page | Component paginates; the app enriches the page (aliases, viewer flags). Only one paginated call per query [V], which is fine for one page | One query |
| Ids | Strings across the boundary; no `v.id("emotional_profiles")` inside chat [V] | Full `v.id` typing |
| Admin review | Needs component API functions for evidence and context windows, wrapped in `convex/admin/*` | Direct |
| AI participant, cards | App-side (they need Anthropic, the safeguard, memory); they write through the component API | Same folder |
| Tooling unknowns | Dashboard browsing and data migrations for component tables are undocumented **[U]** | Known and already used in this repo (`@convex-dev/migrations`) |
| Reuse elsewhere | Little: one Convex backend serves every Xolace client already | n/a |

**Lean: start with a `convex/chat/` domain folder and `chat_*` tables, but write the core *component-shaped* so it can be pulled out later:**

- the core takes profile ids as arguments and never calls `ctx.auth`; app wrappers do;
- the core never reads app tables;
- policy (blocks, crisis, push, AI) lives outside the core and calls into it.

Reasons:

- Almost every chat operation needs app data in the same transaction: profiles, blocks, restrictions, escalation, preferences, the push component.
- A component turns each of those into arguments or synced copies, and costs `v.id` typing.
- The schema is still being discovered, and component-table migrations and dashboard browsing aren't documented.

The founder's main goal, a tidy schema, mostly comes from the `chat_*` prefix plus a separate `schema/chat.ts` file spread into `defineSchema`. That pattern is ordinary TypeScript and should work with the current single `schema.ts` **[U]**; it hasn't been tried in this repo.

**What would change the lean toward a component:**

- the core tables settle (messages, members, reactions, read counters, typing);
- Convex documents migrations and dashboard browsing for component tables;
- or the team wants a hard boundary because many agents edit this backend at once.

At that point, extract only the generic store (messages, members, reactions, reads, typing) into `components/chat`, and keep Xolace's rules in the app. That split matches Convex's own advice against partly-overridden components [V].

## Scale: what Convex handles and what would be hard

"The scale is small" in the first version of this doc meant **the shape of Xolace's conversations**, not a Convex ceiling. Convex's documented limits, and how chat lands against them:

| Limit (documented) | Value | Chat impact |
|---|---|---|
| Per query/mutation: data read, documents scanned, index ranges | 16 MiB, 32,000 docs, 4,096 ranges [V] | A 50-message page plus reactions plus members is a few hundred documents. Inbox and badge queries read the caller's member rows only |
| Per mutation: data written, documents written | 16 MiB, 16,000 docs [V] | A send writes 3 documents (message, conversation, sender's member row) |
| User code time per query/mutation | 1 s [V] | Not an issue for indexed reads |
| Document size | 1 MiB [V] | Cap message length well below; attachments live in storage |
| Concurrent client sessions | Free/Starter 1,000; Professional 10,000; Business custom [V] | The real ceiling on simultaneously connected users. Each open app is one session, however many chats it watches |
| Concurrent query / mutation executions | Free/Starter 16; Professional 256 [V] | Executions in flight at one instant, not subscriptions. Short indexed functions finish quickly |
| Scheduled functions per mutation | 1,000 [V] | Bounds push fan-out from one send. The broadcast fan-out is already paginated (`broadcastXolaceChannelPush`, 500 per page) |
| Database I/O and egress (billing) | Professional includes 50 GB I/O, then $0.20/GB [V] | Every subscribed client re-runs its query when a message lands, so cost grows with watchers × page size. Small for DMs; for broadcast, keep the page small |
| Write conflicts (OCC) | No published per-document rate. "Several retries", and if calls arrive faster than they can run, some throw [V] | The real constraint for chat: **one document written by many people at once** |

**What Convex handles well:** many conversations at the same time.

- Each conversation's writes touch its own documents, so ten thousand DMs and circles don't contend with each other.
- Reactive subscriptions update each participant without polling.

**What would be hard:** one very busy room, with hundreds or thousands of people posting into the same conversation at the same moment.

- In this sketch every send patches the conversation row (`lastSeq`, `countedMessages`). With many writers, those mutations conflict and retry; past some rate they fail.
- Per-message reaction counts stored on the message document have the same problem when thousands react to one post.

**Is there a realistic Xolace feature like that?** Mostly no:

| Feature | Writers | Hot document? | Handling |
|---|---|---|---|
| Xolacer DM | 2 | No | — |
| Circle | ~5–12 | No; occasional OCC retry at most | — |
| Xolace channel posts | 1 sender | No | Broadcast kind; per-user read pointers, no member rows |
| Reactions on a Xolace channel post | Potentially thousands of people at once | **Yes, if counts are stored on the post** | Per-user reaction rows (no shared doc), with displayed counts from the Sharded Counter component that Convex's error docs recommend for this [V], or from the installed aggregate component |
| A live event room (not planned; e.g. a monthly event with an open chat) | Hundreds at once | **Yes, the conversation row** | A `live` kind: no per-conversation `lastSeq` or `countedMessages`; order by `_creationTime`; unread as a pointer + "new messages" marker rather than a count; a sharded counter if a count is shown; rate-limit per user; typing off |

So the design avoids the hard case by giving each shape its own kind rather than forcing one model onto all of them. If a large live room ever arrives, it is the one feature where a purpose-built service (Stream's livestream channel type [V]) deserves a fresh look.

Not verified:

- Whether Convex dedupes identical subscriptions across clients **[U]**.
- Any per-document write rate **[U]**.

## A Xolacer's AI stand-in (idea check, not planned)

**The idea.** A Xolacer configures their own agent. It answers in their conversations while they are away, and hands back to the human when something needs their attention or approval.

### Fit with the sketch

- **Author.** Add `{ type: "ai", persona, onBehalfOf: v.id("emotional_profiles") }` to the `author` union. `onBehalfOf` is the Xolacer's profile id. The message is attributed to the AI, never to the Xolacer, and it never counts toward the rating gate or `messageCount`.
- **Approval.** Reuse `held` with a reason: `visibility: "held"` and `heldFor: "owner_approval" | "classifier"`.
  - A draft the Xolacer must approve is shown only to the Xolacer, as a pending suggestion.
  - Approve flips it to `visible` (author stays `ai`, plus an `approvedBy` stamp); edit-and-send becomes the Xolacer's own message; discard deletes it.
  - The seeker sees nothing until then, beyond an optional "Your Xolacer will reply soon".
- **The Xolacer's controls**, stored in a `xolacer_agent_settings` table:
  - on/off, and the hours it may answer;
  - autonomy: drafts only, or may send low-risk replies;
  - allowed topics or intents (acknowledge, share availability, gentle check-in), and a list of things it must never say;
  - a short "in my voice" description;
  - how much context it may read: this conversation only, never the seeker's sessions or memory unless a separate decision says so.
- **Handover triggers.** These are decided server-side before the agent writes:
  - **crisis or elevated** from the existing classifier: the agent stops, posts nothing, and the existing crisis card and escalation path run. A crisis always goes to the support card and escalation, never to the stand-in.
  - the seeker asks for the human, or asks whether this is an AI;
  - any harassment, contact or spam verdict;
  - the agent's own low confidence (a structured-output field);
  - a topic outside the allowed list.

  On handover the Xolacer gets a notification (not outreach) and the agent goes quiet in that conversation until the Xolacer re-enables it.
- **`@convex-dev/agent` fit.**
  - Its threads "can be shared by multiple users and agents (including human agents)" [V].
  - Its human-agents guide covers saving a human's reply into the same thread and deciding who answers next, via a stored assignee, a cheap LLM triage, structured output, or an `askHuman` tool [V].
  - The fit is good for the agent's **working memory, tools and handoff loop**. The **canonical** timeline should stay in the chat tables, so moderation, unread, push and admin review are single-sourced. The agent's output lands through the chat core's internal send.
  - Not installed in this repo yet.

### Disclosure and consent

| Rule | What it says | Applies to a Xolacer's stand-in? |
|---|---|---|
| **EU AI Act Art. 50(1)** | Providers must ensure systems "intended to interact directly with natural persons" inform them "that they are interacting with an AI system", unless obvious. Art. 50(5): "clear and distinguishable manner … at the latest at the time of the first interaction". Applies from 2 Aug 2026 | Yes for EU users. It is not obvious in a thread where a human usually answers [S] (read on artificialintelligenceact.eu, a mirror of the official text; EUR-Lex didn't render) |
| **California SB 243** (Ch. 677, 2025) | "Companion chatbot" = AI giving "adaptive, human-like responses … capable of meeting a user's social needs … able to sustain a relationship across multiple interactions". The exclusions (customer service, video games, voice speakers) don't fit. If a reasonable person could be misled, a "clear and conspicuous notification" that it "is artificially generated and not human" is required. There must be a published protocol referring users who express suicidal ideation to crisis services. Known minors get a disclosure plus a reminder at least every 3 hours. Annual reports to the Office of Suicide Prevention start 1 July 2027. Private right of action, ≥ $1,000 per violation | **Likely**, if the stand-in sustains a supportive relationship. The crisis-referral protocol already exists in spirit (crisis card), but must be documented and published [V] (authenticated chaptered text) |
| **Utah HB 452** (effective 7 May 2025) | "Mental health chatbot" = generative AI holding conversations "similar to the confidential communications" with a licensed therapist, which a supplier represents or "a reasonable person would believe" can help manage mental health conditions. Disclosure "AI … and not a human" must come before access, again after 7 days without use, and whenever asked. Limits on ads and data use | **Plausibly** for Utah users: a support conversation is close to this definition [V] (enrolled copy) |
| **Illinois WOPR Act** (HB 1806, PA 104-0054, signed 1 Aug 2025) | Bars offering therapy "through the use of Internet-based artificial intelligence"; AI may not hold "therapeutic communication" with clients. Excludes peer support and self-help that don't claim to be therapy | Probably not, if Xolace never presents this as therapy, since peer support is excluded [S] (law-firm summary; ilga.gov unreachable this session) |
| **Apple 5.1.2(i)** | "Clearly disclose where personal data will be shared with third parties, including with third-party AI, and obtain explicit permission before doing so" | Yes: seeker messages would go to Anthropic to draft replies. This needs explicit permission from the **seeker**, not just the Xolacer [V] |
| **Apple 1.2** | UGC rules cover "AI content creation apps" | Filtering, report and block must cover AI messages too [V] |

What the product would need:

- a persistent "AI reply for <Xolacer>" label on every AI message;
- a disclosure at the first AI message and on request;
- a seeker-side switch: "Only my Xolacer, no AI replies";
- the Xolacer's opt-in;
- consent records (`consent_records` already exists; it would need a new consent type, an additive widening);
- a published crisis protocol.

**Legal review before building.** "Companion chatbot" and "mental health chatbot" are functional definitions, and Xolace's existing companion (Ember) may already fall under them. That question is outside this doc but worth asking alongside this one.

## Security model

- **Auth on every function.** Public queries and mutations call `requireAuth` and derive the profile; nothing takes a profile id from the client. Internal functions (`internal*`) serve the AI, the workflows and the push jobs.
- **Membership is the authorization unit.**
  - Every message, reaction, typing and read function loads the caller's `conversation_members` row by index.
  - `messages.page` returns nothing for non-members and applies `joinedAtSeq` and `visibility`.
  - Identity is the per-conversation `displayAlias` (camper tag) resolved server-side. The pseudonym rule lives in one query instead of an override per Stream component.
- **Validators on every `args` and `returns`.** Body length is capped server-side (the client cap is UX only). Cards and events are written only by internal functions.
- **Blocks are person-level and symmetric in effect.**
  - A block hides the blocked person's messages from the blocker in every shared conversation, and stops new DMs and circle co-placement.
  - Today's permanent DM block (`xolacerChat.blockConversation`: "There is no unblock") maps onto this.
- **Rate limits** use per-user and per-conversation buckets in the send, reaction, report and typing mutations, via the installed rate limiter [V]. Add a stricter bucket for brand-new accounts and new circle members.
- **Contact info and PII.**
  - Keep today's regex lane: phone shapes, @handles, off-platform app names (`lib/streamSetup.ts:46-60`). It runs in the mutation.
  - Policy per kind: DMs flag and continue (today's ruling); circles hold for review, since strangers in a group are the classic grooming and solicitation vector.
  - The classifier's `contact` category remains the semantic backstop.
- **Attachments:** signed, expiring URLs issued only after a membership check (R2), never long-lived public URLs [V].
- **Admin:** review and action functions live only in `convex/admin/*` with `adminQuery`/`adminMutation`. The admin role is checked in Convex.
- **Data handling.**
  - Message text now lives in Convex. Write down retention for each kind: for example, a DM is kept while the conversation exists, circles are purged N days after close, and report evidence is purged N days after resolution.
  - Account deletion deletes or anonymizes messages in one place (no `purgeStreamUser`).
  - Encryption at rest is the platform's. **No E2EE**, by design: it would make server-side crisis detection and moderator review impossible (Signal and Status findings above).

## Moderation pipeline

| Stage | Today (Stream + Convex) | In-house |
|---|---|---|
| Before write (sync) | Stream regex blocklists, action `flag` only; automod off so that "I feel like shit" reaches the listener [V] | Same regexes inside `send`; plus membership, block, restriction and rate-limit checks; per-kind policy (`visible` or `held`) |
| Hold-then-release (async, seconds) | Not possible: Stream's before-send hook defaults to 1.5 s per attempt (max 5 s) and **fails open** [S]; rejected in the old CONTEXT for that reason [V] | `held` message seen only by its author as "sending…"; a scheduled classifier action releases it or opens a report. On timeout or error, policy per kind (DM: release; circle: keep held, then human review) |
| After write | Haiku classifier per qualifying message → verdict row, crisis/support card, or Stream flag [V] | Same classifier (`ai/chat/classify.ts` unchanged); outcomes write `chat_reports` and can set `visibility: "hidden"` for spam and harassment above a confidence bar |
| Crisis | A Stream system message (`crisis_resources`) as a *reply*, not a block [V] | A card message from `system`, not counted, not pushed. Can also write an `escalation_events` row (the channel-source shape already exists in `escalation/events.ts`) and feed the follow-up machinery, if product wants a chat crisis to follow up the way a session crisis does |
| User flag / report | `product_feedback` row **plus** Stream queue (client calls Stream with its own token) [V] | One `chat_reports` row (linked to `product_feedback` for the concern tray). The evidence snapshot is stored because we own the text. No second system |
| Block | Freeze Stream channels plus close rows [V] | `profile_blocks` row; conversations freeze; timeline event "You blocked this person" (Signal-style info row) |
| Review | Stream dashboard only [V] | `apps/admin` "Chat reports" page: queue by status, evidence, context window of ±N messages, actions (hide message, mute, remove from circle, suspend chat, dismiss), audit fields |
| Model | Haiku 5.5 (`CHAT_MODERATION_VERSION`) [V] | Keep it. Optionally add OpenAI `omni-moderation-latest` (free; text and images; self-harm intent/instructions categories) [V] as a second opinion or for images |

**Store requirements this must meet** (a hard gate for in-house UGC):

| Requirement | Source | How the sketch meets it |
|---|---|---|
| "A method for filtering objectionable material from being posted" | Apple 1.2 [V] | Regex plus classifier; `held` for circles |
| "A mechanism to report offensive content and timely responses to concerns" | Apple 1.2 [V] | Flag/report → `chat_reports` → admin queue with a response SLA (an ops commitment, not code) |
| "The ability to block abusive users from the service" | Apple 1.2 [V] | `profile_blocks` plus moderator `chat_restrictions` (suspend) |
| "Published contact information" | Apple 1.2 [V] | Existing support contact; confirm it is linked from chat |
| Accept terms before creating UGC; in-app report **and** block; moderation "reasonable and consistent with the type of UGC" | Google Play UGC policy [V] | Primer / age gate already precede chat; add a terms acknowledgment to the chat entry if not already recorded |
| Anonymous or random chat apps: published CSAE standards, an in-app feedback mechanism, CSAM action, a named point of contact | Google Play Child Safety Standards [V] (applies to "Anonymous chat apps" and "Random chat apps") | **Applies whether or not we leave Stream**, if Play classifies pseudonymous circles of strangers as anonymous or random chat. Check the Play Console declaration |
| "Chatroulette-style experiences, random or anonymous chat … do not belong on the App Store" | Apple 1.2 [V] | Design constraint on **circles**: placement must be purposeful (theme, facilitator, rules), never random pairing of strangers. Xolacer DMs are with trained listeners and are requested, not random |

The last two rows constrain circles **regardless of vendor**. They belong in the circle product design, not the build-vs-buy decision.

## What Stream gives that we'd build

| Capability | Stream today | In-house effort | Notes |
|---|---|---|---|
| Message storage, ordering, edit/delete | SDK + API | **Low** | Tables plus four mutations; tombstones |
| Realtime delivery while the app is open | WebSocket | **None** | Convex subscriptions |
| Reactions (curated 7) | Yes | **Low** | Row per (message, user) |
| Quoted reply | Yes | **Low** | Snapshot on the reply (Signal) |
| Read state, unread, badge | `total_unread_count` + event fold | **Low-medium** | Simpler than today; one owner, same transaction |
| Typing / online | Channel events | **Low** | `typing` table; presence already ours |
| Push | Ours already (webhook-triggered) | **Low** | Triggered from `send`; no Stream unread call |
| Thread UI (list, composer, long-press menu, reaction sheet, swipe-to-reply, link previews) | `stream-chat-expo` components, heavily overridden | **High** (largest item) | Rebuild on FlashList/Reanimated; Xolace already owns the identity, crisis card, reaction sheet and typing views. Link previews need an unfurl action plus SSRF-safe fetching, or drop them |
| Offline read cache + durable outbox | `OfflineDB` (op-sqlite), queued actions survive kills [V] | **Medium** | See [Offline](#offline-the-biggest-thing-stream-gives-us); v1 queues sends only |
| Delivery while backgrounded | Push only (same as us) | **None** | Neither keeps a socket in background; push plus refetch on foreground |
| Attachments + CDN + resizing | Uploads, CDN $0.17/GB, resizing $5.80 per 1k [V] | **Medium** (when needed) | R2 component with signed URLs; scan before release |
| Moderation dashboard and queue | Included in all tiers [V] | **Medium** | Admin page plus `convex/admin/chat*` |
| AI moderation (Stream) | Enterprise add-on on chat pricing; also a $2 per 1k text pay-as-you-go product [V] | **Already ours** | We use our own classifier; Stream's AI moderation is unused |
| Scale to big rooms / livestream | Built-in types [V] | **Not needed now** | Broadcast kind covers the one wide channel; a `live` kind is sketched in [Scale](#scale-what-convex-handles-and-what-would-be-hard) |
| Live voice/video calls | Not part of Stream Chat; a separate product (Stream Video) [V] | **Buy, not build** | Any of Stream Video, LiveKit or Daily beside in-house chat; see below |
| HIPAA / SOC 2 | SOC 2 all tiers; HIPAA on Elevate+ [V] | Convex's own compliance posture **[U]** (not checked this session) | Check before relying on it in a DPA |

Stream cost context [V]:

| Plan | Price | Included | Overage |
|---|---|---|---|
| Build | Free | 1,000 MAU, 100 concurrent connections | Limits apply |
| Start | $399/mo annual ($499 monthly) | 10,000 MAU | $0.09 per MAU |
| Elevate | $599/mo annual | 10,000 MAU | $0.09 per MAU |

Stream also offers a Maker credit of $100/month for teams under 5 people and under $10k monthly revenue. **Price isn't the deciding factor at today's usage.** It becomes one with growth: every user is a member of the Xolace channel, so MAU-based pricing may count users who never open a DM **[U]** (how Stream counts MAU for broadcast-only members was not checked).

## Voice and video: what it means, and why it no longer decides this

The first version used "voice/video" for two different things.

**(a) Live voice and video calls**: a seeker and a Xolacer talking in real time, or a circle meeting by audio.

- This is **not part of Stream Chat**. Stream sells it as a separate product, Stream Video & Audio, with its own pricing page and SDK [V].
- Its React Native docs present a video SDK with its own server-signed user tokens ("Tokens need to be generated server-side") and Expo support via a development build [V]. Chat is an optional "Chat Integration" add-on page, not a prerequisite. Stream's guide recommends one API key when you use both, which implies but doesn't state video-only use [S]. I found no page saying it *requires* Stream Chat.
- **So calls can be bought on their own while chat is in-house.** Convex would mint the call token in an action, as it mints the Stream chat token today, and a call would appear in the thread as a `card` message ("Call started / ended").

Call options with primary pricing sources:

| Provider | Pricing (checked 2026-11-19) | Notes |
|---|---|---|
| Stream Video | $100/month free usage on every tier. Audio calls $0.30 per 1,000 participant-minutes. Video base rate per resolution is set through a calculator I couldn't read. Recording from $1.50 per 1,000 call-minutes. HIPAA: contact sales [V] | CallKit/Telecom ringing supported [V] |
| LiveKit Cloud | Build $0 (5,000 WebRTC participant-minutes, 1,000 agent session-minutes); Ship $50/mo (150k minutes, then $0.0005/min); Scale $500/mo. Open-source server can be self-hosted [V] | Also runs voice AI agents, which is relevant if a voice motivator ever joins a circle |
| Daily | 10,000 free participant-minutes per month. Video $0.004/participant-minute and audio-only $0.00099 at base volume. HIPAA + BAA add-on $500/month [V] | |

Xolace already runs real-time voice through ElevenLabs for Talk (`convex/talk/`), which is AI voice rather than person-to-person calls. Calls between people would be a new vendor in any of these options.

**(b) Photos and videos sent as messages.** This is the part chat itself has to do: upload, storage, CDN, thumbnails or resizing, and **image and video moderation** before anyone sees them.

- Stream bundles these: CDN $0.17/GB, resizing $5.80 per 1,000, image moderation $4–$10 per 1,000 [V].
- In-house it is the R2 component with signed expiring URLs, plus `omni-moderation-latest` for images (free, text and images) [V]. Video moderation would need another vendor, such as Stream's moderation product sold separately at $0.80 per video-minute [V]. Stream Moderation is listed as its own product.
- Text-only is a deliberate choice today (`channel-config.tsx:18-20`), so this is future work, not a migration gap.

**Net:** calls are bought from a calling vendor whichever way chat goes. Media in messages is buildable but needs a reviewed moderation and CSAM process first. Neither is a reason to keep Stream Chat.

## Options compared

| | Stay on Stream | Hybrid (Stream DMs, Convex circles) | Build on Convex |
|---|---|---|---|
| Time to circles | Medium: new channel type, an AI pseudo-user, custom fields, Convex mirror for lifecycle | Medium: circles from scratch, DMs untouched | Medium-high: core first, then circles on top |
| Ongoing complexity | Two systems, as today | **Highest**: two read states, two UIs, two moderation flows | **Lowest**: one model |
| Moderation strength | Flag-only pre-send; post-send via webhook; review in Stream | Split | Transactional checks; hold-then-release; one admin queue |
| Offline | **Best** (SDK) | Mixed | Must build; v1 weaker than Stream |
| Vendor/DPA surface | Stream processes all message content | Same | Convex + Anthropic only |
| Photos/videos in messages later | **Best** (CDN, resizing, image moderation) | Mixed | Build with R2 + a moderation API |
| Live calls later | Stream Video (separate product) | Same | Stream Video, LiveKit or Daily beside our chat |
| Very busy single rooms | **Best** (livestream type) | Same | Needs a dedicated `live` kind; not planned |
| Risk if chat stays tiny | Low effort, ongoing glue cost | Worst of both | Upfront cost; the founder accepts it |

## Cutover and the store-gap rule

- **Old binaries talk to Stream directly.** Once a new build ships, keep `getStreamToken`, the webhook and the Stream app alive until the minimum supported version has the in-house client. `clientVersion` is already passed on `requestConversation`/`resumeConversation` (`xolacerChat.ts` ~1820), which allows version-aware responses.
- **Xolacer DMs are dark** behind `XOLACER_CHAT_ENABLED` [V]. That makes them the easy part: no old binaries in production depend on them. Throwing their Stream data away needs no migration, as the founder suggested.
- **The Xolace channel is always on** [V], so old binaries render it from Stream. During the gap, either:
  - **dual-post:** an admin tool posts to both, or
  - keep the channel on Stream until old builds age out, then switch.

  This is the one place a short hybrid is unavoidable.
- **Switching Connect off during the rebuild** (the founder's preference) makes the gap simpler:
  - Xolacer DMs are already off server-side.
  - Old builds would still render the Xolace channel from Stream for as long as the Stream app exists.
  - Either keep the Stream app running (frozen, no new posts) until old builds age out, or accept that old builds show an empty or erroring Connect tab. Check what they actually show before deleting the Stream app. **[U]** I didn't check whether old builds have a server switch for the Xolace channel row.
- **Never delete functions or fields old builds call.** Deprecate them (`// DEPRECATED(remove-after: app >= x.y.z)`), as `escalation.ts` does today.
- **Surfaces:**
  - **Convex contract:** new `chat/*` functions, all additive.
  - **mobile:** the main work.
  - **web/desktop:** the same Convex API works in the static export because it is client-side.
  - **admin:** the review page.
  - **cli:** the TUI could read threads later.
  - **docs:** chat safety page and CSAE standards page.

## Risks and open questions

- **Thread UI quality.** Stream's list handles inverted scrolling, keyboard avoidance, long-press menus, and the accessibility of each. Rebuilding that to the current polish is the real schedule risk. Mitigation: build the thread screen first, behind a dev flag, against the new backend.
- **Offline expectations.** v1 queues sends only. Decide whether that is acceptable for a support product. A seeker on a train should at least see the last messages and be able to queue a reply.
- **Owning message text.** Xolace becomes the custodian of very sensitive peer conversations. Needed decisions:
  - Retention per kind.
  - Whether staff can read DMs outside a report. Recommendation: only report evidence and its context window, with audit.
  - Whether AI layers may ever read chat. Today, verdicts never touch Understanding or Memory [V]; keep that unless an ADR says otherwise.
- **Moderator capacity.** "Timely responses to concerns" (Apple 1.2) is an ops commitment. Circles with strangers will produce more reports than Xolacer DMs.
- **Circles and App Review.** Pseudonymous groups of strangers could be read as "random or anonymous chat" (Apple 1.2) and fall under Play's Child Safety Standards for anonymous or random chat apps [V]. Purposeful placement, facilitation, rules on entry and the existing age gate are the mitigations. Settle this in product design before building.
- **Convex scale and limits.** Fine for many DMs and circles at once [V]. A hot conversation document is a risk only for one room with very many simultaneous writers, which is not planned; [Scale](#scale-what-convex-handles-and-what-would-be-hard) has the `live`-kind answer.
- **AI stand-in law.** If the Xolacer stand-in is pursued, California SB 243 and Utah HB 452 plausibly apply (functional definitions) [V], and so does EU AI Act Art. 50 [S]. Get a legal read first, and include the existing companion in it.
- **Third-party chat components** (`convex-chat`, `convex-unread-tracking`) are alpha or unknown maturity [V]. Don't adopt them for the core.

Open questions for the founder:

1. Are circles going to exist within ~6 months? If not, the build case rests on moderation, ownership and the DPA, not on new features. That case is still positive but weaker.
2. Is "text-only, no link previews" acceptable for v1, or are previews a must?
3. ~~Will someone own chat end-to-end?~~ Answered 2026-11-19: yes, and Connect may be switched off during the rebuild.
4. Should a crisis in chat open a follow-up card like a session crisis does, or stay a reply-only card as today?
5. If calls come, are they 1:1 seeker–Xolacer, circle audio rooms, or both? This picks the vendor, not the chat architecture.
6. Is the Xolacer AI stand-in worth a legal review now, given it would likely make chat a regulated "companion" or "mental health chatbot" surface in some states?

## What would change the recommendation

Ownership is settled (2026-11-19), so "nobody can own it" is no longer a reason to stay. Stay on Stream Chat (or defer the build) only if:

- the roadmap adds **large live rooms**, with hundreds or thousands of people posting into one conversation at once. Stream's livestream type is built for that, and our design would need a dedicated `live` kind;
- **heavy media in messages** (photos and video at volume) becomes core before we have a reviewed moderation and CSAM process. Stream bundles CDN, resizing and image moderation;
- **offline-first chat** becomes a hard requirement before the outbox and cache are built.

**Not a reason to stay:** live voice/video calls. They are a separate product (Stream Video) that works beside in-house chat, as do LiveKit and Daily (see [Voice and video](#voice-and-video-what-it-means-and-why-it-no-longer-decides-this)).

Build sooner, or more decisively, if:

- the DPA review keeps blocking Xolacer chat because of the extra processor;
- circles or other AI-in-the-room features are confirmed;
- moderation needs hold-then-release or a single review queue, which Stream's fail-open pre-send hook and separate dashboard can't give us.

**Rough effort** [U] (engineering judgment, not measured):

| Part | Estimate |
|---|---|
| Backend core (tables, send, read, reactions, typing, push, moderation wiring, reports, admin functions) | ~1.5-2 weeks |
| Mobile thread and inbox rebuild plus offline cache and outbox | ~2.5-4 weeks |
| Admin review page | ~1 week |
| Cutover and Xolace-channel dual-post | ~0.5 week |
| Circles | On top of the above |

## Sources

Code in this repo (read this session):
- `packages/backend/convex/`:
  - `streamSetup.ts`, `lib/streamSetup.ts`, `streamWebhook.ts`
  - `xolacerChat.ts`, `chatNotifications.ts`, `lib/chatNotifications.ts`, `xolaceChannelNotifications.ts`
  - `ai/chat/moderate.ts`, `ai/chat/classify.ts`, `productFeedbackFlags.ts`
  - `presence.ts`, `escalation/events.ts`, `schema.ts`, `http.ts`, `convex.config.ts`, `jobs/accountDeletionFinalize.ts`
- `apps/mobile/src/lib/stream-chat/` (`offline-db.ts`, `connect-plan.ts`)
- `apps/mobile/src/features/connect/`:
  - `use-chat-warmup.ts`, `reactions.ts`
  - `thread/use-flag-message.ts`, `thread/use-counterpart-activity.ts`, `thread/messages/channel-config.tsx`
- Pre-monorepo history (`git show 35e0adb4^:...`):
  - `CONTEXT.md` sections "Chat moderation lanes", "One unread number; flag vs. report", "Conversation, channel, thread", "The Xolace channel"
  - `docs/adr/0013-the-xolace-channel-is-stream-not-convex-native.md`
- `node_modules/.bun/@convex-dev+r2@0.10.4+…/node_modules/@convex-dev/r2/README.md`

Sample apps (`/Users/nathan/Developer/XolaceInc/sample apps/`): files cited inline above.

Convex:
- [Limits](https://docs.convex.dev/production/state/limits)
- [Pagination](https://docs.convex.dev/database/pagination)
- [File storage](https://docs.convex.dev/file-storage) and [Upload files](https://docs.convex.dev/file-storage/upload-files)
- [OCC](https://docs.convex.dev/database/advanced/occ)
- [React client](https://docs.convex.dev/client/react) and [Optimistic updates](https://docs.convex.dev/client/react/optimistic-updates)
- [Agents](https://docs.convex.dev/agents)
- Components: [Presence](https://www.convex.dev/components/presence), [Rate limiter](https://www.convex.dev/components/rate-limiter), [Aggregate](https://www.convex.dev/components/aggregate) ([README](https://github.com/get-convex/aggregate)), [convex-chat](https://www.convex.dev/components/convex-chat), [convex-unread-tracking](https://www.convex.dev/components/convex-unread-tracking)
- Offline (community answers, [S]): [discord-questions.convex.dev](https://discord-questions.convex.dev/m/1139602956728156270)

Stream:
- [Chat pricing](https://getstream.io/chat/pricing/)
- [Moderation pricing](https://getstream.io/moderation/pricing/)
- [RN offline support](https://getstream.io/chat/docs/sdk/react-native/basics/offline-support/)
- [Channel types](https://getstream.io/chat/docs/javascript/channel_features/)
- [Before Message Send webhook](https://getstream.io/chat/docs/node/before-message-send-webhook/) ([S], from a search excerpt of this page)

Safety and policy:
- [Apple App Review Guidelines 1.2](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play UGC policy](https://support.google.com/googleplay/android-developer/answer/9876937)
- [Google Play Child Safety Standards](https://support.google.com/googleplay/android-developer/answer/14747720)
- [OpenAI moderation guide](https://developers.openai.com/api/docs/guides/moderation)

Follow-up sources (2026-11-19, second pass):
- Convex:
  - [Components](https://docs.convex.dev/components), [Authoring components](https://docs.convex.dev/components/authoring), [Understanding components](https://docs.convex.dev/components/understanding)
  - [Errors (write conflicts)](https://docs.convex.dev/error), [Pricing](https://www.convex.dev/pricing), [Dashboard data page](https://docs.convex.dev/dashboard/deployments/data)
  - [Migrations README](https://github.com/get-convex/migrations), [Agent: human agents](https://docs.convex.dev/agents/human-agents)
  - `@convex-dev/action-cache@0.3.1` `src/component/crons.ts` (installed package source)
- Calls:
  - [Stream Video pricing](https://getstream.io/video/pricing/), [Stream Video RN docs](https://getstream.io/video/docs/react-native/), [Stream Video API (users and tokens)](https://getstream.io/video/docs/api/)
  - [Stream Video chat integration](https://getstream.io/video/docs/react-native/advanced/chat-with-video/) ([S], search excerpt)
  - [LiveKit pricing](https://livekit.com/pricing), [Daily Video SDK pricing](https://www.daily.co/pricing/video-sdk/)
- AI disclosure law:
  - EU AI Act Art. 50 via [artificialintelligenceact.eu](https://artificialintelligenceact.eu/article/50/) ([S]: a mirror of the official text; EUR-Lex didn't render)
  - California SB 243, Ch. 677 (2025): authenticated chaptered PDF, as hosted by [Sidley](https://www.sidley.com/en/-/media/resource-pages/ai-monitor/laws-and-regulations/cal-sb243-companion-chatbots.pdf) (leginfo blocked automated fetches)
  - Utah HB 452 (2025): enrolled copy, as hosted by [Sidley](https://www.sidley.com/-/media/uploads/20250325-utah-hb-452-ai-applications-relating-to-mental-health-enacted.pdf) (le.utah.gov unreachable)
  - Illinois HB 1806 / PA 104-0054: [HeplerBroom summary](https://heplerbroom.com/blog/illinois-passes-legislation-on-using-ai-in-delivering-mental-health-services/) ([S]; ilga.gov unreachable)
  - [Apple App Review Guidelines 5.1.2(i), 1.2, 4.7](https://developer.apple.com/app-store/review/guidelines/)

On-device store (2026-11-19, third pass):
- WatermelonDB:
  - [Repo](https://github.com/Nozbe/WatermelonDB): releases, commits, issues #1769, #1892, #1963, #1969 and #1990 (via the GitHub API), `CHANGELOG.md`, `CHANGELOG-Unreleased.md`, `src/sync/impl/helpers.js`, `src/adapters/lokijs`
  - [Sync backend](https://watermelondb.dev/docs/Sync/Backend), [Sync frontend](https://watermelondb.dev/docs/Sync/Frontend), [Installation](https://watermelondb.dev/docs/Installation)
- Sample apps:
  - `mattermost-mobile-main/app/actions/websocket/posts.ts`, `mattermost-mobile-main/patches/@nozbe+watermelondb+0.28.1-0.patch`
  - `Rocket.Chat.ReactNative-develop/app/lib/methods/subscriptions/room.ts`
  - both apps' `package.json` and `android/gradle.properties`
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- Convex offline:
  - [Convex sync page](https://www.convex.dev/sync), [convex/curvilinear](https://github.com/convex/curvilinear) (archived)
  - [Object Sync Engine post](https://stack.convex.dev/object-sync-engine) ([S], not opened; seen in search)
- [PowerSync: Convex backend support (experimental)](https://releases.powersync.com/announcements/announcing-convex-backend-support-experimental)
- [Zero: connecting to Postgres](https://zero.rocicorp.dev/docs/connecting-to-postgres)
- TinyBase and Legend-State Convex support ([S], from a search summary): [TinyBase persisters](https://tinybase.org/api/persisters/), [Legend-State sync](https://legendapp.com/open-source/state/v3/sync/crud/)
- Repo: `apps/mobile/package.json`, `apps/mobile/src/lib/storage/unified-storage.ts`, `apps/mobile/src/lib/stream-chat/chat-local-data-guard.tsx`
