/**
 * The Steadiness board's fixtures (SteadinessAlive's DOMS and SCORES): overall 68, up 4, as You's
 * card. Dev only; the model tests read them too.
 */
import type {
	DomainItem,
	Insight,
	StView,
} from "@/features/you/steadiness/steadiness-model";

/** The board's "now": Thursday 12 Nov 2026. */
export const ST_NOW = new Date(2026, 10, 12, 10);
const at = (month: number, day: number) => new Date(2026, month, day).getTime();

export type ScoreFixture = 68 | 30 | 100;
const TRENDS: Record<ScoreFixture, number> = { 30: -6, 68: 4, 100: 2 };

const PLUS: DomainItem[] = [
	{
		baseline: 66,
		compounding: "compounding",
		domain: "work",
		kindling: true,
		lastSeenAt: null,
		state: "settled",
		steadiness: 58,
		trend: -8,
		trendSince: null,
	},
	{
		baseline: 64,
		compounding: null,
		domain: "health",
		kindling: false,
		lastSeenAt: null,
		state: "settled",
		steadiness: 71,
		trend: 5,
		trendSince: null,
	},
	{
		baseline: 61,
		compounding: "easing",
		domain: "love",
		kindling: false,
		lastSeenAt: null,
		state: "unlocked",
		steadiness: 64,
		trend: 3,
		trendSince: null,
	},
	{
		baseline: 75,
		compounding: null,
		domain: "family",
		kindling: false,
		lastSeenAt: null,
		state: "unlocked",
		steadiness: 77,
		trend: 0,
		trendSince: null,
	},
	{
		baseline: 55,
		compounding: null,
		domain: "belonging",
		kindling: false,
		lastSeenAt: at(8, 18),
		state: "settled",
		steadiness: 52,
		trend: null,
		trendSince: null,
	},
	{
		baseline: null,
		compounding: null,
		domain: "self",
		kindling: false,
		lastSeenAt: null,
		state: "warming",
		steadiness: null,
		trend: null,
		trendSince: null,
	},
];

const thread = (domain: DomainItem["domain"], text: string): Insight => ({
	domains: [domain],
	kind: "thread",
	level: "domain",
	text,
	writtenAt: at(10, 4),
});

const INSIGHTS: Insight[] = [
	{
		domains: [],
		kind: "relief",
		level: "overall",
		text: "Talking it through, more than anything else, has been what eases your weeks lately.",
		writtenAt: at(10, 6),
	},
	thread(
		"work",
		"Most of what's been heavy this month started at work, often after 8 pm."
	),
	thread(
		"health",
		"Rest has come back on the weeks you sat with things before bed."
	),
	thread("love", "It has been easing since the talk with J."),
	thread(
		"family",
		"Calls with Mum keep coming up as the steady part of your week."
	),
	thread("belonging", "Belonging came up most in September, around the move."),
];

const free = (d: DomainItem): DomainItem => ({
	domain: d.domain,
	lastSeenAt: d.lastSeenAt,
	state: d.state,
});

/** Lit, as the board: Xolace+ sees every number; free sees the doors and Work's upsell. */
export function fixtureSteadiness({
	plus,
	score = 68,
}: {
	plus: boolean;
	score?: ScoreFixture;
}): StView {
	if (plus) {
		return {
			domains: PLUS,
			insights: INSIGHTS,
			overall: score,
			overallTrend: TRENDS[score],
			overallTrendSince: null,
		};
	}
	return {
		domains: PLUS.map(free),
		overall: score,
		upsell: { domain: "work", stretchStartedAt: at(10, 1) },
	};
}

/** Not lit: Work known, Self warming (render 09). */
export function fixtureUnlit(): StView {
	return {
		domains: [
			{ domain: "work", lastSeenAt: null, state: "unlocked" },
			{ domain: "self", lastSeenAt: null, state: "warming" },
		],
		overall: null,
		upsell: null,
	};
}
