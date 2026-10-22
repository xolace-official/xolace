/**
 * Synthetic people for the talk eval (#605): a semantic profile and their
 * five most recent Understandings, as `talkPreload` would read them. Never
 * real people; real talks become fixtures only with consent (#589).
 */
import type { PastMoment } from "../../../talk/memory";

const DAY = 24 * 60 * 60 * 1000;

type Moment = Omit<PastMoment, "createdAt"> & { daysAgo: number };
export type Person = { name: string; profile: string; moments: Moment[] };

const m = (
	daysAgo: number,
	entryType: string,
	primaryEmotion: string,
	thematicTags: string[],
	userLanguageTags: string[],
	extra: Partial<Moment> = {}
): Moment => ({
	daysAgo,
	entryType,
	primaryEmotion,
	thematicTags,
	userLanguageTags,
	...extra,
});

export const PEOPLE = {
	// A recent widower in his sixties, learning to be alone.
	graham: {
		moments: [
			m(1, "talk", "grief", ["loss", "home"], ["the house is too quiet"]),
			m(5, "voice", "warmth", ["family"], ["Sunday call with Ellie"], {
				granularLabel: "tenderness",
			}),
			m(7, "open_prompt", "grief", ["loss"], ["found her reading glasses"]),
			m(12, "talk", "contentment", ["home"], ["the roses came back"]),
			m(20, "guided_entry", "guilt", ["loss"], ["should have noticed sooner"]),
		],
		name: "Graham",
		profile:
			"Retired teacher whose wife, June, died last spring. Keeps her garden going. His daughter phones on Sundays. Quiet, dry humour, doesn't like a fuss.",
	},
	// A nurse on rotating shifts, worn down, close to her sister.
	maya: {
		moments: [
			m(
				1,
				"talk",
				"exhaustion",
				["work", "sleep"],
				["running on fumes", "three nights in a row"]
			),
			m(3, "voice", "frustration", ["work"], ["nobody covers for me"], {
				granularLabel: "resentment",
			}),
			m(6, "open_prompt", "relief", ["family"], ["Leah came over"], {
				granularLabel: "comfort",
			}),
			m(
				9,
				"talk",
				"anxiety",
				["health"],
				["my chest feels tight before shifts"]
			),
			m(13, "guided_entry", "sadness", ["work"], ["lost a patient"], {
				temporalContext: "after a hard night",
			}),
		],
		name: "Maya",
		profile:
			"Works rotating night shifts as a nurse. Tends to carry other people's needs before her own. Her sister Leah is the person she calls when things pile up. Sleep and exhaustion come up often.",
	},
	// A product manager mid-breakup, sharp and self-critical.
	priya: {
		moments: [
			m(
				1,
				"voice",
				"heartbreak",
				["relationship"],
				["packed up Sam's things"],
				{ granularLabel: "grief" }
			),
			m(3, "talk", "anger", ["work"], ["took credit for my roadmap"]),
			m(6, "open_prompt", "calm", ["health"], ["the morning run helped"]),
			m(10, "talk", "shame", ["relationship"], ["I wasn't easy to love"]),
			m(16, "body_scan", "tension", ["work", "body"], ["jaw clenched all day"]),
		],
		name: "Priya",
		profile:
			"Product manager at a startup, ambitious and hard on herself. Recently ended a four-year relationship with Sam. Runs in the mornings to clear her head.",
	},
	// A new parent, sleep-deprived, a bit isolated.
	sam: {
		moments: [
			m(
				1,
				"talk",
				"overwhelm",
				["parenting", "sleep"],
				["Ivy was up every hour"]
			),
			m(4, "voice", "love", ["parenting"], ["she laughed for the first time"], {
				granularLabel: "wonder",
			}),
			m(
				7,
				"open_prompt",
				"loneliness",
				["relationship"],
				["we're like flatmates"]
			),
			m(11, "talk", "ambivalence", ["work"], ["half of me wants to go back"]),
			m(18, "guided_entry", "guilt", ["parenting"], ["snapped at her"]),
		],
		name: "Sam",
		profile:
			"New parent to a four-month-old, Ivy. On parental leave and missing adult conversation. Partner works long hours. Has mixed feelings about going back to work.",
	},
	// A student between home and university, unsure about his course.
	tomas: {
		moments: [
			m(
				2,
				"open_prompt",
				"doubt",
				["study", "family"],
				["dad would be gutted"],
				{ granularLabel: "uncertainty" }
			),
			m(4, "talk", "joy", ["friends", "music"], ["the gig went so well"]),
			m(8, "voice", "anxiety", ["study"], ["failed the mock exam"]),
			m(15, "word_cloud", "loneliness", ["friends"], ["everyone's busy"]),
			m(21, "talk", "pride", ["music"], ["wrote my first song"]),
		],
		name: "Tomás",
		profile:
			"Second-year engineering student who isn't sure the course is his. Talks about his dad's expectations. Plays bass in a band with friends, which is where he feels most himself.",
	},
} satisfies Record<string, Person>;

export type PersonId = keyof typeof PEOPLE;

/** Their moments dated against the run's clock. */
export const momentsOf = (p: Person, now: number): PastMoment[] =>
	p.moments.map(({ daysAgo, ...rest }) => ({
		...rest,
		createdAt: now - daysAgo * DAY - 60 * 60 * 1000,
	}));
