/**
 * Letters on fixtures: the board's drafts, sample letters and sent lists (prototype
 * `src/fixtures/letters.ts`). Dev states and tests read these; the live adapter reaches them
 * only in a dev build, through `src/dev/letters-seed.ts`. S21 deletes the seed.
 */
import type { LettersMemory } from "../letters-memory";
import type {
	LettersStatus,
	ReceivedLetter,
	SentLetter,
} from "../letters-model";

/**
 * The check's line for the fixable draft below. The server writes each fixable line itself
 * (`outcome.line`), so this is fixture text, not copy. @public Read by the Letters dev states (S20 PR 2).
 */
export const FIXABLE_LINE =
	"Letters can’t carry contact details, so no one can be found through one. Could you take out the Instagram handle?";

/** Drafts the board writes with. */
export const DRAFTS = {
	/** Carries a contact detail: the check finds it fixable. */
	fixable:
		"I don’t know what today asked of you, but you got through it, and that counts for more than it feels like. If you ever want to talk, I’m @quietmaya on Instagram.",
	/** Past 400: the count shows what's left. */
	near: "I don’t know what today asked of you, but you got through it, and that counts for more than it feels like. Something that helped me on a bad week: one small thing at a time, nothing more. You don’t have to have it figured out tonight. Rest is allowed, even when the list isn’t done. I hope tomorrow is kinder to you than today was, and if it isn’t, remember that someone you’ll never meet was rooting for you.",
	/** A letter that passes. */
	pass: "I don’t know what today asked of you, but you got through it, and that counts for more than it feels like. Something that helped me on a bad week: one small thing at a time, nothing more. You don’t have to have it figured out tonight.",
	/** Under 40 characters. */
	short: "You’re not alone in this.",
	/** Not English. */
	spanish:
		"No sé qué estás cargando, pero no estás solo en esto. Mañana puede ser un poco más suave.",
} as const;

/** Letters someone else wrote: warm, short and long. */
export const RECEIVED_TEXT = {
	long: "I’m writing this on a night when I couldn’t sleep either, so maybe we’re awake at the same time.\nA year ago I thought the heaviness was just who I was now. It wasn’t. It was a season, and seasons change even when you can’t feel them changing.\nWhat helped: a walk before anyone else was up, saying one true thing to one person, and letting myself be bad at things for a while.\nYou don’t owe anyone a fast recovery. Go slowly. I’m glad you’re here.",
	short: "You made it to the end of another day. That’s enough for today.",
	warm: "I don’t know what you’re carrying, but I know some days it’s heavy. Mine was too.\nIt got lighter slowly, and then one morning it just did. Be patient with yourself tonight.\nYou’re doing better than you think.",
} as const;

/** @public Read by the Letters dev states (S20 PR 2). */
export const RECEIVED_IDS = {
	long: "r-long",
	short: "r-short",
	warm: "r-warm",
} as const;

/** @public Read by the Letters dev states (S20 PR 2). */
export const receivedLetter = (
	which: keyof typeof RECEIVED_TEXT,
	state: Partial<Omit<ReceivedLetter, "id" | "text">> = {}
): ReceivedLetter => ({
	acknowledged: false,
	hidden: false,
	id: RECEIVED_IDS[which],
	opened: true,
	text: RECEIVED_TEXT[which],
	...state,
});

/** The board's sent list: one in each status. @public Read by the Letters dev states (S20 PR 2). */
export const SENT_SAMPLE: readonly SentLetter[] = [
	{
		id: "a",
		line: "You don’t have to have it figured out tonight…",
		seen: true,
		status: "waiting",
	},
	{
		id: "b",
		line: "Something that helped me on a bad week…",
		seen: true,
		status: "received",
	},
	{
		id: "c",
		line: "I don’t know you, but I’m glad you’re here…",
		seen: true,
		status: "acknowledged",
	},
];

/** All three waiting: Write is off until one is received. @public Read by the Letters dev states (S20 PR 2). */
export const SENT_THREE_WAITING: readonly SentLetter[] = [
	{ ...SENT_SAMPLE[0], id: "a" },
	{ ...SENT_SAMPLE[1], id: "d", status: "waiting" },
	{ ...SENT_SAMPLE[2], id: "e", status: "waiting" },
];

/** The board's received list: the short one, read and acknowledged. @public Read by the Letters dev states (S20 PR 2). */
export const RECEIVED_SAMPLE: readonly ReceivedLetter[] = [
	receivedLetter("short", { acknowledged: true }),
];

/** The warm letter, still sealed: the one waiting for you. @public Read by the Letters dev states (S20 PR 2). */
export const WAITING = receivedLetter("warm", { opened: false });

/** @public Read by the Letters dev states (S20 PR 2). */
export const STATUS_OPEN: LettersStatus = {
	optIn: "yes",
	unopenedId: null,
	writeLimit: null,
};

/**
 * What a dev build's live adapter starts with: a letter waiting, the board's sent list.
 * @public Re-exported by src/dev/letters-seed.ts, reached only through a `__DEV__` require.
 */
export const SEED = {
	optIn: "yes",
	push: true,
	received: [WAITING, ...RECEIVED_SAMPLE],
	sent: SENT_SAMPLE,
	written: { count: 0, day: "" },
} satisfies LettersMemory;
