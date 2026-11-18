import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { type Domain, domainOf } from "../lib/understandingVocab";
import { domainValidator } from "../lib/validators";

/**
 * A held day on the You screen's This week card (redesign B17, you.md §6), its
 * second line: "2 moments · Work · Overwhelmed · ended lighter".
 *
 * Built from the same `emotional_metadata` rows `profile.getWeekIntensity`
 * already reads for the bars, bucketed into the same days, so a day's detail
 * always describes the moments under its bar. The only extra reads are the
 * sessions that ended each day (at most one a day, so at most seven).
 */

/**
 * `getWeekIntensity`'s read cap for one week's moments, read oldest first. At
 * the cap, the last day read may be partial, and it gets no detail.
 */
export const WEEK_MAX_MOMENTS = 300;

/** How a day ended: how its last moment ended, by the after-session check. */
export type DayEnded = "lighter" | "same" | "heavier";

export type DayDetail = {
	/** How the day's last moment ended, or null when it wasn't answered (or "unsure"). */
	ended: DayEnded | null;
	/** Moments that day: one `emotional_metadata` row each (one per session). */
	moments: number;
	/** The life domain the day's moments touched most (a `DOMAINS` key), or null. */
	topDomain: Domain | null;
	/** The day's most frequent primary emotion (the classifier's word), or null. */
	topEmotion: string | null;
};

export const dayDetailValidator = v.object({
	ended: v.union(
		v.literal("lighter"),
		v.literal("same"),
		v.literal("heavier"),
		v.null()
	),
	moments: v.number(),
	topDomain: v.union(domainValidator, v.null()),
	topEmotion: v.union(v.string(), v.null()),
});

type Moment = Pick<
	Doc<"emotional_metadata">,
	"createdAt" | "primaryEmotion" | "sessionId" | "thematicTags"
>;

/**
 * The value seen most often, or null when there's none. A tie goes to the one
 * seen latest in the day: the nearer to how the day ended. `seen` is in time
 * order, oldest first.
 */
export function mostFrequent<T>(seen: readonly T[]): T | null {
	const counts = new Map<T, { count: number; last: number }>();
	seen.forEach((value, i) => {
		const acc = counts.get(value) ?? { count: 0, last: i };
		counts.set(value, { count: acc.count + 1, last: i });
	});
	let best: T | null = null;
	let bestCount = 0;
	let bestLast = -1;
	for (const [value, { count, last }] of counts) {
		if (count > bestCount || (count === bestCount && last > bestLast)) {
			best = value;
			bestCount = count;
			bestLast = last;
		}
	}
	return best;
}

/**
 * The detail of one day from its moments, oldest first, and how its last
 * session ended. Pure: the whole calculation but the read.
 *
 * - Domains come from each moment's life-area tags (`domainOf`): a moment
 *   counts once per domain it touched, however many of its tags share it.
 *   Texture and sensitive tags give no domain and are never shown.
 * - The emotion is the classifier's primary one; a blank one isn't counted.
 * - "unsure" after a session says nothing about how it ended, so it reads as
 *   unanswered.
 */
export function dayDetail(
	moments: readonly Moment[],
	lastMood: Doc<"sessions">["postSessionMood"] | null
): DayDetail {
	const domains = moments.flatMap((m) => [
		...new Set(
			m.thematicTags.map(domainOf).filter((d): d is Domain => d !== null)
		),
	]);
	const emotions = moments
		.map((m) => m.primaryEmotion.trim())
		.filter((e) => e.length > 0);
	return {
		ended:
			lastMood === undefined || lastMood === null || lastMood === "unsure"
				? null
				: lastMood,
		moments: moments.length,
		topDomain: mostFrequent(domains),
		topEmotion: mostFrequent(emotions),
	};
}
