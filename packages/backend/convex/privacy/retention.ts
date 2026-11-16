import { type Infer, type ObjectType, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

/**
 * Data retention: what a `dataRetentionPreference` keeps, shared by the job
 * that enforces it (`jobs/dataRetention.ts`) and the count Settings shows
 * before someone shortens it ("N sessions would go", redesign B9).
 *
 * Both read the same cutoff and the same index range from here, so the count
 * can't drift from what the job deletes: the same table, the same comparison
 * (strictly older than the cutoff), and no day boundary (the cutoff is a
 * millisecond instant, not a local day).
 */

/** Every value of `preferences.dataRetentionPreference`. */
export const retentionPreferenceValidator = v.union(
	v.literal("indefinite"),
	v.literal("6_months"),
	v.literal("1_year")
);
export type RetentionPreference = Infer<typeof retentionPreferenceValidator>;

/** The preferences that expire anything, shortest first: the order the job walks them. */
export const RETENTION_TIERS = ["6_months", "1_year"] as const;
export type RetentionTier = (typeof RETENTION_TIERS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_IN_YEAR = 365;
const DAYS_IN_MONTH = 30;
const MONTHS_IN_HALF_YEAR = 6;

/** How long each tier keeps a session. Fixed day counts, not calendar months. */
export const RETENTION_MS: Record<RetentionTier, number> = {
	"1_year": DAYS_IN_YEAR * DAY_MS,
	"6_months": MONTHS_IN_HALF_YEAR * DAYS_IN_MONTH * DAY_MS,
};

/** Rows created strictly before this instant are past `tier`'s retention at `now`. */
export function retentionCutoff(tier: RetentionTier, now: number): number {
	return now - RETENTION_MS[tier];
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
 * The most sessions the count reads. Past it the answer is "more than
 * `MAX_COUNTED`". A session row is at most ~30 KB (a talk's 20,000-character
 * `rawInput` plus its mirror and memory text), so 201 rows stay near 6 MB,
 * well inside a query's read limits; text sessions are a few KB each. A daily
 * user crosses 200 only after more than a year past the cutoff, and by then
 * the exact number no longer changes what the warning says.
 */
export const MAX_COUNTED = 200;

export const retentionCountArgs = { retention: retentionPreferenceValidator };

export const retentionCountValidator = v.object({
	/** True when more than `count` sessions would go; `count` is then `MAX_COUNTED`. */
	capped: v.boolean(),
	count: v.number(),
});

/**
 * How many of the caller's sessions retention would delete if `retention`
 * were their preference now. `indefinite` deletes nothing and reads nothing.
 *
 * The cutoff is taken at the query's `Date.now()`; the job runs daily on its
 * own clock, so a session within a day of the cutoff may go a run later.
 */
export async function countSessionsPastRetentionCore(
	ctx: QueryCtx,
	args: ObjectType<typeof retentionCountArgs>
): Promise<Infer<typeof retentionCountValidator>> {
	const { profile } = await requireAuth(ctx);
	if (args.retention === "indefinite") {
		return { capped: false, count: 0 };
	}
	const cutoff = retentionCutoff(args.retention, Date.now());
	const rows = await sessionsBefore(ctx.db, profile._id, cutoff).take(
		MAX_COUNTED + 1
	);
	return {
		capped: rows.length > MAX_COUNTED,
		count: Math.min(rows.length, MAX_COUNTED),
	};
}

/** Settings' retention alert: "N sessions would go" before shortening retention. */
export const countSessionsPastRetention = query({
	args: retentionCountArgs,
	handler: countSessionsPastRetentionCore,
	returns: retentionCountValidator,
});
