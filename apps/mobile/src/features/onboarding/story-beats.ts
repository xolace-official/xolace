// The six beats of the onboarding tale, in order. Form locked by #198, content by #200.
// Nothing here may be a number or a quote the product cannot defend.
import type { SymbolViewProps } from "expo-symbols";

export type StoryBeat = {
	id: string;
	/** Chapter marker — absent on the opening beat, which sells nothing. */
	label?: string;
	/** The narration. Second person, present tense, continues from the last beat. */
	beat: string;
	/** What it actually is, once the sentence has landed. */
	aside: string;
	symbol: SymbolViewProps["name"];
	/** ms this beat holds before auto-advancing. */
	duration: number;
	/** Every beat owns a bespoke composition (`<kind>-beat.tsx`); there is no generic fallback. */
	kind: "proof" | "cover" | "mirror" | "vent" | "xolacers" | "plus";
	/** Ember-cased footnote under the aside. Only Xolace+ carries one. */
	tag?: string;
};

export const STORY_BEATS: StoryBeat[] = [
	{
		aside:
			"Low light, not a spotlight. Voices before faces. A fire nobody owns.",
		beat: "A campfire for\nwhat you can’t\nsay out loud.",
		duration: 3400,
		id: "dusk",
		kind: "cover",
		symbol: {
			android: "local_fire_department",
			ios: "flame",
			web: "local_fire_department",
		},
	},
	// Mirror and Vent are a matched pair of alternatives, not steps: identical grammatical
	// shape, no joining words, neither references the other. The `tag` on the second closes
	// the pair. Copy that names a time of day stays time-neutral ("days", not "nights").
	{
		aside:
			"Type it or say it. The Mirror reads it back - the feeling, named, in your own words. Not advice, not a diagnosis.",
		beat: "Some days you\nneed to know what\nyou're feeling.",
		duration: 3800,
		id: "mirror",
		kind: "mirror",
		label: "The Mirror",
		symbol: { android: "auto_awesome", ios: "sparkles", web: "auto_awesome" },
	},
	{
		aside:
			"Sit with the fire alone and say it. Nothing is stored, nothing answers back. It goes when you close it.",
		beat: "Other days you\njust need to\nget it out.",
		duration: 3600,
		id: "vent",
		kind: "vent",
		label: "Vent",
		symbol: { android: "mic", ios: "mic", web: "mic" },
		tag: "Either one · any time",
	},
	{
		aside:
			"One light for each of them. A real count - never a number we made up.",
		beat: "You're not the\nonly one out here.",
		// Longest beat to read (a full review plus caption) and its choreography runs past
		// 2.4s before a word is legible; auto-advancing mid-review would undercut the slide.
		duration: 8000,
		id: "proof",
		kind: "proof",
		label: "This week",
		symbol: {
			android: "local_fire_department",
			ios: "flame",
			web: "local_fire_department",
		},
	},
	{
		aside:
			"Real volunteers with names, faces, and a thing they’re good at listening to. You choose who. You stay anonymous.",
		// Do not soften into "private" or "safe": the named asymmetry is the reassurance.
		beat: "Talk to a real\nperson. They have\na name. You don’t.",
		duration: 3800,
		id: "xolacers",
		kind: "xolacers",
		label: "Xolacers",
		symbol: { android: "group", ios: "person.2", web: "group" },
		tag: "Trained peers · not therapists",
	},
	{
		aside:
			// At this width the aside sets ~43 characters a line; over ~129 ends on an orphan.
			"Xolace+ reads across everything you’ve written - the words you keep leaning on, what keeps circling back, what’s easing.",
		// Sells one idea, the insight. No "unlock", "upgrade", "premium" or time-of-day word.
		beat: "You can't see\nyour own pattern\nfrom inside it.",
		duration: 3400,
		id: "plus",
		kind: "plus",
		label: "Xolace+",
		symbol: {
			android: "local_fire_department",
			ios: "flame.circle",
			web: "local_fire_department",
		},
		// "No hard paywall" is only sayable because the Mirror, Vent and a bridge draft a day
		// are free; Plus gates the looking back (see `use-insight-gate.ts`).
		tag: "Saying it stays free. Nobody should meet a paywall on a bad day; what Xolace+ buys you is the looking back across it.",
	},
];
