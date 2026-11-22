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
const SPARSE_DETAIL = [
	day(1, null, null, null),
	day(3, null, null, null),
	day(1, "work", null, null),
	day(1, null, "grief", null),
];
const LONGEST_DETAIL = [
	WEEK_DETAIL[0],
	day(12, "belonging", "disappointment", "same"),
	WEEK_DETAIL[2],
	WEEK_DETAIL[3],
];

export type WeekFixture =
	| "board"
	| "no-usual"
	| "empty"
	| "capped"
	| "sparse"
	| "longest";

const DETAILS: Record<WeekFixture, readonly DayDetail[]> = {
	board: WEEK_DETAIL,
	capped: WEEK_DETAIL.slice(0, TODAY),
	empty: [],
	longest: LONGEST_DETAIL,
	"no-usual": WEEK_DETAIL,
	sparse: SPARSE_DETAIL,
};

export function fixtureIntensity({
	plus,
	earlier = false,
	week = "board",
}: {
	plus: boolean;
	earlier?: boolean;
	week?: WeekFixture;
}): IntensityWeek {
	const values = earlier ? EARLIER : week === "empty" ? EMPTY : WEEK;
	const today = week === "empty" ? 0 : TODAY;
	const details = earlier ? EARLIER_DETAIL : DETAILS[week];
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
		start: new Date(Date.UTC(2026, 10, earlier ? 2 : 9)),
		usual: week === "no-usual" ? null : USUAL,
	};
}

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
