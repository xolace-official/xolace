/** The setup draft on fixtures, for its dev states and the model's tests. */
import type { SetupDraft } from "../setup-model";

export const EMPTY_DRAFT: SetupDraft = {
	bio: "",
	displayName: "",
	photoUrl: undefined,
	specialties: [],
};

/** A finished draft, as Ama would fill it. The photo is set by the dev state (a bundled image). */
export const FULL_DRAFT: SetupDraft = {
	bio: "I’ve had the Sunday-night dread for years. Happy to sit with it with you, no fixing.",
	displayName: "Ama",
	photoUrl: "fixture://photo",
	specialties: ["anxiety", "sleep", "burnout"],
};

/** The cap: four picked, the rest dimmed. */
export const CAP_DRAFT: SetupDraft = {
	...FULL_DRAFT,
	specialties: [...FULL_DRAFT.specialties, "loneliness"],
};
