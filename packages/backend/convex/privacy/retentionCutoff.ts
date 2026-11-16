import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/**
 * Data retention's rule: which rows a `dataRetentionPreference` lets go, and
 * when. One definition for everything that reads or enforces it: the nightly
 * job (`jobs/dataRetention.ts`, scheduled in `crons.ts`), the count Settings
 * shows before someone shortens it, and the purge it runs when they confirm
 * (`privacy/retention.ts`, redesign B9).
 *
 * The comparison is strictly older than the cutoff, and there's no day
 * boundary: the cutoff is a millisecond instant, not a local day.
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
 * The cutoff the job's next run will use at the latest: `tier`'s cutoff one
 * run interval after `now`. The count and the confirmed purge both use it,
 * so they agree with each other and never miss what the next run deletes.
 */
export function nextRunCutoff(tier: RetentionTier, now: number): number {
	// Same rule as crons.ts's `isProd`.
	const isProd = process.env.CONVEX_ENV === "production";
	return retentionCutoff(
		tier,
		now + retentionRunIntervalHours(isProd) * HOUR_MS
	);
}

/**
 * A profile's sessions created strictly before `cutoff`, oldest first. The
 * only range retention deletes sessions from; bound it with `.take(n)`.
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
