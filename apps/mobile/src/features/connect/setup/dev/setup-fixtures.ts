import type { SetupDraft } from "../setup-model";

export const EMPTY_DRAFT: SetupDraft = {
	bio: "",
	displayName: "",
	photoUrl: undefined,
	specialties: [],
};

export const FULL_DRAFT: SetupDraft = {
	bio: "I’ve had the Sunday-night dread for years. Happy to sit with it with you, no fixing.",
	displayName: "Ama",
	photoUrl: "fixture://photo",
	specialties: ["anxiety", "sleep", "burnout"],
};

export const CAP_DRAFT: SetupDraft = {
	...FULL_DRAFT,
	specialties: [...FULL_DRAFT.specialties, "loneliness"],
};
