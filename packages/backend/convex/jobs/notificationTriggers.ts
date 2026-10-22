import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

const GENTLE_RETURN_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours
// 30-day dormancy suppression, shared with kindling_ready (docs/paths-v1.md §10).
export const INACTIVE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Returns the local hour (0–23) for a given IANA timezone using Intl.
 * Available in the Convex V8 runtime.
 */
function getLocalHour(timezone: string): number {
  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(new Date());
    return parseInt(formatted, 10) % 24;
  } catch {
    return new Date().getUTCHours();
  }
}

/**
 * Returns true if the current local hour is inside the user's quiet window
 * (i.e., outside active delivery hours).
 */
export function isInQuietWindow(
  timezone: string,
  dontReachBefore: number,
  dontReachAfter: number
): boolean {
  const localHour = getLocalHour(timezone);
  return localHour < dontReachBefore || localHour > dontReachAfter;
}

/**
 * Scan profiles and send gentle_return notifications to users
 * who haven't had a session in 48+ hours but are still active
 * (last session within 30 days).
 *
 * Runs on a cron schedule. Processes in batches to stay within
 * transaction limits.
 */
export const checkGentleReturn = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const gentleReturnCutoff = now - GENTLE_RETURN_WINDOW_MS;
    const inactiveCutoff = now - INACTIVE_THRESHOLD_MS;

    const { page: profiles, isDone, continueCursor } = await ctx.db
      .query("emotional_profiles")
      .paginate({ numItems: 500, cursor: args.cursor ?? null });

    for (const profile of profiles) {
      if (!profile.lastSessionAt) continue;
      if (profile.lastSessionAt > gentleReturnCutoff) continue;
      if (profile.lastSessionAt < inactiveCutoff) continue;

      const preferences = await ctx.db
        .query("preferences")
        .withIndex("by_profile", (q) =>
          q.eq("emotionalProfileId", profile._id)
        )
        .unique();

      if (!preferences) continue;
      if (!preferences.notifications.enabled) continue;
      if (!preferences.notifications.gentleReturn) continue;

      // Quiet Window gate
      const { quietWindow, timezone } = preferences.notifications;
      if (quietWindow && timezone) {
        if (isInQuietWindow(timezone, quietWindow.dontReachBefore, quietWindow.dontReachAfter)) {
          continue;
        }
      }

      const hoursSince = Math.round((now - profile.lastSessionAt) / (60 * 60 * 1000));

      await ctx.scheduler.runAfter(
        0,
        internal.ai.generateNotification.generate,
        {
          emotionalProfileId: profile._id,
          notificationType: "gentle_return",
          triggerReason: `No session in ${hoursSince}h`,
          scheduledFor: now,
        }
      );
    }

    if (!isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.jobs.notificationTriggers.checkGentleReturn,
        { cursor: continueCursor }
      );
    }
  },
});

/**
 * Send pattern_nudge notifications to users at their typical usage time.
 * Matches profiles whose typicalUsagePattern aligns with the current
 * day/hour (UTC).
 *
 * Runs hourly on a cron schedule.
 */
export const checkPatternNudge = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const currentDate = new Date(now);
    const currentDay = currentDate.getUTCDay(); // 0-6
    const currentHour = currentDate.getUTCHours(); // 0-23

    const { page: profiles, isDone, continueCursor } = await ctx.db
      .query("emotional_profiles")
      .paginate({ numItems: 500, cursor: args.cursor ?? null });

    for (const profile of profiles) {
      if (!profile.typicalUsagePattern) continue;
      if (profile.typicalUsagePattern.dayOfWeek !== currentDay) continue;
      if (profile.typicalUsagePattern.hourOfDay !== currentHour) continue;

      if (
        profile.lastSessionAt &&
        now - profile.lastSessionAt < 12 * 60 * 60 * 1000
      ) {
        continue;
      }

      const preferences = await ctx.db
        .query("preferences")
        .withIndex("by_profile", (q) =>
          q.eq("emotionalProfileId", profile._id)
        )
        .unique();

      if (!preferences) continue;
      if (!preferences.notifications.enabled) continue;
      if (!preferences.notifications.patternNudge) continue;

      // Quiet Window gate
      const { quietWindow, timezone } = preferences.notifications;
      if (quietWindow && timezone) {
        if (isInQuietWindow(timezone, quietWindow.dontReachBefore, quietWindow.dontReachAfter)) {
          continue;
        }
      }

      await ctx.scheduler.runAfter(
        0,
        internal.ai.generateNotification.generate,
        {
          emotionalProfileId: profile._id,
          notificationType: "pattern_nudge",
          triggerReason: `Pattern match: day=${currentDay} hour=${currentHour}`,
          scheduledFor: now,
        }
      );
    }

    if (!isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.jobs.notificationTriggers.checkPatternNudge,
        { cursor: continueCursor }
      );
    }
  },
});
