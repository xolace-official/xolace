/**
 * The weekly talk-time ledger under time.ts: the credits component, the
 * Monday top-up, and giving a reservation back. See time.ts for the model.
 */
import { Credits } from "@clipin/convex-credits";
import { components } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { dayStartMs, localDayKey, shiftDayKey } from "../streaks/activityLog";
import { profileTimezone } from "../streaks/state";

export const credits = new Credits(components.credits);

export const WEEKLY_S = 15 * 60;

/** The local Monday ("YYYY-MM-DD") of the week `now` falls in. */
export function weekOf(now: number, timezone: string): string {
  const day = new Date(`${localDayKey(now, timezone)}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

export async function openReservations(ctx: QueryCtx, profileId: Id<"emotional_profiles">) {
  // ponytail: a person has one or two open talks at most; 20 is generous.
  return ctx.db
    .query("talk_charges")
    .withIndex("by_emotionalProfileId", (q) => q.eq("emotionalProfileId", profileId))
    .take(20);
}

/** Seconds left this week, as the next ledger write will see it. */
export async function secondsLeft(ctx: QueryCtx, profile: Doc<"emotional_profiles">, now: number) {
  const balance = await credits.balance(ctx, { owner: profile._id });
  const timezone = await profileTimezone(ctx, profile);
  const week = weekOf(now, timezone);
  const weekStart = dayStartMs(week, timezone);
  const resetsAt = dayStartMs(shiftDayKey(week, 7), timezone);
  if (profile.talkWeekOf && profile.talkWeekOf >= week) return { balance, week, weekStart, resetsAt, topUp: 0 };
  // This week's reservations are already out of the balance, so they count
  // toward the 900. Last week's don't: their leftover is forfeited.
  const open = (await openReservations(ctx, profile._id))
    .filter((r) => r.startedAt >= weekStart)
    .reduce((s, r) => s + r.reserved, 0);
  return { balance, week, weekStart, resetsAt, topUp: Math.max(0, WEEKLY_S - (balance + open)) };
}

export async function topUp(ctx: MutationCtx, profileId: Id<"emotional_profiles">, now: number) {
  const profile = await ctx.db.get("emotional_profiles", profileId);
  if (!profile) return { balance: 0, weekStart: now };
  const { balance, week, weekStart, topUp } = await secondsLeft(ctx, profile, now);
  if (topUp > 0) {
    await credits.grant(ctx, {
      owner: profileId,
      amount: topUp,
      key: `talk:${profileId}:week:${week}`,
      reason: "weekly talk time",
      reference: week,
    });
  }
  // A timezone moved west can read an earlier week: never step back.
  if (!profile.talkWeekOf || profile.talkWeekOf < week) {
    await ctx.db.patch("emotional_profiles", profileId, { talkWeekOf: week });
  }
  return { balance: balance + topUp, weekStart };
}

/** A row from before #604 keeps the session's keys; an opening's own are apart. */
export const keyOf = (row: Doc<"talk_charges">, step: string) =>
  row.talkKey ? `talk:${row.sessionId}:${row.talkKey}:${step}` : `talk:${row.sessionId}:${step}`;

/**
 * Gives a reservation back, unless it is last week's: that leftover was
 * forfeited at Monday's top-up, so it is charged in full instead.
 */
export async function release(ctx: MutationCtx, row: Doc<"talk_charges">, weekStart: number) {
  if (row.startedAt < weekStart) {
    await credits.complete(ctx, { chargeId: row.chargeId, key: keyOf(row, "complete") });
  } else {
    await credits.release(ctx, { chargeId: row.chargeId, key: keyOf(row, "release") });
  }
  await ctx.db.delete("talk_charges", row._id);
}

/** The start of the week `now` falls in, in the profile's timezone. */
export async function weekStartOf(ctx: QueryCtx, profileId: Id<"emotional_profiles">, now: number) {
  const profile = await ctx.db.get("emotional_profiles", profileId);
  if (!profile) return now;
  const timezone = await profileTimezone(ctx, profile);
  return dayStartMs(weekOf(now, timezone), timezone);
}
