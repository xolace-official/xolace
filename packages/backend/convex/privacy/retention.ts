import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { dataRetentionPreferenceValidator } from "../lib/validators";

/**
 * Data retention: what a `dataRetentionPreference` keeps, shared by the job
 * that enforces it (`jobs/dataRetention.ts`, scheduled in `crons.ts`) and the
 * count Settings shows before someone shortens it (redesign B9).
 *
 * Both read the same cutoff and the same index range from here, so the count
 * can't drift from what the job deletes: the same table, the same comparison
 * (strictly older than the cutoff), and no day boundary (the cutoff is a
 * millisecond instant, not a local day).
 */

/** The preferences that expire anything, shortest first: the order the job walks them. */
export const RETENTION_TIERS = ["6_months", "1_year"] as const;
export type RetentionTier = (typeof RETENTION_TIERS)[number];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const DAYS_IN_YEAR = 365;
const DAYS_IN_MONTH = 30;
const MONTHS_IN_HALF_YEAR = 6;

/** How long each tier keeps a session. Fixed day counts, not calendar months. */
const RETENTION_MS: Record<RetentionTier, number> = {
	"1_year": DAYS_IN_YEAR * DAY_MS,
	"6_months": MONTHS_IN_HALF_YEAR * DAYS_IN_MONTH * DAY_MS,
};

/** Rows created strictly before this instant are past `tier`'s retention at `now`. */
export function retentionCutoff(tier: RetentionTier, now: number): number {
	return now - RETENTION_MS[tier];
}

const PROD_RUN_INTERVAL_HOURS = 24;
const DEV_RUN_INTERVAL_HOURS = 72;

/** How often `crons.ts` runs the retention job: daily in production, every 3 days elsewhere. */
export function retentionRunIntervalHours(isProd: boolean): number {
	return isProd ? PROD_RUN_INTERVAL_HOURS : DEV_RUN_INTERVAL_HOURS;
}

/**
 * A profile's sessions created strictly before `cutoff`, oldest first. The
 * only range retention deletes from; bound it with `.take(n)`.
 */
export function sessionsBefore(
	db: QueryCtx["db"],
	emotionalProfileId: Id<"emotional_profiles">,
	cutoff: number
) {
	return db
		.query("sessions")
		.withIndex("by_profile_time", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId).lt("createdAt", cutoff)
		);
}

/**
 * The most sessions the count reads; past it the answer is "more than
 * `MAX_COUNTED`". A session row tops out near 70 KB: a talk's `rawInput` is up
 * to 20,000 characters, which in CJK is about 60 KB of UTF-8, plus its mirror
 * and memory text. 101 rows stay near 7 MB, under half a query's 16 MiB read
 * limit; text sessions are a few KB each. A daily user crosses 100 only after
 * more than three months past the cutoff, and by then the exact number no
 * longer changes what the warning says.
 */
export const MAX_COUNTED = 100;

/**
 * How many of the caller's sessions retention would delete if `retention`
 * became their preference now, up to the job's next run.
 *
 * - **Every session row counts**, not only the ones on the timeline:
 *   `initiated`, `abandoned` and `error` sessions are deleted too, and an
 *   abandoned one can still hold what the person wrote.
 * - **Counted to the next run.** The job runs every
 *   `retentionRunIntervalHours` on its own clock, so a session that crosses
 *   the cutoff before then is deleted at that run. The cutoff is taken that
 *   far ahead: the count may include a session up to one interval early,
 *   never miss one the next run deletes.
 * - **Fetch it once**, imperatively, when the person picks a shorter period
 *   (`convex.query(...)`), not as a `useQuery` subscription: the result
 *   depends on the clock, and nothing re-runs it as time passes.
 *   `indefinite` deletes nothing and reads no sessions.
 *
 * Returns `{ count, capped }`; `capped` means more than `count` (= `MAX_COUNTED`).
 */
export const countSessionsPastRetention = query({
	args: { retention: dataRetentionPreferenceValidator },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		if (args.retention === "indefinite") {
			return { capped: false, count: 0 };
		}
		// Same rule as crons.ts's `isProd`.
		const isProd = process.env.CONVEX_ENV === "production";
		const nextRun = Date.now() + retentionRunIntervalHours(isProd) * HOUR_MS;
		const cutoff = retentionCutoff(args.retention, nextRun);
		const rows = await sessionsBefore(ctx.db, profile._id, cutoff).take(
			MAX_COUNTED + 1
		);
		return {
			capped: rows.length > MAX_COUNTED,
			count: Math.min(rows.length, MAX_COUNTED),
		};
	},
	returns: v.object({ capped: v.boolean(), count: v.number() }),
});
