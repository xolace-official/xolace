# Telegram Bot API facts a check-in bot depends on

Researched 2026-11-09 against **Bot API 10.4** (released 2026-11-09). Answers #725 for the
outreach map #723. Re-check the version and the limits before relying on them.

**Tags.** **[P]** verified on a primary source: the official docs at core.telegram.org, or
the source of Telegram's own Bot API server (`tdlib/telegram-bot-api`, `master` at
`7232881b`). **[S]** secondary: widely reported behaviour, not stated by Telegram.
**[U]** unverified: no source found; test it before designing around it.

## What shapes the decisions

1. **Message previews are the user's setting, not ours.** The bot can't hide a message's
   text on the lock screen. Telegram puts the message body in the push ("`{1}: {2}`")
   unless the *user* has turned previews off. So **check-in copy must be safe to read on a
   lock screen**: say nothing about why they're being checked on.
2. **We can only delete our messages for 48 hours.** For account deletion or a retracted
   outreach, older messages stay in the user's Telegram. Say so in the deletion and
   consent copy. Unlinking can't promise to wipe the chat history.
3. **A block arrives as a `my_chat_member` update** (status `kicked`), and sends fail with
   `403 Forbidden: bot was blocked by the user`. Handle both: the update unlinks quickly,
   and the 403 catches anything the update missed. A deleted account gives
   `403 Forbidden: user is deactivated`.
4. **One webhook URL per bot**, and it excludes `getUpdates`. So one bot (token) per Convex
   deployment (dev/staging/preview/prod). Authenticate with `secret_token`.
5. **Delivery is at-least-once, in order within a chat.** Telegram retries any non-2xx for
   up to ~24 hours. Each chat's updates wait behind the one that failed. Deduplicate on
   `update_id`, and **always return 2xx** once the update is stored, even when our own
   handling fails, or that chat stalls.
6. **The `/start` token: up to 64 characters of `A-Z a-z 0-9 _ -`.** A user who already
   started the bot still gets `/start <token>` when they open a new link.
7. **Answer every button tap** (`answerCallbackQuery`) quickly, then edit the message in
   place to show the answer. `callback_data` is at most 64 bytes, so put an id in it,
   never the content.
8. **Rate limits: ~1 message/s per chat, ~30 messages/s across the bot**, then `429` with
   `retry_after`. Our check-in volume is well under this. The outbox still has to honour
   `retry_after`.

## Facts by topic

### `/start` deep link

