import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";
import { isStreakMilestone, streakMilestoneAllowed, streakMilestoneCopy } from "./milestones";
import { earnFreeze, SAVER_CAP, settleStreak } from "./state";

export type ActivityActionType = Doc<"activity_log">["actionType"];

// Weight is derived here, at read time, not stored on the row — re-weighting
// an action type later needs no backfill. `quotes` is logged but zero-weight:
// it never extends a streak on its own (decision log, #423).
export const ACTION_WEIGHTS: Record<ActivityActionType, number> = {
  reflect: 1,
  vent: 1,
  library: 1,
  sit_with_this: 1,
  daily_mood: 1,
  quotes: 0,
};

/**
 * Local calendar day ("YYYY-MM-DD") for a timestamp in an IANA timezone.
 * Falls back to UTC if the timezone string is invalid (e.g. stale client data).
 */
export function localDayKey(timestampMs: number, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(timestampMs));
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(timestampMs));
  }
}

/**
 * Single write path for streak-affecting events. Upserts the (profile, local
 * day, action type) log row, then keeps the deprecated currentStreak /
 * longestStreak mirror on emotional_profiles in sync — old app binaries still
 * read those directly (Deferred Deprecations, CLAUDE.md) — and bumps
 * lastSessionAt on reflect only.
 *
 * Called directly by every qualifying action's mutation (same transaction,
 * no nested ctx.runMutation).
 */
export async function recordActivity(
  ctx: MutationCtx,
  args: {
    emotionalProfileId: Id<"emotional_profiles">;
    actionType: ActivityActionType;
    timestamp?: number;
  },
): Promise<void> {
  const profile = await ctx.db.get("emotional_profiles", args.emotionalProfileId);
  if (!profile) return;

  const now = args.timestamp ?? Date.now();
  // Bridge any gap a freeze covers first, so an action the day after a frozen
  // day reads that day as yesterday. The last covered dayKey comes off its own
  // persisted row — never recomputed from lastSessionAt under whatever
  // timezone is active now.
  const state = await settleStreak(ctx, profile, now);
  const dayKey = localDayKey(now, state.timezone);
  const previousDayKey = state.lastCoveredDay;

  const existing = await ctx.db
    .query("activity_log")
    .withIndex("by_emotionalProfileId_and_dayKey_and_actionType", (q) =>
      q
        .eq("emotionalProfileId", args.emotionalProfileId)
        .eq("dayKey", dayKey)
        .eq("actionType", args.actionType),
    )
    .unique();

  if (existing) {
    await ctx.db.patch("activity_log", existing._id, {
      count: existing.count + 1,
      updatedAt: now,
    });
  } else {
    await ctx.db.insert("activity_log", {
      emotionalProfileId: args.emotionalProfileId,
      dayKey,
      actionType: args.actionType,
      count: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Zero-weight actions (quotes) log history but never touch the streak.
  if (ACTION_WEIGHTS[args.actionType] === 0) return;

  // expectedPrevious gap check on day keys (#426): yesterday → +1, today →
  // unchanged, otherwise reset. A dayKey *behind* the last one (timezone moved
  // west, or a backdated timestamp) counts as "today" — past days stand and
  // are never double-counted. Floor at 1: this day now has a qualifying row.
  let newStreak: number;
  let freezes = state.freezes;
  let savers = profile.streakSavers ?? 0;
  let brokenStreak: Doc<"emotional_profiles">["brokenStreak"];
  if (previousDayKey === undefined) {
    newStreak = 1;
  } else if (dayKey <= previousDayKey) {
    newStreak = Math.max(profile.currentStreak, 1);
  } else if (previousDayKey === shiftDayKey(dayKey, -1)) {
    newStreak = profile.currentStreak + 1;
    freezes = await earnFreeze(ctx, profile, dayKey, newStreak, freezes);
    if (isStreakMilestone(newStreak)) {
      savers = Math.min(savers + 1, SAVER_CAP);
      await notifyStreakMilestone(ctx, args.emotionalProfileId, newStreak, now);
    }
  } else {
    newStreak = 1;
    // Keep the run this reset cuts, so a revive later today can restore it.
    if (profile.currentStreak > 0) brokenStreak = { streak: profile.currentStreak, lastCoveredDay: previousDayKey };
  }

  const newLongestStreak = Math.max(newStreak, profile.longestStreak ?? profile.currentStreak);

  await ctx.db.patch("emotional_profiles", args.emotionalProfileId, {
    currentStreak: newStreak,
    longestStreak: newLongestStreak,
    streakFreezes: freezes,
    ...(savers !== (profile.streakSavers ?? 0) && { streakSavers: savers }),
    ...(brokenStreak && { brokenStreak }),
    // lastSessionAt keeps meaning "last completed reflect" (#426) — nudges,
    // Return Welcome and plus-offers read it. Never moves backward.
    ...(args.actionType === "reflect" && {
      lastSessionAt: Math.max(now, profile.lastSessionAt ?? 0),
    }),
    updatedAt: now,
  });
}

/**
 * Streak milestone push (#439). Only reached on the day the streak first
 * steps onto a milestone, so a second action that day can't re-fire it.
 * Freezes and revives never push — milestones are the only interruption.
 */
async function notifyStreakMilestone(
  ctx: MutationCtx,
  emotionalProfileId: Id<"emotional_profiles">,
  streak: number,
  now: number,
): Promise<void> {
  const preferences = await ctx.db
    .query("preferences")
    .withIndex("by_profile", (q) => q.eq("emotionalProfileId", emotionalProfileId))
    .unique();
  if (!streakMilestoneAllowed(preferences?.notifications)) return;
  await ctx.scheduler.runAfter(0, internal.notifications.schedule, {
    emotionalProfileId,
    type: "streak_milestone",
    content: streakMilestoneCopy(streak),
    triggerReason: `Streak reached ${streak}`,
    scheduledFor: now,
  });
}

/** The instant a local day begins. Two passes land right across a DST change. */
export function dayStartMs(dayKey: string, timezone: string): number {
  const naive = Date.parse(`${dayKey}T00:00:00Z`);
  let guess = naive;
  for (let i = 0; i < 2; i++) guess = naive - (wallClockMs(guess, timezone) - guess);
  return guess;
}

/** The zone's wall clock at `timestampMs`, read as if it were UTC. */
function wallClockMs(timestampMs: number, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestampMs));
  // "YYYY-MM-DD, HH:MM:SS"
  return Date.parse(parts.replace(", ", "T") + "Z");
}

/** "YYYY-MM-DD" shifted by whole calendar days (DST-free: pure date math). */
export function shiftDayKey(dayKey: string, days: number): string {
  const date = new Date(`${dayKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
