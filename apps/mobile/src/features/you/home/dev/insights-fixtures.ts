/**
 * The board's Steadiness and This week (YouAlive's PARTS, OVERALL, WEEK and USUAL). Dev only;
 * the model tests may read it too.
 */
import type { InsightsView } from "@/features/you/home/steadiness/steadiness-model";
import type { IntensityWeek } from "@/features/you/home/use-you-week";
import type {
	DayDetail,
	IntensityDay,
} from "@/features/you/home/week/week-model";

const NAMES = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
];
const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
/** The board's week, Monday 9 Nov 2026; today is Thursday. */
const WEEK = [4.4, 7.6, 5.2, 3.1, null, null, null];
const EARLIER = [5.1, 4.2, 6.4, 3.9, 4.8, null, 2.6];
const EMPTY = [null, null, null, null, null, null, null];
const TODAY = 3;
const USUAL = { high: 5.6, low: 3.8, median: 4.7 };

const day = (
	moments: number,
	topDomain: string | null,
	topEmotion: string | null,
	ended: DayDetail["ended"]
): DayDetail => ({ ended, moments, topDomain, topEmotion });

/** The board's held-day lines (B17), in the classifier's words. */
const WEEK_DETAIL = [
	day(1, "work", "exhaustion", "lighter"),
	day(2, "work", "overwhelm", "lighter"),
	day(1, "health", "stress", "same"),
	day(1, "love", "hope", "lighter"),
];
const EARLIER_DETAIL = [
	day(1, "work", "stress", "lighter"),
	day(1, "health", "exhaustion", "lighter"),
	day(2, "work", "overwhelm", "same"),
	day(1, "love", "hope", "lighter"),
	day(1, "belonging", "homesickness", "heavier"),
	undefined,
	day(1, "health", "calm", "lighter"),
];
/** Unanswered moments with nothing to name: the line is only the count. */
const SPARSE_DETAIL = [
	day(1, null, null, null),
	day(3, null, null, null),
	day(1, "work", null, null),
	day(1, null, "grief", null),
];

/**
 * `board`: the board's week. `no-usual`: the same week in someone's first weeks, before B8 has
 * enough days for a usual. `empty`: Monday morning, nothing yet. `no-detail`: the board's week
 * from a backend without B17, so a held day has no second line. `sparse`: the board's week whose
 * moments went unanswered and named nothing, so the second line is short.
 */
export type WeekFixture =
	| "board"
	| "no-usual"
	| "empty"
	| "no-detail"
	| "sparse";

export function fixtureIntensity({
	plus,
	earlier = false,
	week = "board",
}: {
	plus: boolean;
	/** A past week: Xolace+ paged back one. */
	earlier?: boolean;
	week?: WeekFixture;
}): IntensityWeek {
	const values = earlier ? EARLIER : week === "empty" ? EMPTY : WEEK;
	const today = week === "empty" ? 0 : TODAY;
	const details = earlier
		? EARLIER_DETAIL
		: week === "no-detail"
			? []
			: week === "sparse"
				? SPARSE_DETAIL
				: WEEK_DETAIL;
	const days: IntensityDay[] = NAMES.map((dayName, i) => {
		const detail = values[i] === null ? undefined : details[i];
		return {
			dayName,
			...(detail ? { detail } : {}),
			intensity: values[i],
			isToday: !earlier && i === today,
			label: LETTERS[i],
		};
	});
	return {
		days,
		earliest: week === "no-usual",
		label: earlier ? "2 – 8 Nov" : "This week",
		offset: earlier ? -1 : 0,
		pager: plus,
		// UTC Mondays, as `weekStart` gives them.
		start: new Date(Date.UTC(2026, 10, earlier ? 2 : 9)),
		usual: week === "no-usual" ? null : USUAL,
	};
}

/** The board's three parts, overall 68, up 4 for Xolace+. The board knows Love & Friendship
 * well on its Xolace+ card and is still warming to it on the free one. */
export function fixtureInsights(
	kind: "regular" | "new",
	plus: boolean
): InsightsView {
	if (kind === "new") {
		return {
			domains: [{ domain: "work", lastSeenAt: null, state: "warming" }],
			overall: null,
		};
	}
	return {
		domains: [
			{
				compounding: "compounding",
				domain: "work",
				lastSeenAt: null,
				state: "settled",
			},
			{
				compounding: "easing",
				domain: "health",
				lastSeenAt: null,
				state: "unlocked",
			},
			{
				compounding: null,
				domain: "love",
				lastSeenAt: null,
				state: plus ? "settled" : "warming",
			},
		],
		overall: 68,
		overallTrend: 4,
		overallTrendSince: null,
	};
}
