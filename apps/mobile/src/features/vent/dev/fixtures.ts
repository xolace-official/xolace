/** Vent's fixtures (the prototype's `fixtures/vent.ts`, handoff §13): what the "server" says. */
import type { VentReply } from "@/features/vent/vent-backend";

/** The prototype's reply. */
const WORDS =
	"All of that, finally out loud. It can rest somewhere other than you now.";
/** Production's fixed crisis line, lowercase as the server returns it. */
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

/** The fixture "server" answers this long after the release (Reduce Motion: sooner). */
export const ANSWER_MS = 5400;
export const ANSWER_REDUCED_MS = 2600;

/** The simulator's mic may be silent: a pretend voice at these loudnesses (the board's). */
export const VOICE = { loud: 0.9, normal: 0.55, soft: 0.25 } as const;
export type Loudness = keyof typeof VOICE;

/** Production's free ceiling. Near the limit starts 14 s before it. */
export const CEILING_MS = 120_000;
export const NEAR_LEFT_MS = 14_000;
