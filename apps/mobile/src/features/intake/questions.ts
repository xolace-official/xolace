// The intake questionnaire as data (T1 #232, T2 #233): the T1 resolution table verbatim.
// Values are the `intakeAnswerValidators` enums (`convex/lib/validators.ts`), so answers
// reach `intake.complete` untranslated. "I'd rather not say" appears only on Q2, Q3, Q4, Q6, Q8.
import { Platform } from "react-native";
import type { IntakeAnswers } from "@/store/intake-slice";

/** Cap on a multi-select question, mirrored server-side in `intake.complete`. */
export const MAX_SELECTIONS = 3;

/** The one answer that opens the series branch (Q10, Q11). */
export const SERIES_BRANCH_VALUE = "short_form_video";

export interface IntakeChoice {
	label: string;
	/** The enum value recorded. */
	value: string;
}

export interface IntakeQuestion {
	choices: readonly IntakeChoice[];
	/** A line under the question, where the question needs one. */
	description?: string;
	/** Accepts up to `MAX_SELECTIONS` answers. */
	multiple?: boolean;
	/** Answer key. Matches an `intake.complete` arg, so no mapping is needed. */
	name: keyof IntakeAnswers;
	question: string;
	/** Two-up answers. Only where every label is short enough to hold a half. */
	twoUp?: boolean;
}

const PREFER_NOT_TO_SAY: IntakeChoice = {
	label: "I'd rather not say",
	value: "prefer_not_to_say",
};

/** §1 You. Q1 (username) is its own screen; these are Q2 and Q3. */
export const SECTION_YOU: readonly IntakeQuestion[] = [
	{
		choices: [
			{ label: "Understand what I'm feeling", value: "understand_feelings" },
			{ label: "Get through a hard moment", value: "get_through_hard_moment" },
			{ label: "Feel less alone", value: "feel_less_alone" },
			{
				label: "Make this a regular part of my life",
				value: "make_it_regular",
			},
			{ label: "Just looking around", value: "just_looking" },
			PREFER_NOT_TO_SAY,
		],
		name: "intent",
		question: "What brought you to Xolace?",
	},
	{
		choices: [
			{ label: "Work", value: "work" },
			{ label: "Relationships", value: "relationships" },
			{ label: "Family", value: "family" },
			{ label: "Identity", value: "identity" },
			{ label: "Health", value: "health" },
			{ label: "Money", value: "money" },
			{ label: "Purpose", value: "purpose" },
			{ label: "A loss", value: "a_loss" },
			{ label: "A big change", value: "big_change" },
			{ label: "Can't name", value: "cant_name_yet" },
			PREFER_NOT_TO_SAY,
		],
		description: `Pick up to ${MAX_SELECTIONS}.`,
		multiple: true,
		name: "weighingOn",
		question: "What's weighing on you lately?",
		twoUp: true,
	},
];

/** §2 How you carry it. Q4 to Q7. */
export const SECTION_CARRY: readonly IntakeQuestion[] = [
	{
		choices: [
			{
				label: "I usually know what I feel and can say it",
				value: "know_and_can_say",
			},
			{
				label: "I know what I feel but can't put words to it",
				value: "know_but_no_words",
			},
			{
				label: "I can tell something's off but not what",
				value: "something_off_unclear",
			},
			{ label: "I mostly go numb or can't tell", value: "numb_or_cant_tell" },
			PREFER_NOT_TO_SAY,
		],
		name: "emotionAwareness",
		question: "How aware are you of what you feel?",
	},
	{
		choices: [
			{ label: "Let it all out at once", value: "all_at_once" },
			{ label: "Share a bit at a time", value: "bit_at_a_time" },
			{ label: "Keep it brief", value: "keep_it_brief" },
			{ label: "Depends on the day", value: "depends" },
		],
		name: "disclosureStyle",
		question: "When something's bothering you, you usually…",
	},
	{
		choices: [
			{ label: "I don't really know how", value: "dont_know_how" },
			{
				label:
					"I use calming or creative outlets (breathing, journaling, music, art, meditation)",
				value: "calming_creative",
			},
			{ label: "I distract myself", value: "distract" },
			{
				label: "I let it out (vent, cry, write it all down)",
				value: "let_it_out",
			},
			{ label: "I lean on people around me", value: "lean_on_people" },
			{
				label: "I rely on outside things (substances, meds, other)",
				value: "outside_things",
			},
			PREFER_NOT_TO_SAY,
		],
		description: `Pick up to ${MAX_SELECTIONS}.`,
		multiple: true,
		name: "copingStyle",
		question: "How do you usually cope when you're struggling?",
	},
	{
		choices: [
			{ label: "Occasionally", value: "occasionally" },
			{ label: "Frequently", value: "frequently" },
			{ label: "Every day", value: "every_day" },
			{ label: "Not sure", value: "not_sure" },
		],
		name: "supportFrequency",
		question: "How often do you feel you need support?",
		twoUp: true,
	},
];

/** §3 Finding us. Q8 to Q9, then the series branch. */
export const SECTION_FINDING: readonly IntakeQuestion[] = [
	{
		choices: [
			{ label: "Under 18", value: "under_18" },
			{ label: "18–24", value: "18_24" },
			{ label: "25–34", value: "25_34" },
			{ label: "35–44", value: "35_44" },
			{ label: "45+", value: "45_plus" },
			PREFER_NOT_TO_SAY,
		],
		name: "ageBracket",
		question: "How old are you?",
		twoUp: true,
	},
	{
		choices: [
			{ label: "A friend or family member", value: "friend_family" },
			{
				label: "A therapist, counsellor, or support worker",
				value: "professional",
			},
			{
				label:
					"Our video series, or other short-form video; TikTok, LinkedIn, Instagram",
				value: SERIES_BRANCH_VALUE,
			},
			{ label: "A social media post or account", value: "social" },
			{ label: "An online ad", value: "ad" },
			// App Review 2.3.10 rejects any mention of Google Play in the iOS binary.
			{
				label:
					Platform.OS === "ios" ? "App Store search" : "Google Play search",
				value: "store_search",
			},
			{ label: "An article, podcast, or newsletter", value: "editorial" },
			{ label: "Somewhere else", value: "other" },
		],
		name: "acquisitionSource",
		// No "prefer not to say": `other` is the out (T2, issue #233).
		question: "How did you find Xolace?",
	},
];

/** Q10, reached only from `short_form_video`. "Yes" reveals the rating inline; these plus
 * `not_seen` are `seriesSeen`'s values. */
export const SERIES_SEEN_RATINGS: readonly IntakeChoice[] = [
	{ label: "Loved it", value: "loved_it" },
	{ label: "It was okay", value: "it_was_okay" },
	{ label: "Not for me", value: "not_for_me" },
];

export const SERIES_NOT_SEEN = "not_seen";

/** Q11, always asked if the branch fired. */
export const SERIES_WANT_QUESTION = "Want the series in Xolace?";
export const SERIES_WANT_CHOICES: readonly IntakeChoice[] = [
	{ label: "Yes, put the series and new episodes here", value: "true" },
	{ label: "No", value: "false" },
];
