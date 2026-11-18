// Xolace+, the first look (S18; the prototype's `PLUS_FIRST_LOOK`): intake's last step. Prices,
// plan buttons and their lines come from the store (`purchases/plans.ts`), never from here.

export type RowId = "say" | "talk" | "sup" | "ste" | "you";

/** "flux" is the default voice ("Auto" in Settings); the others are Talk's named cast. */
export type VoiceId = "flux" | "sage" | "wren" | "vesper" | "ash";

type Row = {
	id: RowId;
	title: string;
	/** Under the title once the row opens; the free row never opens. */
	line: string;
	free: boolean;
	/** The open preview's fixed height, so opening is one height animation. */
	height: number;
};

export const FIRST_LOOK = {
	a11y: {
		heading: "Xolace+. Free hears you. Plus stays with you.",
		plans: "Plans",
		rings:
			"An example: Work and Studies heavier lately, Health and Rest steady, Love and Friendship easing.",
		support:
			"The feeling it named, guilt, and three ways to be with it: sit with it, a soft sound, a Xolacer.",
		table: "What’s free and what Plus adds",
		tryIt: "Try a talk with Flux",
		voices: "Flux’s voice",
	},
	continue: "Continue",
	continueFree: "Continue free",
	example: "Example",
	free: "Free",
	headline: "Free hears you.\nPlus stays with you.",
	legal: { privacy: "Privacy", restore: "Restore", terms: "Terms" },
	named: "guilt",
	pill: "Xolace+",
	plain: "Here’s what Plus adds to what you brought today.",
	plans: { annual: "Yearly", monthly: "Monthly" },
	plus: "Plus",
	rings: [
		{
			ember: true,
			icon: "briefcase",
			title: "Work & Studies",
			value: 38,
			word: "Heavier lately",
		},
		{
			ember: false,
			icon: "moon",
			title: "Health & Rest",
			value: 72,
			word: "Steady",
		},
		{
			ember: false,
			icon: "heart",
			title: "Love & Friendship",
			value: 64,
			word: "Easing",
		},
	],
	rows: [
		{
			free: true,
			height: 0,
			id: "say",
			line: "",
			title: "Say it, the Mirror names it",
		},
		{
			free: false,
			height: 112,
			id: "talk",
			line: "Flux asks, you answer, and you get underneath it before it’s named.",
			title: "Talk it through out loud",
		},
		{
			free: false,
			height: 168,
			id: "sup",
			line: "The Mirror says guilt. Then somewhere to take it, not just a word.",
			title: "Support once it’s named",
		},
		{
			free: false,
			height: 156,
			id: "ste",
			line: "Which part of life is heavier than your usual, and since when.",
			title: "See what’s building, early",
		},
		{
			free: false,
			height: 118,
			id: "you",
			line: "Its voice, and how it says things back. Tap one.",
			title: "Make Flux yours",
		},
	] as const satisfies readonly Row[],
	/** "You said <words>. Here’s what Plus adds to that." */
	said: { after: ". Here’s what Plus adds to that.", before: "You said " },
	supports: [
		{ icon: "clock", label: "Sit with it" },
		{ icon: "wave", label: "A soft sound" },
		{ icon: "person", label: "A Xolacer" },
	],
	tryIt: "Try it",
	voices: [
		{ id: "flux", name: "Flux" },
		{ id: "sage", name: "Sage" },
		{ id: "wren", name: "Wren" },
		{ id: "vesper", name: "Vesper" },
		{ id: "ash", name: "Ash" },
	] as const satisfies readonly { id: VoiceId; name: string }[],
} as const;
