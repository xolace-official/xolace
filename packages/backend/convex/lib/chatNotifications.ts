/**
 * Every decision a conversation notification makes that isn't I/O: whether the
 * user's preferences allow one, and what the notification says and opens.
 *
 * Conversation notifications are transactional, not nudges. They skip the
 * Quiet Window, the nudge rate bucket, and `notification_log` — a person
 * waiting on you is not a 9am-appropriate marketing touch — so the only
 * suppression left is the master switch and the chat preference, both here.
 */

/**
 * Notification types, as they travel in the push `data` payload. Prefixed so
 * the client's tap handler can tell them apart from the AI-nudge types, which
 * share that field.
 */
export type ChatNotificationType =
  | "chat_request"
  | "chat_accepted"
  | "chat_declined"
  | "chat_expired"
  | "chat_message"
  | "xolace_message";

const TYPES: ChatNotificationType[] = [
  "chat_request",
  "chat_accepted",
  "chat_declined",
  "chat_expired",
  "chat_message",
  "xolace_message",
];

/** Narrows the `type` field off a push payload, which arrives untyped. */
export function isChatNotificationType(
  value: unknown,
): value is ChatNotificationType {
  return TYPES.includes(value as ChatNotificationType);
}

export type ChatNotificationContent = {
  title: string;
  body: string;
};

/**
 * The chats list already says this for a pending request. Both surfaces read
 * it from here so a reword cannot leave the notification describing the same
 * event in different words.
 */
export const CHAT_REQUEST_SUBTITLE = "Wants to talk, accept when you have space";

/**
 * Where tapping lands.
 *
 * An accept lands in the thread itself, so the seeker can start writing
 * without hunting for the row. The others land on the Connect tab, and each
 * names its segment rather than relying on its auto-select: that tab stays
 * mounted for the life of the app and remembers the last segment the user
 * touched, so a xolacer browsing the roster would otherwise never see the
 * request they just tapped, and a seeker would be dropped back on the
 * conversation that just closed.
 *
 * `tappedAt` is what makes a repeat arrival land: identical params look like
 * no navigation at all to a screen that is already mounted.
 */
export function chatNotificationRoute(
  type: ChatNotificationType,
  conversationId: string,
  tappedAt: number,
) {
  switch (type) {
    case "chat_request":
      return {
        pathname: "/connect",
        params: { view: "chats", t: String(tappedAt) },
      } as const;
    case "chat_accepted":
    case "chat_message":
      return {
        pathname: "/chat/[conversationId]",
        params: { conversationId },
      } as const;
    case "chat_declined":
    case "chat_expired":
      return {
        pathname: "/connect",
        params: { view: "xolacers", t: String(tappedAt) },
      } as const;
    // The Xolace channel (#378) isn't a `xolacer_conversations` row, so it has
    // no thread route keyed by id — it opens the one screen for it instead.
    case "xolace_message":
      return { pathname: "/xolace-channel", params: {} } as const;
  }
}

/**
 * Title and body for one event.
 *
 * The pseudonym goes in the **title**, not the body: Expo's push API exposes no
 * collapse key, Android tag, or iOS thread-id, so the title is the only field
 * that keeps two simultaneous requests apart on a lock screen. Nothing anyone
 * wrote ever reaches either field.
 *
 * The request body is the exact wording the chats list already shows for this
 * event, so the notification reads as the same event rather than a second one.
 *
 * Declined and expired are the exceptions to pseudonym-as-title: naming the
 * person who turned you down — or who never answered — in bold on a lock
 * screen is where that rule works against the user. Both bodies end on an
 * option rather than on the refusal. Expiry especially: nobody refused
 * anything, so its wording blames neither side and points at the roster.
 */
