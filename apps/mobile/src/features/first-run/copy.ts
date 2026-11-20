export type StoryWord = { t: string; k: number; br: boolean };

type Line = readonly (string | readonly [string, number])[];

const words = (lines: readonly Line[]): StoryWord[] =>
	lines.flatMap((line, li) =>
		line.map((x, wi) => ({
			br: wi === line.length - 1 && li < lines.length - 1,
			k: typeof x === "string" ? -1 : x[1],
			t: typeof x === "string" ? x : x[0],
		}))
	);

export const MOOD_WORDS = [
	"heavy",
	"anxious",
	"numb",
	"restless",
	"confused",
	"overwhelmed",
	"uncertain",
	"lost",
] as const;

export const PROMISE = {
	body: "What you share here is private. No one sees it. No one judges it. It’s yours.",
	breakAfter: 3,
	cta: "I’d like that",
	haveAccount: "I already have an account",
	lines: [
		["What you share here is private.", ""],
		["No one sees it. No one judges it.", ""],
		["It’s ", "yours."],
	] as const,
	moods: (list: readonly string[]) => `Moods: ${list.join(", ")}`,
	named: "is welcome here.",
	title: "This is a space to be honest.",
	words: ["This", "is", "a", "space", "to", "be", "honest."] as const,
} as const;

export type BeatId = "dusk" | "mirror" | "vent" | "proof" | "xolacers" | "plus";

export type Beat = {
	id: BeatId;
	label: string;
	words: StoryWord[];
	aside: string;
	tag?: string;
	ms: number;
};

export const BEATS: readonly Beat[] = [
	{
		aside:
			"Low light, not a spotlight. Voices before faces. A fire nobody owns.",
		id: "dusk",
		label: "Xolace",
		ms: 4600,
		words: words([
			["A", "campfire", "for"],
			["what", "you", ["can’t", 0]],
			[
				["say", 1],
				["out", 1],
				["loud.", 1],
			],
		]),
	},
	{
		aside:
			"Type it or say it. The Mirror reads it back - the feeling, named, in your own words. Not advice, not a diagnosis.",
		id: "mirror",
		label: "The Mirror",
		ms: 5600,
		words: words([
			["Some", "days", "you"],
			["need", "to", "know", "what"],
			["you’re", ["feeling.", 0]],
		]),
	},
	{
		aside:
			"Sit with the fire alone and say it. Nothing is stored, nothing answers back. It goes when you close it.",
		id: "vent",
		label: "Vent",
		ms: 5600,
		tag: "Either one · any time",
		words: words([
			["Other", "days", "you"],
			["just", "need", "to"],
			[
				["get", 0],
				["it", 0],
				["out.", 0],
			],
		]),
	},
	{
		aside: "",
		id: "proof",
		label: "This week",
		ms: 8000,
		words: words([
			["You’re", "not", "the"],
			[["only", 0], ["one", 0], "out", "here."],
		]),
	},
	{
		aside:
			"Real volunteers with names, faces, and a thing they’re good at listening to. You choose who. You stay anonymous.",
		id: "xolacers",
		label: "Xolacers",
		ms: 7600,
		tag: "Trained peers · not therapists",
		words: words([
			["Talk", "to", "a", ["real", 0]],
			[["person.", 0], "They", "have"],
			[
				["a", 1],
				["name.", 1],
				["You", 2],
				["don’t.", 2],
			],
		]),
	},
	{
		aside:
			"Xolace+ reads across everything you’ve written - the words you keep leaning on, what keeps circling back, what’s easing.",
		id: "plus",
		label: "Xolace+",
		ms: 7800,
		words: words([
			["You", "can’t", "see"],
			["your", "own", ["pattern", 0]],
			["from", "inside", "it."],
		]),
	},
];

export const STORY = {
	count: 22,
	countCaption: [
		"people sat by the fire this week.",
		"Each one alone, none of them the only one.",
	] as const,
	mirrorLabel: "The Mirror",
	mirrorWords: [
		"worn down.",
		"unheard.",
		"on edge.",
		"a little lighter.",
	] as const,
	plus: {
		header: "Six weeks, from far enough away",
		hint: "Drag down to step back",
	},
	position: (n: number, of: number, label: string) => `${n} of ${of}. ${label}`,
	quote: "“I don’t really need a lot of words to express myself.”",
	quoteBy: "RosieeeBD · a review on the App Store",
	seatButton: "Pull up a seat",
	vent: {
		gone: "Gone. Nothing kept.",
		held: "Let it out…",
		rest: "Hold to let it out",
	},
	xolacersHint: "Swipe to meet another",
	xolacersTopics: "Good at listening to",
	you: { sub: "No name.\nNo face.", title: "You" },
} as const;

export const XOLACERS = [
	{
		name: "Ama",
		since: "Xolacer · 2 years",
		topics: ["exams", "family pressure", "feeling behind"],
		when: "Usually around in the evenings",
	},
	{
		name: "Tobi",
		since: "Xolacer · 8 months",
		topics: ["breakups", "loneliness", "a new city"],
		when: "Usually around late at night",
	},
	{
		name: "Noor",
		since: "Xolacer · 1 year",
		topics: ["grief", "caring for someone", "anxious nights"],
		when: "Usually around at weekends",
	},
] as const;

export const xolacerLabel = (x: (typeof XOLACERS)[number]) =>
	`${x.name}, ${x.since}. ${STORY.xolacersTopics} ${x.topics.join(", ")}. ${x.when}.`;

export const PATTERN = {
	noise: [
		[58, 44, "mum"],
		[124, 66, "rent"],
		[150, 252, "the bus"],
		[286, 206, "exam"],
		[56, 236, "rain"],
		[240, 248, "phone"],
		[196, 138, "coffee"],
		[92, 170, "group chat"],
		[270, 156, "late shift"],
	] as const,
	notes: [
		{ a: "Leaning on", b: "tired", x: 22, y: 118 },
		{ a: "Circling back", b: "Sunday nights", x: 176, y: 198 },
		{ a: "Easing", b: "sleep", x: 232, y: 36 },
	] as const,
	signal: [
		[6, 14, "tired"],
		[20, 22, "so tired"],
		[33, 30, "Sunday again"],
		[46, 33, "Sunday night"],
		[59, 28, "can’t sleep"],
		[73, 18, "slept ok"],
		[88, 9, "slept well"],
	] as const,
} as const;

export const SEAT = {
	apple: "Continue with Apple",
	back: "Back to the story",
	fluxLabel: "Flux at the campfire",
	google: "Continue with Google",
	privacy: "Privacy Policy",
	seatedSub: "Flux has a question for you.",
	seatedTitle: "There’s your seat.",
	sub: "There’s a seat beside Flux. Sign in and it’s yours.",
	terms: "Terms",
	termsAfter: ".",
	termsAnd: " and ",
	termsBefore: "By continuing you agree to the ",
	title: "The fire’s already lit.",
} as const;

export const SIGN_IN_ERROR = {
	description: "Something went wrong. Try again.",
	label: (provider: "apple" | "google") =>
		`Couldn't sign in with ${provider === "apple" ? "Apple" : "Google"}`,
} as const;
