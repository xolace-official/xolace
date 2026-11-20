import {
	MAX_SPECIALTIES,
	SPECIALTIES,
} from "@xolace/backend/convex/lib/specialties";
import { SETUP } from "./copy";

export const BIO_MAX_LENGTH = 160;
export const NAME_MAX_LENGTH = 40;
/** The bio's count turns ember with this many characters left. */
export const BIO_WARN_AT = 20;
export { MAX_SPECIALTIES };

export type SetupDraft = {
	photoUrl?: string;
	displayName: string;
	bio: string;
	specialties: readonly string[];
};

export type StepId = "photo" | "name" | "bio" | "specialties" | "review";

type Step = {
	id: StepId;
	title: string;
	description: string;
	missing: string;
};

/** Production's steps (`steps.ts`), in order. */
export const SETUP_STEPS: readonly Step[] = [
	{
		description: "A face makes it easier for someone to reach out.",
		id: "photo",
		missing: "add a photo",
		title: "Add a photo",
	},
	{
		description: "First name or a nickname: whatever you answer to.",
		id: "name",
		missing: "add a name",
		title: "What should people call you?",
	},
	{
		description: "A line or two. What you’re here for, not a résumé.",
		id: "bio",
		missing: "write a short bio",
		title: "Say a little about you",
	},
	{
		description: "Pick up to four. People can filter the roster by these.",
		id: "specialties",
		missing: "pick what you’re here for",
		title: "What you’re here for",
	},
	{
		description: "Your real name and contact details are never shown.",
		id: "review",
		missing: "finish the steps above",
		title: "This is what people see",
	},
];

export const LAST_STEP = SETUP_STEPS.length - 1;

/** Mirrors the server's `publishProfile` gate exactly. Review always counts as done. */
export function isStepComplete(id: StepId, draft: SetupDraft): boolean {
	switch (id) {
		case "photo":
			return Boolean(draft.photoUrl);
		case "name":
			return draft.displayName.trim().length > 0;
		case "bio":
			return draft.bio.trim().length > 0 && draft.bio.length <= BIO_MAX_LENGTH;
		case "specialties":
			return draft.specialties.length > 0;
		default:
			return true;
	}
}

/** The first step between the draft and publishing, or null once it can publish. */
export function blockingStep(draft: SetupDraft): Step | null {
	return SETUP_STEPS.find((s) => !isStepComplete(s.id, draft)) ?? null;
}

/** The line under the progress: what's missing, or ready. Production's count includes Review. */
export function progressLine(draft: SetupDraft): {
	text: string;
	ready: boolean;
} {
	const blocking = blockingStep(draft);
	if (!blocking) {
		return { ready: true, text: SETUP.ready };
	}
	const done = SETUP_STEPS.filter((s) => isStepComplete(s.id, draft)).length;
	return {
		ready: false,
		text: SETUP.progress(done, SETUP_STEPS.length, blocking.missing),
	};
}

/** Where setup opens: the first unfinished step, or Review when nothing is. */
export function resumeStep(draft: SetupDraft): number {
	const blocking = blockingStep(draft);
	return blocking ? SETUP_STEPS.indexOf(blocking) : LAST_STEP;
}

/** Picks or unpicks one; past the cap a new pick is ignored (the server holds the same cap). */
export function toggleSpecialty(
	picked: readonly string[],
	slug: string
): readonly string[] {
	if (picked.includes(slug)) {
		return picked.filter((s) => s !== slug);
	}
	return picked.length >= MAX_SPECIALTIES ? picked : [...picked, slug];
}

/** The short chip label people see on the roster, for a slug. */
export function chipLabel(slug: string): string {
	return SPECIALTIES.find((s) => s.slug === slug)?.label ?? slug;
}

/** The bio's count, and whether it's close enough to the limit to warn. */
export function bioCount(bio: string): { text: string; warn: boolean } {
	const n = bio.length;
	return {
		text: `${n} / ${BIO_MAX_LENGTH}`,
		warn: BIO_MAX_LENGTH - n <= BIO_WARN_AT,
	};
}
