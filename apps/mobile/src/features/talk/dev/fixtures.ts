import type { Resource } from "@xolace/backend/convex/lib/crisisResources";
import type { TalkHelp } from "../talk-data";
import type { Turn } from "../use-thread";

export const FIXTURE_NAME = "Ember";

export const WEEK = { full: 15 * 60, low: 2 * 60, some: 12 * 60 } as const;

export const CLOCK_FROM_S = 120;
export const TALK_LEFT_S = { late: 108, mid: 11 * 60 + 20 } as const;

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

export const said = (n: number): Turn[] =>
	SCRIPT.slice(0, n).map((line, id) => ({ id, ...line, via: "voice" }));

export const PACE = {
	companionWordMs: 190,
	connectMs: 950,
	endMs: 1200,
	listenAfterMs: 300,
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

export const START_ERROR =
	"There isn't enough talk time left this week. Talk time resets Monday.";
