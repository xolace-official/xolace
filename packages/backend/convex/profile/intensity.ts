import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

/**
 * "Your usual" on the You screen's intensity card (redesign B8, you.md §6):
 * a band over the middle half of the user's recent days, and a line at the
 * median of those days.
 *
 * The values are **day averages**, the same unit as the card's bars
 * (`profile.getWeekIntensity`): each day with moments is the mean intensity
 * (1–10) of that day's `emotional_metadata` rows. Comparing a bar to a band of
 * single moments would set a day's average against a wider spread than days
 * actually show.
 *
 * Days are bucketed exactly as `getWeekIntensity` buckets them: the runtime's
 * local calendar day (`Date#setHours(0, 0, 0, 0)`), so a moment sits in the
 * same day here as under its bar.
 */

/** The band covers this many local days, ending today (today included). */
export const USUAL_WINDOW_DAYS = 28;

/**
 * Fewer days with moments than this in the window and there is no band:
 * quartiles of a handful of days would draw a confident range from noise.
 * Seven is a week's worth of days, spread over up to four weeks.
 */
export const MIN_USUAL_DAYS = 7;

/**
 * Read cap: four of `getWeekIntensity`'s 300-row weeks. Read newest first,
 * so if a very heavy user ever hits it, it's the oldest days that thin out.
 */
const MAX_MOMENTS = 1200;

/** The value at fraction `p` (0–1) of ascending `sorted`, interpolating
 * linearly between ranks (the common "type 7" quantile). */
export function quantile(sorted: readonly number[], p: number): number {
	if (sorted.length === 0) {
		throw new Error("quantile of an empty list");
	}
	const rank = (sorted.length - 1) * p;
	const lo = Math.floor(rank);
	const hi = Math.ceil(rank);
	return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo);
}

/** Local midnight of the day `ms` falls on (`getWeekIntensity`'s day). */
export function startOfLocalDay(ms: number): number {
	const d = new Date(ms);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
}

/** Local midnight `USUAL_WINDOW_DAYS - 1` calendar days before today's. */
export function usualWindowStart(now: number): number {
	const d = new Date(startOfLocalDay(now));
	// Calendar arithmetic, not 24 h steps, so a DST change can't shift the edge.
	d.setDate(d.getDate() - (USUAL_WINDOW_DAYS - 1));
	return d.getTime();
}

export type UsualBand = {
	/** Days with moments the band is drawn from. */
	days: number;
	/** Top of the band: the 75th percentile of day averages. */
	high: number;
	/** Bottom of the band: the 25th percentile of day averages. */
	low: number;
	/** The usual line: the median day average. */
	median: number;
};

/**
 * The band from `moments` (any order), or null with fewer than
 * `MIN_USUAL_DAYS` distinct days. Pure: the query's whole calculation.
 */
export function usualBand(
	moments: readonly { createdAt: number; intensity: number }[]
): UsualBand | null {
	const byDay = new Map<number, { sum: number; count: number }>();
	for (const m of moments) {
		const day = startOfLocalDay(m.createdAt);
		const acc = byDay.get(day) ?? { count: 0, sum: 0 };
		acc.sum += m.intensity;
		acc.count += 1;
		byDay.set(day, acc);
	}
	if (byDay.size < MIN_USUAL_DAYS) {
		return null;
	}
	const averages = [...byDay.values()]
		.map(({ sum, count }) => sum / count)
		.sort((a, b) => a - b);
	return {
		days: averages.length,
		high: quantile(averages, 0.75),
		low: quantile(averages, 0.25),
		median: quantile(averages, 0.5),
	};
}

/**
 * The signed-in user's usual band over the last four weeks, or null when
 * there isn't enough to say what's usual yet (see `MIN_USUAL_DAYS`).
 *
 * Its own query rather than a field on `getWeekIntensity`: the band is the
 * same whichever week the card pages to, so it's read once instead of on
 * every page, and shipped builds' `getWeekIntensity` is left untouched.
 *
 * Not Plus-gated: it summarises recent days rather than browsing them, and
 * the design draws it on the free card.
 */
export const getUsualBand = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const moments = await ctx.db
			.query("emotional_metadata")
			.withIndex("by_profile_createdAt", (q) =>
				q
					.eq("emotionalProfileId", profile._id)
					.gte("createdAt", usualWindowStart(Date.now()))
			)
			.order("desc")
			.take(MAX_MOMENTS);
		return usualBand(moments);
	},
	returns: v.union(
		v.null(),
		v.object({
			days: v.number(),
			high: v.number(),
			low: v.number(),
			median: v.number(),
		})
	),
});
