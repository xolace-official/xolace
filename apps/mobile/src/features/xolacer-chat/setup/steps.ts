export const BIO_MAX_LENGTH = 160;
export const NAME_MAX_LENGTH = 40;

export type SetupDraft = {
	photoUrl?: string;
	displayName: string;
	bio: string;
	specialties: string[];
};

export type SetupStep = {
	id: "photo" | "name" | "bio" | "specialties" | "review";
	title: string;
	description: string;
	missingLabel: string;
	isComplete: (draft: SetupDraft) => boolean;
};

/**
 * Config-driven steps: the container renders whichever body matches `id`, and
 * the progress meter + Publish button both read `isComplete` rather than
 * carrying their own copy of the rule. The gate mirrors the server's
 * `publishProfile` check exactly — displayName + bio + photoUrl + at least
 * one specialty.
 */
export const SETUP_STEPS: SetupStep[] = [
	{
		description: "A face makes it easier for someone to reach out.",
		id: "photo",
		isComplete: (draft) => Boolean(draft.photoUrl),
		missingLabel: "add a photo",
		title: "Add a photo",
	},
	{
		description: "First name or a nickname — whatever you answer to.",
		id: "name",
		isComplete: (draft) => draft.displayName.trim().length > 0,
		missingLabel: "add a name",
		title: "What should people call you?",
	},
	{
		description: "A line or two. What you're here for, not a résumé.",
		id: "bio",
		isComplete: (draft) =>
			draft.bio.trim().length > 0 && draft.bio.length <= BIO_MAX_LENGTH,
		missingLabel: "write a short bio",
		title: "Say a little about you",
	},
	{
		description: "Pick up to four. People can filter the roster by these.",
		id: "specialties",
		isComplete: (draft) => draft.specialties.length > 0,
		missingLabel: "pick what you’re here for",
		title: "What you're here for",
	},
	{
		description: "Your real name and contact details are never shown.",
		id: "review",
		isComplete: () => true,
		missingLabel: "finish the steps above",
		title: "This is what people see",
	},
];

/** The first unfinished step, or null once the profile can be published. */
export function firstIncompleteStep(draft: SetupDraft): SetupStep | null {
	return SETUP_STEPS.find((step) => !step.isComplete(draft)) ?? null;
}

export function completedCount(draft: SetupDraft): number {
	return SETUP_STEPS.filter((step) => step.isComplete(draft)).length;
}
