import { v } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../_generated/server";
import {
  COHORT_EMOTIONS,
  isCohortMatch,
  WEEK_MS,
  weekStartUtc,
} from "../lib/cohortCard";

/**
 * Materializes last week's per-emotion cohort counts for the Discovery card.
 *
 * Runs Monday 04:00 UTC (crons.ts) over the calendar week that just closed,
 * writing one small row the card can read in O(1). See ADR 0004 for why this
 * is precomputed rather than counted per request.
 *
 * Counts DISTINCT campers, not sessions: the copy says "22 campers", so one
 * person with three sad sessions has to be one. The viewer is not excluded
 * here — the row is shared by everyone carrying that emotion — the read side
 * subtracts them (see cohort.ts).
 *
 * Idempotent: re-running for the same week overwrites the row.
 */

// One transaction, so the scan is bounded. Comfortably above current weekly
// volume; if it ever saturates the job says so instead of quietly under-counting.
// ponytail: single-transaction scan, rewrite as a scheduled batch fold if a
// week's sessions ever approach this.
const SCAN_CAP = 8000;

export async function computeCohortCounts(
  ctx: MutationCtx,
  args: { weekOf?: number },
) {
  const weekStart =
    args.weekOf !== undefined
      ? weekStartUtc(args.weekOf)
      : weekStartUtc(Date.now()) - WEEK_MS;
  const weekEnd = weekStart + WEEK_MS;

  const rows = await ctx.db
    .query("emotional_metadata")
    .withIndex("by_createdAt", (q) =>
      q.gte("createdAt", weekStart).lt("createdAt", weekEnd),
    )
    // One over the cap so saturation is detectable before anything is written.
    .take(SCAN_CAP + 1);

  if (rows.length > SCAN_CAP) {
    console.error(
      "[cohortCounts] week scan hit SCAN_CAP — no row written. " +
        "Rewrite as a batched fold before trusting these numbers.",
      { weekStart, cap: SCAN_CAP },
    );
    // A partial count would be indistinguishable from a quiet week on the
    // card, so leave last week's row (or no row) alone.
    return { weekStart, scanned: rows.length, saturated: true, counts: {} };
  }

  // emotion → distinct emotionalProfileIds carrying it that week.
  const campers = new Map<string, Set<string>>(
    COHORT_EMOTIONS.map((e) => [e, new Set<string>()]),
  );

  for (const row of rows) {
    for (const emotion of COHORT_EMOTIONS) {
      if (isCohortMatch(row, emotion)) {
        campers.get(emotion)!.add(row.emotionalProfileId);
      }
    }
  }

  const counts: Record<string, number> = {};
  for (const [emotion, set] of campers) counts[emotion] = set.size;

  const existing = await ctx.db
    .query("cohort_weekly_counts")
    .withIndex("by_weekStart", (q) => q.eq("weekStart", weekStart))
    .unique();

  const doc = { weekStart, weekEnd, counts, computedAt: Date.now() };
  if (existing) {
    await ctx.db.replace("cohort_weekly_counts", existing._id, doc);
  } else {
    await ctx.db.insert("cohort_weekly_counts", doc);
  }

  console.log("[cohortCounts] week counted.", {
    weekStart,
    scanned: rows.length,
    counts,
  });

  return { weekStart, scanned: rows.length, saturated: false, counts };
}

export const compute = internalMutation({
  args: {
    // Any timestamp inside the week to count. Omitted by the cron, which
    // counts the week that just closed; passed when backfilling by hand.
    weekOf: v.optional(v.number()),
  },
  returns: v.object({
    weekStart: v.number(),
    scanned: v.number(),
    saturated: v.boolean(),
    counts: v.record(v.string(), v.number()),
  }),
  handler: computeCohortCounts,
});
