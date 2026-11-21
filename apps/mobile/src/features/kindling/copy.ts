export type TintKey = "sit" | "hear" | "tell" | "try";

export type KindCopy = {
	trail: string;
	card: string;
	title: string;
	action: string;
	again: string | null;
	tint: TintKey;
};

const HEAR = {
	action: "Play",
	again: "Play again",
	card: "Something to hear",
	tint: "hear",
	trail: "To hear",
} as const;

export const KINDS = {
	audio: { ...HEAR, title: "A voice for this" },
	breathing: {
		action: "Begin",
		again: "Sit again",
		card: "A few minutes",
		tint: "sit",
		title: "Sit with this",
		trail: "A few minutes",
	},
	bridge: {
		action: "Write",
		again: "Write another",
		card: "When you’re ready",
		tint: "tell",
		title: "Tell someone you trust",
		trail: "When ready",
	},
	music: { ...HEAR, title: "Low sound for the quiet" },
	read: {
		action: "Read",
		again: "Read again",
		card: "Something to read",
		tint: "try",
		title: "A few pages for this",
		trail: "To read",
	},
	try: {
		action: "I did this",
		again: null,
		card: "Away from the app",
		tint: "try",
		title: "Something to try",
		trail: "Away from here",
	},
	xolacer: {
		action: "See who",
		again: "See who else",
		card: "When you want it",
		tint: "tell",
		title: "Someone who has been here",
		trail: "When you want",
	},
} as const satisfies Record<string, KindCopy>;

export const ANY_KIND: KindCopy = {
	action: "Open",
	again: null,
	card: "Something to try",
	tint: "try",
	title: "Something to try",
	trail: "To try",
};

const NUMBER_WORDS = [
	"none",
	"one",
	"two",
	"three",
	"four",
	"five",
	"six",
] as const;
const word = (n: number) => NUMBER_WORDS[n] ?? String(n);

export const COPY = {
	a11y: {
		announce: (n: number, total: number) => `Tended. ${n} of ${total} tended.`,
		passed: "passed by",
		stop: (
			title: string,
			eyebrow: string,
			n: number,
			total: number,
			state: string,
			suggested: boolean
		) =>
			`${title}, ${eyebrow.toLowerCase()}, ${n} of ${total}, ${state}${suggested ? ", suggested next" : ""}`,
		tended: "tended",
		waiting: "waiting",
	},
	alert: {
		body: "Anything you haven’t tended stays untended. A new one comes with your next session.",
		cancel: "Cancel",
		confirm: "Put it out",
		title: "Put this kindling out?",
	},
	all: {
		back: "Back to Today",
		body: (n: number, total: number) =>
			n === total
				? `You tended all ${word(n)}. A new kindling comes with your next session.`
				: `You tended ${word(n)}. A new kindling comes with your next session.`,
		bodyNone:
			"Nothing was tended this time. A new kindling comes with your next session.",
		eyebrowAll: "All tended",
		eyebrowNone: "That’s this one",
		eyebrowSome: "This kindling is done",
		title: "It caught.",
		titleNone: "That’s this one.",
	},
	allTended: (total: number) => `All ${total} tended`,
	back: "Back",
	browseMore: "Browse more like this",
	finding: "Finding someone",
	lastSession: "your last session",
	loading: "Setting up your kindling…",
	more: "More",
	none: "When a session leaves something to sit with, a little kindling shows up here.",
	notForMe: "Not for me",
	notForYou: "Not for you",
	offline: "You’re offline. Your kindling shows up here when you’re back.",
	passed: "Passed by",
	passedBy: (p: number) => ` · ${p} passed by`,
	passedEyebrow: (eyebrow: string) => `Passed by · ${eyebrow}`,
	progress: (n: number, total: number) => `${n} of ${total} tended`,
	putOut: "Put this kindling out",
	sub: (held: string) => `A few things to try, from what ${held} held.`,
	tended: "Tended",
	tendedEyebrow: (eyebrow: string) => `Tended · ${eyebrow}`,
	title: "Your kindling",
	toast: {
		again: "Try again in a moment.",
		mark: "Couldn’t mark that",
		notReady: "Not quite ready",
		notReadyBody: "This one is on its way.",
		putOut: "Couldn’t put it out",
		skip: "Couldn’t skip that",
	},
	undo: "Undo",
} as const;