- Link form: `https://t.me/<bot_username>?start=<parameter>`. The bot receives the message
  `/start <parameter>` in the private chat. [P] [bots/features#deep-linking]
- Parameter: `A-Z, a-z, 0-9, _ and -` only, **up to 64 characters**. Telegram recommends
  base64url for binary values. [P] [bots/features#deep-linking]. The client spec says the
  same: "up to 64 base64url characters". [P] [api/links#bot-links]
  - So a 32-byte random token in base64url (43 characters, no padding) fits.
- **Already started:** the client spec says the input bar is replaced by a Start button
  "even if the user has already started the bot". Pressing it calls `messages.startBot`
  with the parameter. So the bot receives `/start <parameter>` again. [P] [api/links#bot-links]
  - Corollary: re-opening a link is a normal event. The token must be single-use and
    expiring on our side, and a repeat `/start <used-token>` from the same chat should just
    get a friendly "already linked".
- A bare `/start`, with no parameter, comes from a user who found the bot without a link.
  The bot can't tell who they are. [P] (follows from the above)
- `chat.id` and `user.id` have up to 52 significant bits. Store them as int64/float64 or a
  string. Never int32. [P] [bots/api#user, #chat]

### Inline keyboards and button taps

- `callback_data`: **1-64 bytes**. [P] [bots/api#inlinekeyboardbutton]
- A tap arrives as a `callback_query` update with `id`, `from`, `message` (a
  `MaybeInaccessibleMessage`) and `data`. [P] [bots/api#callbackquery]
- "Telegram clients will display a progress bar until you call answerCallbackQuery". So
  always answer, even with no text. `text` is 0-200 characters, shown as a toast or, with
  `show_alert`, as an alert. [P] [bots/api#callbackquery, #answercallbackquery]
  - The client gets a `BOT_RESPONSE_TIMEOUT` if the bot doesn't answer in time. [P]
    [api/bots/buttons]
  - **The exact answer deadline is not documented.** [U] Answering late fails with
    `400 Bad Request: query is too old and response timeout expired or query ID is invalid`.
    [P] (error string, Bot API server `Client.cpp`). Community reports say "about 10-15
    seconds". [S]
  - The Bot API server drops an undelivered `callback_query` update **150 s** after the
    tap. Messages and other updates last 24 h. [P] (`Client.cpp`, `add_update(...CallbackQuery..., 150, ...)`)
- **Editing after a tap:** `editMessageText` (text + markup) and `editMessageReplyMarkup`
  (buttons only). [P] [bots/api#editmessagetext, #editmessagereplymarkup]
  - The only documented age limit is for *business* messages (48 h). **The bot's own
    messages have no documented edit window.** [P]. That you can edit months-old messages
    is [S].
  - Editing to the same content fails with `400 Bad Request: message is not modified`.
    Treat it as success. [P] (`Client.cpp`)
- **Taps on old messages** still arrive while the message exists. If the bot can no longer
  see the message, `message` comes as an `InaccessibleMessage` (`chat`, `message_id`,
  `date = 0`). [P] [bots/api#inaccessiblemessage]. So the server must check that the
  follow-up is still open, ignore taps on cards that already resolved or expired, and edit
  the buttons away.
- `data` isn't guaranteed to match a button on that message ("the message originated the
  query can contain no callback buttons with this data"). Validate it server-side as
  untrusted input. [P] [bots/api#callbackquery]

### Detecting blocked users and deleted chats

- `my_chat_member` (`ChatMemberUpdated`): "For private chats, this update is received
  **only when the bot is blocked or unblocked by the user**." [P] [bots/api#update]
  - Blocked: `new_chat_member.status = "kicked"` (`ChatMemberBanned`). Unblocked:
    `"member"`. [P] [bots/api#chatmemberbanned]. That a private-chat block shows up as
    `kicked` is [S], but standard.
  - `my_chat_member` is delivered by default. The default `allowed_updates` omits only
    `chat_member`, `message_reaction` and `message_reaction_count`. Set `allowed_updates`
    explicitly: `["message","callback_query","my_chat_member"]`. [P] [bots/api#setwebhook]
- Errors on send (Bot API server mapping, [P] `Client.cpp`):
  - MTProto `USER_IS_BLOCKED` → `403`, `"Forbidden: bot was blocked by the user"`.
  - `INPUT_USER_DEACTIVATED` → `403`, `"Forbidden: user is deactivated"` (account deleted).
  - `400 Bad Request: chat not found` for an unknown or never-started chat.
  - `403 Forbidden: bot can't initiate conversation with a user` (the user never pressed
    Start). [S] (the string comes from Telegram's servers, not this source)
  - The docs say `error_code` contents "are subject to change". Branch on `403` + the
    description prefix, and treat any `403` to a private chat as "unreachable, unlink". [P]
    [bots/api#making-requests]
- **Deleting the chat without blocking:** no update is documented for it. [P] (by the
  "only when blocked or unblocked" wording). Our sends then probably still succeed (they
  re-create the chat), so we'd never know. [U] Clients' "Delete chat" usually offers
  "delete and block bot", which does produce the update. [S]

### Rate limits and `retry_after`

- Per chat: "avoid sending more than one message per second. We may allow short bursts
  … but eventually you'll begin receiving 429 errors." [P] [bots/faq#broadcasting-to-users]
- Across the bot: about **30 messages/s** for bulk notifications. Paid broadcasts raise it
  to 1000/s at 0.1 Stars per message (`allow_paid_broadcast`). [P] [bots/api#paid-broadcasts, bots/faq]
  - Two prerequisites, and the docs disagree on them: the API page says 10,000 Stars on
    balance; the FAQ says 100,000 Stars and 100,000 MAU. Irrelevant at our volume. [P]
- On flood: HTTP `429`, description `"Too Many Requests: retry after N"`, and
  `parameters.retry_after = N` seconds. [P] [bots/api#responseparameters] + `Client.cpp`
- Groups: 20 messages per minute. Not relevant to a private-chat bot. [P] [bots/faq]

### Privacy: notifications and lock screens

- The push Telegram sends for a private message uses `MESSAGE_TEXT` with the template
  `{1}: {2}` (author: **message body**). With previews off it's `MESSAGE_NOTEXT`, "`{1}`
  sent you a message". [P] [api/push-updates]
- Previews are the **user's** setting: `show_previews` on their notify settings ("If the
  text of the message shall be displayed in notification"), global or per chat. The Bot
  API has no parameter to set or force it. [P] [constructor/inputPeerNotifySettings,
  bots/api#sendmessage]
- The OS can also hide notification content on a locked device, but that's the OS, not
  Telegram. [S]
- `disable_notification`: "Sends the message silently. Users will receive a notification
  with no sound." It still notifies, preview included. **It doesn't hide anything.** [P]
  [bots/api#sendmessage]
- `protect_content`: "Protects the contents of the sent message from forwarding and
  saving". It doesn't affect notifications or screenshots of the notification. [P]
  (definition). That it blocks screenshots inside the app on some clients is [S].
- **Spoiler formatting** (`||text||`, `<tg-spoiler>`) hides text in the chat. Whether
  clients hide it in the push preview: [U]. Don't rely on it.
- So: write the push-visible first line as a neutral opener ("Hey, checking in from
  Xolace"), with nothing sensitive anywhere in the text. The bot's display name and avatar
  also show in every notification. [S]

### Webhooks

- `setWebhook(url, secret_token?, max_connections?, allowed_updates?, drop_pending_updates?, ip_address?, certificate?)`.
  Telegram POSTs each `Update` as JSON over HTTPS. [P] [bots/api#setwebhook]
- **One URL per bot.** Setting a new one replaces the old one. While a webhook is set,
  `getUpdates` doesn't work ("two mutually exclusive ways"). [P] [bots/api#getting-updates,
  #setwebhook]. So two deployments can't share a bot: **one bot per Convex deployment**.
- Ports: 443, 80, 88, 8443. No redirects. The certificate CN must match the host. A
  `*.convex.site` URL on 443 is fine. [P] [bots/api#setwebhook, bots/faq]
- `secret_token`: 1-256 characters `A-Z a-z 0-9 _ -`. Sent in every request as the header
  `X-Telegram-Bot-Api-Secret-Token`. Compare it in constant time and reject a mismatch.
  [P] [bots/api#setwebhook]. The FAQ's older advice, a secret path in the URL, still
  works. [P] [bots/faq]
- `max_connections`: 1-100, default **40**. [P]
- **Retries:** a non-2xx response is retried, giving up "after a reasonable amount of
  attempts". [P] [bots/api#setwebhook]. The source shows the details [P] (`WebhookActor.cpp`):
  - The backoff doubles from 1 s, capped at a random 60-120 s. A `Retry-After` from us is
    honoured, up to 3600 s.
  - An update is dropped once it's older than its expiry: 24 h for messages and
    `my_chat_member`, 150 s for `callback_query` ("they will not be kept longer than 24
    hours" [P] [bots/api#getting-updates]).
  - If we return HTTP **410** for 23 h, Telegram removes the webhook.
  - The connection idle timeout is 60 s. Respond fast. [P] (constructor args), but the
    exact semantics are [U].
- **Ordering:** updates are queued per chat (per user for callback queries). The server
  sends a queue's next update only after the current one gets a 2xx or expires, so a
  failing update **blocks its chat's queue**. Different chats run in parallel, up to
  `max_connections`. [P] (`WebhookActor::send_update` / `drop_event`, `Client.cpp`
  `webhook_queue_id`)
  - Callback queries and messages sit in different queues. A tap can arrive before an
    earlier text message from the same user. [P] (different queue ids)
- **Duplicates:** `update_id` increases sequentially. Telegram says it lets you "ignore
  repeated updates or … restore the correct update sequence, should they get out of
  order". [P] [bots/api#update]. Store processed `update_id`s and skip repeats.
  - After a week with no updates, the next `update_id` is random, not sequential. Dedupe
    on equality, not on "greater than the last one". [P] [bots/api#update]
- **Answer in the response:** a webhook response can carry one Bot API call
  (`{"method":"sendMessage",...}`), but "it's not possible to know that such a request
  was successful". Don't use it for anything we need to confirm. [P] [bots/api#making-requests-when-getting-updates]
- `getWebhookInfo` shows `pending_update_count`, `last_error_date` and
  `last_error_message`. Use it for health checks. [P] [bots/api#getwebhookinfo]

### Deleting messages we sent

- `deleteMessage`: "A message can only be deleted if it was sent **less than 48 hours
  ago**." Bots can delete their outgoing messages, and incoming ones, in private chats.
  [P] [bots/api#deletemessage]
- `deleteMessages`: 1-100 ids per call. Missing ids are skipped. Same 48 h limit. [P]
  [bots/api#deletemessages]
- Past 48 h: `400 Bad Request: message can't be deleted` (`MESSAGE_DELETE_FORBIDDEN`).
  [P] (`Client.cpp`)
- So, to delete within the window, we have to **store `chat_id` + `message_id` for every
  message we send**. Past 48 h the only option is editing a message to blank its text and
  buttons. Editing has no documented time limit for the bot's own messages [P], and
  works [S].
- When the user blocks the bot or deletes their Telegram account, deletes fail and the
  messages stay on the user's side. [U]

### Limits we'll hit in copy

- Message text: 1-4096 characters after entity parsing (send and edit). [P] [bots/api#sendmessage]
- `answerCallbackQuery.text`: 0-200 characters. [P]

## Sources

- Bot API reference, version 10.4: https://core.telegram.org/bots/api
- Bot features, deep linking: https://core.telegram.org/bots/features#deep-linking
- Bot FAQ (limits, webhooks): https://core.telegram.org/bots/faq
- Client link spec (`t.me/<bot>?start=`): https://core.telegram.org/api/links#bot-links
- Bot buttons (MTProto side, `BOT_RESPONSE_TIMEOUT`): https://core.telegram.org/api/bots/buttons
- Push notification payloads (`MESSAGE_TEXT` / `MESSAGE_NOTEXT`): https://core.telegram.org/api/push-updates
- `show_previews`: https://core.telegram.org/constructor/inputPeerNotifySettings
- Bot API server source, commit `7232881b`:
  https://github.com/tdlib/telegram-bot-api/blob/master/telegram-bot-api/Client.cpp (error
  mapping, update expiry, queue ids) and
  https://github.com/tdlib/telegram-bot-api/blob/master/telegram-bot-api/WebhookActor.cpp
  (retry/backoff, 410 drop, per-queue ordering)
- MTProto error codes (not the Bot API's): https://core.telegram.org/api/errors. The Bot API
  rewrites these into the `Bad Request:` / `Forbidden:` strings above.
