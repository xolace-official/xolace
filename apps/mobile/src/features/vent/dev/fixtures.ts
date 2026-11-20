import type { VentReply } from "@/features/vent/vent-backend";

const WORDS =
	"All of that, finally out loud. It can rest somewhere other than you now.";
const CRISIS = "you don’t have to carry this alone";

export type FixtureAnswer = "reply" | "crisis" | "cap" | "error";

export const ANSWERS: Record<
	FixtureAnswer,
	{ reply: VentReply | null; capReached: boolean }
> = {
	cap: { capReached: true, reply: null },
	crisis: { capReached: false, reply: { crisis: true, words: CRISIS } },
	error: { capReached: false, reply: null },
	reply: { capReached: false, reply: { crisis: false, words: WORDS } },
};

export const ANSWER_MS = 5400;
export const ANSWER_REDUCED_MS = 2600;

export const VOICE = { loud: 0.9, normal: 0.55, soft: 0.25 } as const;
export type Loudness = keyof typeof VOICE;

export const CEILING_MS = 120_000;
export const NEAR_LEFT_MS = 14_000;
