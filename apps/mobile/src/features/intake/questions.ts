import { Platform } from "react-native";
import type { IntakeAnswers } from "@/store/intake-slice";

export const MAX_SELECTIONS = 3;

export const SERIES_BRANCH_VALUE = "short_form_video";

export interface IntakeChoice {
	label: string;
	value: string;
}

export interface IntakeQuestion {
	choices: readonly IntakeChoice[];
	description?: string;
	multiple?: boolean;
	name: keyof IntakeAnswers;
	question: string;
	twoUp?: boolean;
}

const PREFER_NOT_TO_SAY: IntakeChoice = {
	label: "I'd rather not say",
	value: "prefer_not_to_say",
};

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
		question: "How did you find Xolace?",
	},
];

export const SERIES_SEEN_RATINGS: readonly IntakeChoice[] = [
	{ label: "Loved it", value: "loved_it" },
	{ label: "It was okay", value: "it_was_okay" },
	{ label: "Not for me", value: "not_for_me" },
];

export const SERIES_NOT_SEEN = "not_seen";
export const SERIES_NOT_SEEN_LABEL = "No, not yet";

export const SERIES_SEEN_QUESTION = "Have you seen the series?";

export const SERIES_WANT_QUESTION = "Want the series in Xolace?";
export const SERIES_WANT_CHOICES: readonly IntakeChoice[] = [
	{ label: "Yes, put the series and new episodes here", value: "true" },
	{ label: "No", value: "false" },
];
