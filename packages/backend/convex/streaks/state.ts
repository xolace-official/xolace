import { v } from "convex/values";
import { Doc } from "../_generated/dataModel";
import { mutation, MutationCtx, QueryCtx } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { updateNotificationPrefs } from "../lib/notificationPrefs";
import { ACTION_WEIGHTS, localDayKey, shiftDayKey } from "./activityLog";

/** Freezes on hand never exceed this. Xolace+ may raise it later (#427). */
export const FREEZE_CAP = 2;
/** One freeze is earned per this many consecutive qualifying days. */
export const FREEZE_EARN_EVERY = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Freezes after acting on `dayKey` extends the streak to `streak`: +1 per
 * FREEZE_EARN_EVERY consecutive *qualifying* days, capped. Strict: a frozen day
 * restarts the count, so a bridged week doesn't earn. currentStreak counts
 * qualifying days only, so the run since the last frozen day is the smaller of
 * the streak and the days elapsed since it (a frozen day from an older, lapsed
 * streak is further back than the streak itself). A revived day (#435) restarts
 * it too — a revive bridges a gap just as a freeze does.
 */
export async function earnFreeze(
  ctx: QueryCtx,
  profile: Doc<"emotional_profiles">,
  dayKey: string,
  streak: number,
  freezes: number,
): Promise<number> {
  const lastFrozen = [
    (
      await ctx.db
        .query("frozen_days")
        .withIndex("by_emotionalProfileId_and_dayKey", (q) => q.eq("emotionalProfileId", profile._id))
        .order("desc")
        .first()
    )?.dayKey,
    profile.streakRevivedDay,
  ]
    .filter((day) => day !== undefined)
    .sort()
    .pop();
  const run =
    lastFrozen === undefined ? streak : Math.min(streak, (Date.parse(dayKey) - Date.parse(lastFrozen)) / DAY_MS);
  return run > 0 && run % FREEZE_EARN_EVERY === 0 ? Math.min(freezes + 1, FREEZE_CAP) : freezes;
}

export type StreakState = {
  /** Streak to show: the stored count, or 0 once the gap outruns the freezes. */
  streak: number;
  /** Freezes left after bridging `bridge`. */
  freezes: number;
  /** Last qualifying or frozen local day — the day the gap check runs from. */
  lastCoveredDay: string | undefined;
  /** Missed days a freeze covers on settle, oldest first. */
  bridge: string[];
  timezone: string;
  /**
   * A break a streak saver can undo right now (#435): the count a revive
   * restores and the missed day it covers. Only once freeze couldn't — freeze
   * is first-in-line because `streak` resolves before this is ever set.
   */
  revive?: { streak: number; gapDay: string };
};

/** The user's stored IANA timezone — the one clock every local day key uses. */
export async function profileTimezone(ctx: QueryCtx, profile: Doc<"emotional_profiles">): Promise<string> {
  const preferences = await ctx.db
    .query("preferences")
    .withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
    .unique();
  return preferences?.notifications.timezone ?? "UTC";
}

/** Streak savers on hand never exceed this. Xolace+ may raise it later (#428). */
export const SAVER_CAP = 1;

/**
 * The one freeze-aware read of streak state (#434). Every streak consumer —
 * display queries, recordActivity, future notification crons — goes through
 * this, so no surface can disagree with another about whether a streak is lit.
 *
 * Expiry runs off the last qualifying activity_log dayKey (or frozen day), not
 * lastSessionAt: that keeps meaning "last completed reflect" (#426), and a
 * vent/library/twig day extends the streak without moving it.
 *
 * Read-only. `settleStreak` persists the bridge; until then every read derives
 * the same answer, so the two can't drift.
 */
export async function streakState(
  ctx: QueryCtx,
  profile: Doc<"emotional_profiles">,
  now: number = Date.now(),
): Promise<StreakState> {
  const timezone = await profileTimezone(ctx, profile);
  const today = localDayKey(now, timezone);
  const freezes = profile.streakFreezes ?? 0;

  // At most 6 log rows per day, so 20 always reaches back past the days a
  // capped freeze budget can bridge.
  const recentLogs = await ctx.db
    .query("activity_log")
    .withIndex("by_emotionalProfileId_and_dayKey_and_actionType", (q) => q.eq("emotionalProfileId", profile._id))
    .order("desc")
    .take(20);
  // No qualifying row yet: a profile the cutover hasn't reached, whose only
  // qualifying action was reflect — lastSessionAt's day is what it would seed.
  const lastQualifying =
    recentLogs.find((log) => ACTION_WEIGHTS[log.actionType] > 0)?.dayKey ??
    (profile.lastSessionAt === undefined ? undefined : localDayKey(profile.lastSessionAt, timezone));
  const lastFrozen = (
    await ctx.db
      .query("frozen_days")
      .withIndex("by_emotionalProfileId_and_dayKey", (q) => q.eq("emotionalProfileId", profile._id))
      .order("desc")
      .first()
  )?.dayKey;
  // A revived day counts as covered for the gap check only — it has no row.
  const lastCoveredDay = [lastQualifying, lastFrozen, profile.streakRevivedDay]
    .filter((day) => day !== undefined)
    .sort()
    .pop();

  // Revive window (#428): through the day after the missed day, in local
  // day keys — the missed day plus one more.
  const savers = profile.streakSavers ?? 0;
  const reviveOffer = (streak: number, coveredDay: string) =>
    savers > 0 && today === shiftDayKey(coveredDay, 2) && profile.streakRevivedDay !== shiftDayKey(coveredDay, 1)
      ? { streak, gapDay: shiftDayKey(coveredDay, 1) }
      : undefined;

  // A freeze bridges from an existing streak; it never starts one.
  if (lastCoveredDay === undefined || profile.currentStreak === 0) {
    return { streak: 0, freezes, lastCoveredDay, bridge: [], timezone };
  }

  // Negative when the timezone moved west past the last covered day: still lit.
  const missed = (Date.parse(today) - Date.parse(lastCoveredDay)) / DAY_MS - 1;
  if (missed > freezes) {
    const revive = reviveOffer(profile.currentStreak, lastCoveredDay);
    return { streak: 0, freezes, lastCoveredDay, bridge: [], timezone, ...(revive && { revive }) };
  }

  const bridge: string[] = [];
  for (let i = 1; i <= missed; i++) bridge.push(shiftDayKey(lastCoveredDay, i));
  // The break's first action already reset the count: the run it cut is
  // still revivable today, continuing into today's restarted streak.
  const broken = profile.brokenStreak;
  const revive = broken && reviveOffer(broken.streak + profile.currentStreak, broken.lastCoveredDay);
  return {
    streak: profile.currentStreak,
    freezes: freezes - bridge.length,
    lastCoveredDay,
    bridge,
    timezone,
    ...(revive && { revive }),
  };
}

/**
 * streakState, then persist its bridge: one frozen_days row per covered day,
 * one freeze spent per row. Idempotent — once bridged, the gap is gone.
 * Returns the state as it stands after settling.
 */
export async function settleStreak(
  ctx: MutationCtx,
  profile: Doc<"emotional_profiles">,
  now: number = Date.now(),
): Promise<StreakState> {
  const state = await streakState(ctx, profile, now);
  if (state.bridge.length === 0) return state;

  for (const dayKey of state.bridge) {
    await ctx.db.insert("frozen_days", { emotionalProfileId: profile._id, dayKey, createdAt: now });
  }
  await ctx.db.patch("emotional_profiles", profile._id, { streakFreezes: state.freezes, updatedAt: now });
  return { ...state, lastCoveredDay: state.bridge[state.bridge.length - 1], bridge: [] };
}

/**
 * Frozen days the app hasn't acknowledged yet (#436), newest first — whether a
 * settle or recordActivity wrote them. One settle bridges at most FREEZE_CAP
 * days; 10 comfortably spans the opens between acknowledgments.
 */
async function unseenFrozenDays(ctx: QueryCtx, profile: Doc<"emotional_profiles">) {
  return await ctx.db
    .query("frozen_days")
    .withIndex("by_emotionalProfileId_and_dayKey", (q) =>
      q.eq("emotionalProfileId", profile._id).gt("dayKey", profile.freezeAckedDay ?? ""),
    )
    .order("desc")
    .take(10);
}

/** App open: settle, then count the frozen days still to acknowledge in-app. */
export async function settleOnOpen(
  ctx: MutationCtx,
  profile: Doc<"emotional_profiles">,
  now: number = Date.now(),
): Promise<number> {
  await settleStreak(ctx, profile, now);
  return (await unseenFrozenDays(ctx, profile)).length;
}

/** App open: the read-time recompute that makes a bridged gap durable. */
export const settle = mutation({
  // The device's IANA timezone. Only the notification flows used to store one,
  // so everyone else's streak days ran on UTC and could break across local
  // midnight. Optional: pre-fix clients omit it.
  args: { timezone: v.optional(v.string()) },
  // Frozen days to acknowledge in-app (#436); pre-#436 clients ignore it.
  // Reading doesn't mark them seen — only acknowledgeFreezes does, once the
  // banner has actually shown, so an old client or a killed app loses nothing.
  returns: v.number(),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    // Before settling, so this open's gap check already runs on local days.
    if (args.timezone && isValidTimezone(args.timezone) && args.timezone !== (await profileTimezone(ctx, profile))) {
      await updateNotificationPrefs(ctx, profile._id, { timezone: args.timezone });
    }
    return await settleOnOpen(ctx, profile);
  },
});

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** The freeze banner was shown: mark every frozen day so far as seen (#436). */
export async function acknowledgeFrozenDays(ctx: MutationCtx, profile: Doc<"emotional_profiles">) {
  const [latest] = await unseenFrozenDays(ctx, profile);
  if (latest) await ctx.db.patch("emotional_profiles", profile._id, { freezeAckedDay: latest.dayKey });
}

export const acknowledgeFreezes = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    await acknowledgeFrozenDays(ctx, profile);
    return null;
  },
});
