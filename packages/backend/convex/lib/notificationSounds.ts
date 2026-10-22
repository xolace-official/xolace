/**
 * Which sound every notification carries, and the Android channel it rides on.
 *
 * One module because these facts must not drift: the server names a sound in
 * the payload, the client creates the channel that actually holds it on
 * Android, and a mismatch between the two is silent — the notification still
 * arrives, just with the wrong sound or the stock one.
 *
 * Pure constants only, so the React Native bundle can import this without
 * pulling in a Convex function module.
 */

import type { ChatNotificationType } from "./chatNotifications";

// ============================================================
// Sounds
// ============================================================

/**
 * Three sounds, so the weight of an event is audible before the phone is out of
 * a pocket. All are warm and quiet rather than alarm-like — being reached out
 * to is not an emergency.
 *
 * Bundled into the binary by the `expo-notifications` config plugin, which is
 * the only way a custom sound reaches either platform. Each filename keeps its
 * extension because that is what both sides want: iOS names the bundled file
 * exactly, and Android's `SoundResolver` strips to the basename to find
 * `res/raw/<name>`. One string serves both.
 *
 * Basenames become Android resource names, so they must stay lowercase and
 * carry no dot beyond the extension — `nudge.tight.wav` would fail the build.
 */
export const REACH_SOUND = "reach.wav";
export const MESSAGE_SOUND = "message.wav";
export const NUDGE_SOUND = "nudge.wav";

// ============================================================
// Android channels
// ============================================================

/**
 * On Android a sound is a property of the *channel*, not the payload, and it is
 * **immutable once the channel exists on a device**. Re-running channel
 * creation with a different sound changes nothing for anyone who already has
 * the app. Replacing a sound means a new id, which also discards whatever
 * volume, importance, or vibration tuning the user had applied to the old one.
 * Treat each id and its sound as one frozen pair.
 *
 * Split three ways so the OS-level controls are actually useful: someone can
 * silence chatter without silencing a person asking to talk, and can tune the
 * AI's reaching out separately from either.
 */
export const REACH_CHANNEL_ID = "chat_reach";
export const MESSAGE_CHANNEL_ID = "chat_message";

/**
 * The nudges deliberately do **not** reuse the pre-existing `default` channel.
 * That channel was created without a sound on every device already running the
 * app, and its sound can never be changed — pointing nudges at it would give
 * the new sound to fresh installs only. A new id is the only way existing users
 * ever hear it.
 */
export const NUDGE_CHANNEL_ID = "nudge";

/**
 * The original channel, kept exactly as it was. Nothing targets it any more,
 * but it stays created: it is the landing spot for any notification that
 * arrives without a channel of its own, and deleting a channel is a one-way
 * door Android remembers.
 */
export const DEFAULT_CHANNEL_ID = "default";

export type AndroidChannel = {
  id: string;
  /** Shown to the user in Android system settings. */
  name: string;
  sound: string;
};

/**
 * Every channel that carries one of our sounds, so the client creates exactly
 * the set the server sends to. A channel the server names but the client never
 * created falls back to the stock sound without erroring.
 */
export const SOUND_CHANNELS: AndroidChannel[] = [
  { id: REACH_CHANNEL_ID, name: "Requests and accepts", sound: REACH_SOUND },
  { id: MESSAGE_CHANNEL_ID, name: "Messages", sound: MESSAGE_SOUND },
  { id: NUDGE_CHANNEL_ID, name: "Reflections", sound: NUDGE_SOUND },
];

export type NotificationSound = {
  sound: string;
  channelId: string;
};

/**
 * What the AI's own reaching out sounds like — gentle returns, pattern nudges,
 * milestones. One sound for all of them: they are the same kind of event.
 */
export const NUDGE_NOTIFICATION_SOUND: NotificationSound = {
  sound: NUDGE_SOUND,
  channelId: NUDGE_CHANNEL_ID,
};

/**
 * Which sound a conversation event gets.
 *
 * Request and accepted are the reach-out events — someone is waiting on you —
 * and take the weightier sound. Message, declined, and expired take the
 * lighter one.
 *
 * Declined and expired ride the lighter sound deliberately: they are the
 * quietest of the events, and a conversation that didn't open should not
 * announce itself.
 */
export function chatNotificationSound(
  type: ChatNotificationType,
): NotificationSound {
  switch (type) {
    case "chat_request":
    case "chat_accepted":
      return { sound: REACH_SOUND, channelId: REACH_CHANNEL_ID };
    case "chat_message":
    case "chat_declined":
    case "chat_expired":
    case "xolace_message":
      return { sound: MESSAGE_SOUND, channelId: MESSAGE_CHANNEL_ID };
  }
}
