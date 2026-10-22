import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import { getStreamUnreadCount } from "./integrations/stream";

/**
 * The `xolace_message` push dispatch (#378), one recipient at a time — same
 * shape as `chatNotifications.sendMessagePush`, minus the counterpart name
 * and conversation id, neither of which the broadcast channel has.
 * `broadcastXolaceChannelPush` schedules one of these per member. Split out
 * of `chatNotifications.ts` to keep that file under CLAUDE.md's 200-line cap.
 *
 * ponytail: one Stream unread-count request per member per broadcast message
 * — O(membership), not O(message volume). Batch through Stream's bulk query
 * API if the member count ever makes that a real cost.
 */
export const sendXolaceChannelPush = internalAction({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    silent: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let badge: number | undefined;
    try {
      badge = await getStreamUnreadCount(args.emotionalProfileId);
    } catch (error) {
      console.warn("[chat] unread count unavailable, sending without badge", error);
    }
    if (args.silent && badge === undefined) return null;
    const sent: null = await ctx.runMutation(internal.chatNotifications.send, {
      emotionalProfileId: args.emotionalProfileId,
      type: "xolace_message",
      badge,
      silent: args.silent,
    });
    return sent;
  },
});

/**
 * Fan `sendXolaceChannelPush` out to every profile but the sender's own,
 * paginated the same way `jobs/notificationTriggers.ts` walks the whole
 * profile table — one event reaches the entire membership, so this has to
 * cover it all rather than one recipient.
 */
export const broadcastXolaceChannelPush = internalMutation({
  args: {
    excludeProfileId: v.id("emotional_profiles"),
    silent: v.optional(v.boolean()),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { page, isDone, continueCursor } = await ctx.db
      .query("emotional_profiles")
      .paginate({ numItems: 500, cursor: args.cursor ?? null });

    for (const profile of page) {
      if (profile._id === args.excludeProfileId) continue;
      await ctx.scheduler.runAfter(0, internal.xolaceChannelNotifications.sendXolaceChannelPush, {
        emotionalProfileId: profile._id,
        silent: args.silent,
      });
    }

    if (!isDone) {
      await ctx.scheduler.runAfter(0, internal.xolaceChannelNotifications.broadcastXolaceChannelPush, {
        excludeProfileId: args.excludeProfileId,
        silent: args.silent,
        cursor: continueCursor,
      });
    }
    return null;
  },
});
