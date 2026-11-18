/**
 * Talk on fixtures: the board's companion, its script and its talk times (handoff §4, §9),
 * for the dev states and the tests.
 */
import type { Resource } from "@xolace/backend/convex/lib/crisisResources";
import type { TalkHelp } from "../talk-data";
import type { Turn } from "../use-thread";

export const FIXTURE_NAME = "Ember";

/** A full week, a little used, almost none left (handoff §2.5). */
export const WEEK = { full: 15 * 60, low: 2 * 60, some: 12 * 60 } as const;

/** The wrap-up cue: the pill shows the clock from here (production's 15-min talk). */
export const CLOCK_FROM_S = 120;
/** Mid-talk states open with this long left; the wrap-up clock counts down from 1:48. */
export const TALK_LEFT_S = { late: 108, mid: 11 * 60 + 20 } as const;

/** The board's script: the companion speaks, you answer out loud, it thinks, it answers. */
export const SCRIPT: readonly { speaker: Turn["speaker"]; text: string }[] = [
	{
		speaker: "companion",
		text: "Hi. I’m here. What’s been sitting with you today?",
	},
	{
		speaker: "person",
		text: "Work, mostly. I keep replaying a meeting from this morning.",
	},
	{
		speaker: "companion",
		text: "That sounds like it’s still with you. What part of it keeps coming back?",
	},
	{
		speaker: "person",
		text: "The moment I didn’t say anything when my idea got shot down.",
	},
	{
		speaker: "companion",
		text: "So the quiet is what stuck, more than the no. What did you want to say?",
	},
];

/** The script's first `n` lines, said. */
export const said = (n: number): Turn[] =>
	SCRIPT.slice(0, n).map((line, id) => ({ id, ...line, via: "voice" }));

/** Timing of the scripted talk (the board's `turn`). */
export const PACE = {
	companionWordMs: 190,
	connectMs: 950,
	endMs: 1200,
	listenAfterMs: 300,
	/** A live talk plays lines 1–3, then listens. */
	livePlays: 3,
	nextAfterMs: 900,
	personWordMs: 240,
	thinkMs: 1100,
} as const;

const RESOURCES: Resource[] = [
	{
		label: "Emergency services",
		priority: 1,
		source: "crisis_line",
		type: "phone",
		value: "112",
	},
	{
		description: "Free, 24/7, by text",
		label: "Crisis Text Line",
		priority: 2,
		source: "text_support",
		type: "text",
		value: "Text HOME to 741741",
	},
];

export const HELP: Record<"elevated" | "crisis", NonNullable<TalkHelp>> = {
	crisis: { level: "crisis", resources: RESOURCES },
	elevated: { level: "elevated", resources: [] },
};

/** A talk that couldn't start: production's line when the week's time is used. */
export const START_ERROR =
	"There isn't enough talk time left this week. Talk time resets Monday.";
