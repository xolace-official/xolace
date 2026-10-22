import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import { getStreamUnreadCount } from "./integrations/stream";
import {
  chatNotificationContent,
  chatNotificationsAllowed,
} from "./lib/chatNotifications";
import { chatNotificationSound } from "./lib/notificationSounds";
import { sendPushToProfile } from "./lib/pushNotifications";

/**
 * The transactional dispatch path for conversation notifications, beside the
 * AI-nudge scheduler in `notifications.ts` rather than inside it.
 *
 * Deliberately does not apply:
 * - the **Quiet Window** — a person waiting on you is not a 9am-appropriate touch,
 * - the **nudge rate bucket** — a busy chat day must not silence the AI's own reaching out,
 * - a **`notification_log` row** — that table is the nudge analytics surface, and
 *   four transactional types in its union would distort every read of it.
 *
 * It does honour the notification master switch and the chat preference.
 *
 * Because no log row exists, the payload carries `conversationId` instead of a
 * log id; the client's tap handler branches on the type rather than marking a
 * row.
 *
 * Scheduled with `runAfter(0)` from the lifecycle mutations rather than called
 * inline: a push that fails must not roll back the request that earned it.
 */
export const send = internalMutation({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    type: v.union(
      v.literal("chat_request"),
      v.literal("chat_accepted"),
      v.literal("chat_declined"),
      v.literal("chat_expired"),
      v.literal("chat_message"),
      v.literal("xolace_message"),
    ),
    // The recipient's counterpart, named by the caller exactly as the recipient
    // already sees them elsewhere — this path never resolves an identity of its
    // own. Absent for a decline, which names nobody, and for `xolace_message`,
    // which has no counterpart at all.
    counterpartName: v.optional(v.string()),
    // Absent for `xolace_message`: the Xolace channel has no
    // `xolacer_conversations` row, so its push carries no thread to reopen.
    conversationId: v.optional(v.id("xolacer_conversations")),
    // Stream's unread total for the recipient, set only by `sendMessagePush`.
    // The lifecycle types never badge: the icon number means "messages" and
    // only that, and it must equal what the Connect tab shows.
    badge: v.optional(v.number()),
    // No alert, sound, or list entry — only `badge`. Sent inside the 2-minute
    // window when a second message arrives and nothing buzzes: the icon must
    // still move to Stream's total or it would disagree with the Connect tab
    // until the next launch. A push with no title/body is not displayed on
    // either platform. Only ever true with `badge` set.
    silent: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) =>
        q.eq("emotionalProfileId", args.emotionalProfileId),
      )
      .unique();

    if (!chatNotificationsAllowed(preferences?.notifications)) return null;

    const { title, body } = chatNotificationContent(
      args.type,
      args.counterpartName,
    );

    // iOS reads the sound off the payload; Android ignores it and takes the
    // sound from the channel. Sending both is what makes one call cover the two
    // platforms.
    const { sound, channelId } = chatNotificationSound(args.type);

    const data = { type: args.type, conversationId: args.conversationId };
    // Shared with the nudge path so a multi-device fix can never land on one
    // of the two dispatch sites and not the other.
    await sendPushToProfile(ctx, {
      emotionalProfileId: args.emotionalProfileId,
      notification: args.silent
        ? // The component's wire validator has title/body optional; only its
          // TS type insists. Cast rather than send an empty title, which
          // Android would display as an empty notification.
          ({ badge: args.badge, data } as unknown as { title: string; data: typeof data })
        : { title, body, sound, channelId, badge: args.badge, data },
    });

    return null;
  },
});

/**
 * The `chat_message` dispatch, one hop ahead of `send`: asks Stream for the
 * recipient's unread total so the push can set the icon badge to it. An action
 * because that is a fetch, which `notifyNewMessage` (a mutation) cannot make.
 *
 * The count is best-effort. Stream down means a push with no badge — the
 * client's mirror (`useUnreadBadge`) corrects the icon on the next handshake —
 * never a message that doesn't arrive.
 */
export const sendMessagePush = internalAction({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    counterpartName: v.string(),
    conversationId: v.id("xolacer_conversations"),
    // Badge-only: the recipient is inside the suppression window.
    silent: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let badge: number | undefined;
    try {
      // The Stream user id is the profile id — see `upsertStreamUsers`.
      badge = await getStreamUnreadCount(args.emotionalProfileId);
    } catch (error) {
      console.warn("[chat] unread count unavailable, sending without badge", error);
    }
    // A silent push exists only to carry the badge; without one it is nothing.
    if (args.silent && badge === undefined) return null;
    // Same-file call: annotated per the Convex guideline on circular inference.
    const sent: null = await ctx.runMutation(internal.chatNotifications.send, {
      emotionalProfileId: args.emotionalProfileId,
      type: "chat_message",
      counterpartName: args.counterpartName,
      conversationId: args.conversationId,
      badge,
      silent: args.silent,
    });
    return sent;
  },
});