export function chatNotificationContent(
  type: ChatNotificationType,
  counterpartName: string = "Xolace",
): ChatNotificationContent {
  switch (type) {
    case "chat_request":
      return { title: counterpartName, body: CHAT_REQUEST_SUBTITLE };
    case "chat_accepted":
      return {
        title: counterpartName,
        body: "Has space for you, your conversation is open",
      };
    case "chat_declined":
      return {
        title: "Xolace",
        body: "That conversation didn't open. Other xolacers are available.",
      };
    case "chat_expired":
      return {
        title: "Xolace",
        body: "That request timed out without an answer. Other xolacers are here.",
      };
    case "chat_message":
      return { title: counterpartName, body: "Sent you a message" };
    // Always "Xolace" — there is no counterpart to name for the broadcast
    // channel, so the `counterpartName` parameter is unused here.
    case "xolace_message":
      return { title: "Xolace", body: "Posted a new message" };
  }
}

// ============================================================
// Message notifications (Stream `message.new` webhook)
// ============================================================

/**
 * The Stream channel id for a conversation — deterministic per row, which is
 * what makes an accept retry idempotent, and what lets the webhook find its
 * way back to our row without a second Stream call.
 */
const CHANNEL_ID_PREFIX = "xolacer_";

export function xolacerChannelId(conversationId: string): string {
  return `${CHANNEL_ID_PREFIX}${conversationId}`;
}

/**
 * The inverse, applied to whatever the webhook claims the channel is. Returns
 * the raw id string only — the caller still has to check it names a real row,
 * because a forged payload can put any text after the prefix.
 */
export function conversationIdFromChannelId(
  channelId: unknown,
): string | null {
  if (typeof channelId !== "string") return null;
  if (!channelId.startsWith(CHANNEL_ID_PREFIX)) return null;
  const id = channelId.slice(CHANNEL_ID_PREFIX.length);
  return id.length > 0 ? id : null;
}

/**
 * Who gets told about a message, derived from **our** conversation row rather
 * than from the webhook's member list.
 *
 * Two things fall out of that for free: the sender can never be the recipient,
 * and a payload naming a sender who is not on this row addresses nobody at all
 * — so a forged event cannot push a notification at an arbitrary profile.
 */
export function messageNotificationRecipient<T extends string>(
  conversation: { userProfileId: T; xolacerProfileId: T },
  senderId: unknown,
): T | null {
  if (senderId === conversation.userProfileId) {
    return conversation.xolacerProfileId;
  }
  if (senderId === conversation.xolacerProfileId) {
    return conversation.userProfileId;
  }
  return null;
}

/**
 * One notification per person per two minutes. Someone typing four thoughts in
 * a row is one arrival, not four buzzes.
 *
 * Dropped rather than batched: there is nothing to batch, since the body never
 * carries content. Scoped per recipient per conversation, so neither a chatty
 * thread nor the person you are already talking to can hide someone else's
 * first message — see `messageNotifiedField` for why the recipient half of that
 * matters as much as the conversation half.
 */
export const MESSAGE_NOTIFICATION_WINDOW_MS = 2 * 60 * 1000;

export function messageNotificationSuppressed(
  lastNotifiedAt: number | undefined,
  now: number,
): boolean {
  if (lastNotifiedAt === undefined) return false;
  return now - lastNotifiedAt < MESSAGE_NOTIFICATION_WINDOW_MS;
}

/**
 * Which of a conversation's two stamps belongs to the person being notified.
 *
 * The window has to be keyed on the recipient, not on the row: one shared
 * stamp means a seeker's own message opens a window that then swallows the
 * xolacer's reply arriving inside it — message-then-reply, the ordinary shape
 * of a chat, going silent. Two participants, so two fields rather than a map.
 */
export function messageNotifiedField<T extends string>(
  conversation: { userProfileId: T },
  recipientProfileId: T,
): "lastNotifiedUserAt" | "lastNotifiedXolacerAt" {
  return recipientProfileId === conversation.userProfileId
    ? "lastNotifiedUserAt"
    : "lastNotifiedXolacerAt";
}

/**
 * May we send this person a conversation notification?
 *
 * `chat` is absent on every row written before it existed, and absent means
 * enabled — the feature has to work for users who never see a new toggle.
 * A missing preferences row is nobody who ever turned notifications on.
 */
export function chatNotificationsAllowed(
  notifications: { enabled: boolean; chat?: boolean } | null | undefined,
): boolean {
  if (!notifications) return false;
  return notifications.enabled && notifications.chat !== false;
}
