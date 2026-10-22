import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import {
  cohortEmotionValidator,
  deriveCohortCardState,
  isCohortEmotion,
  isCohortMatch,
  WEEK_MS,
  weekStartUtc,
} from "./lib/cohortCard";

const HIDDEN = { status: "hidden" as const };

// The viewer's own sessions in one week, scanned newest-first and stopped at
// the first match. The emotion we're matching came from their newest session,
// so the first row read is usually the answer. The cap only exists so a
// pathological account can't turn this into an unbounded scan; reaching it
// means "no match found", which at worst leaves the viewer counted among the
// others — the direction the ordering makes vanishingly unlikely.
const OWN_WEEK_SCAN_CAP = 500;

/**
 * The Discovery cohort card's only read: how many OTHER campers carried the
 * same emotion the viewer last carried, over the most recently closed calendar
 * week. Reads one materialized row (jobs/cohortCounts.ts) — nothing is counted
 * live here.
 *
 * Three shapes, mirroring `getReflectionRank`'s withhold-don't-fabricate gate:
 *   hidden  — no classified session of the viewer's own to key the cohort on
 *   warming — below the floor, or no fresh week to read; the reassurance line
 *             runs without a number, claiming nothing about this week
 *   count   — a real number of real other people
 */
export const getWeeklyCohortCard = query({
  args: {},
  returns: v.union(
    v.object({ status: v.literal("hidden") }),
    v.object({ status: v.literal("warming"), emotion: cohortEmotionValidator }),
    v.object({
      status: v.literal("count"),
      emotion: cohortEmotionValidator,
      count: v.number(),
      weekStart: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);

    // The viewer's own most recent classified session decides which cohort
    // they're shown. No session, no card — never a generic stat.
    const latest = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_profile_createdAt", (q) =>
        q.eq("emotionalProfileId", profile._id),
      )
      .order("desc")
      .first();

    if (!latest) return HIDDEN;

    const emotion = latest.primaryEmotion;
    // A label outside the taxonomy (an older classifier version, say) has no
    // column in the aggregate. Nothing to say rather than something wrong.
    if (!isCohortEmotion(emotion)) return HIDDEN;

    // Only the week that just closed may be reported. Asking for it by its
    // exact weekStart rather than taking the newest row is what keeps a paused
    // or failed cron from leaving a months-old number under copy that says
    // "this week" — a stale number here is wrong, not merely late.
    const weekStart = weekStartUtc(Date.now()) - WEEK_MS;
    const week = await ctx.db
      .query("cohort_weekly_counts")
      .withIndex("by_weekStart", (q) => q.eq("weekStart", weekStart))
      .unique();

    // No row for that week — the cron hasn't run yet, or hasn't run in a while.
    // Falls through as a count of zero, which the floor turns into the
    // numberless reassurance line: the one thing still honest to say.
    const total = week ? (week.counts[emotion] ?? 0) : 0;

    // Self-exclusion, applied here rather than in the aggregate because the
    // aggregate row is shared by every viewer carrying this emotion. The count
    // is of distinct campers, so the viewer is worth at most one — check
    // whether they were one of them at all, not just their newest session.
    //
    // Newest-first with an early break: `emotion` came from their most recent
    // session, so if that session falls in this window it is the first row read
    // and the loop ends immediately.
    let countedSelf = false;
    let scanned = 0;
    for await (const row of ctx.db
      .query("emotional_metadata")
      .withIndex("by_profile_createdAt", (q) =>
        q
          .eq("emotionalProfileId", profile._id)
          .gte("createdAt", weekStart)
          .lt("createdAt", weekStart + WEEK_MS),
      )
      .order("desc")) {
      if (isCohortMatch(row, emotion)) {
        countedSelf = true;
        break;
      }
      if (++scanned >= OWN_WEEK_SCAN_CAP) break;
    }

    const others = Math.max(total - (countedSelf ? 1 : 0), 0);

    const state = deriveCohortCardState(others);
    if (state.type === "warming") return { status: "warming" as const, emotion };

    return {
      status: "count" as const,
      emotion,
      count: state.value,
      weekStart,
    };
  },
});
