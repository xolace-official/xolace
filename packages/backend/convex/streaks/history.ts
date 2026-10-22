import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { activityActionTypeValidator } from "../lib/validators";
import { ACTION_WEIGHTS, localDayKey, type ActivityActionType } from "./activityLog";
import { profileTimezone } from "./state";

// ponytail: one read of the whole log. ≤6 rows/day, so this covers years of
// daily use; past it the *oldest* days drop off. Page by year once a real
// history nears it. daysShowedUp is counted from this read, so it caps too —
// a lifetime counter on emotional_profiles is the upgrade.
const MAX_LOG_ROWS = 8000;
const MAX_FROZEN_ROWS = 2000;

/**
 * The contribution graph's data (#438): every logged local day with its
 * action kinds, action-type-agnostic. `breadth` counts distinct full-credit
 * kinds — repeats and zero-weight actions (quotes) never shade a day, but stay
 * in `actions` for the breakdown readout.
 */
export const get = query({
  args: {},
  returns: v.object({
    joinDay: v.string(),
    /**
     * The stored IANA timezone. The client derives today from it: a query's
     * result is cached, so a server-side "today" would go stale at midnight.
     */
    timezone: v.string(),
    days: v.array(
      v.object({
        dayKey: v.string(),
        breadth: v.number(),
        actions: v.array(v.object({ type: activityActionTypeValidator, count: v.number() })),
      }),
    ),
    frozenDays: v.array(v.string()),
    /** Days with a full-credit action — lifetime, never goes down. */
    daysShowedUp: v.number(),
  }),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    const timezone = await profileTimezone(ctx, profile);

    let logs = (
      await ctx.db
        .query("activity_log")
        .withIndex("by_emotionalProfileId_and_dayKey_and_actionType", (q) => q.eq("emotionalProfileId", profile._id))
        .order("desc")
        .take(MAX_LOG_ROWS)
    ).reverse();
    // A full page may have cut the oldest day mid-way — drop it rather than
    // report it with partial breadth.
    if (logs.length === MAX_LOG_ROWS) logs = logs.filter((log) => log.dayKey !== logs[0].dayKey);
    const frozen = await ctx.db
      .query("frozen_days")
      .withIndex("by_emotionalProfileId_and_dayKey", (q) => q.eq("emotionalProfileId", profile._id))
      .order("desc")
      .take(MAX_FROZEN_ROWS);

    // The index sorts by dayKey, so each day's rows arrive together.
    const days: { dayKey: string; breadth: number; actions: { type: ActivityActionType; count: number }[] }[] = [];
    for (const log of logs) {
      let day = days[days.length - 1];
      if (day?.dayKey !== log.dayKey) days.push((day = { dayKey: log.dayKey, breadth: 0, actions: [] }));
      day.actions.push({ type: log.actionType, count: log.count });
      if (ACTION_WEIGHTS[log.actionType] > 0) day.breadth++;
    }

    // Join is day one — or earlier, if log history predates the profile row.
    const joinDay = localDayKey(profile.createdAt, timezone);
    return {
      joinDay: days[0] && days[0].dayKey < joinDay ? days[0].dayKey : joinDay,
      timezone,
      days,
      frozenDays: frozen.map((f) => f.dayKey),
      daysShowedUp: days.filter((d) => d.breadth > 0).length,
    };
  },
});
