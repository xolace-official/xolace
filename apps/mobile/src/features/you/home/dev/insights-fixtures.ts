/**
 * The board's Steadiness and This week (YouAlive's PARTS, OVERALL, WEEK and USUAL). Dev only;
 * the model tests may read it too.
 */
import type { InsightsView } from "@/features/you/home/steadiness/steadiness-model";
import type { IntensityWeek } from "@/features/you/home/use-you-week";
import type { IntensityDay } from "@/features/you/home/week/week-model";

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

/**
 * `board`: the board's week. `no-usual`: the same week in someone's first weeks, before B8 has
 * enough days for a usual. `empty`: Monday morning, nothing yet.
 */
export type WeekFixture = "board" | "no-usual" | "empty";

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
	const days: IntensityDay[] = NAMES.map((dayName, i) => ({
		dayName,
		intensity: values[i],
		isToday: !earlier && i === today,
		label: LETTERS[i],
	}));
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
