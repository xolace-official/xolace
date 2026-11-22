export type PlusOfferMoment = 1 | 2 | 3 | 4 | 5;

export type PlusOfferSurface =
	| "session_close"
	| "mirror_landed"
	| "profile_insight";

export type PlusOfferVariant = "default" | "register";

export const PLUS_OFFER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const PLUS_OFFER_FULL_STOP_MS = 30 * 24 * 60 * 60 * 1000;
export const PLUS_OFFER_DISMISSAL_LIMIT = 3;

export type PlusOfferDecision =
	| {
			show: false;
			reason:
				| "safeguard"
				| "full_stop"
				| "session_cap"
				| "back_to_back"
				| "cooldown"
				| "no_candidate";
	  }
	/** `moment` is null for a user-initiated surface — those have no moment id. */
	| { show: true; moment: PlusOfferMoment | null; variant: PlusOfferVariant };

export type PlusOfferInput = {
	candidates?: PlusOfferMoment[];
	safeguardActive: boolean;
	userInitiated?: boolean;
	surface: PlusOfferSurface;
	lastDismissedAt?: Partial<Record<PlusOfferSurface, number>>;
	dismissalCount?: number;
	fullStopSince?: number | null;
	shownThisSession?: boolean;
	shownLastSession?: boolean;
	registerComplaint?: boolean;
	now: number;
};

export function choosePlusOffer({
	candidates = [],
	surface,
	safeguardActive,
	userInitiated = false,
	lastDismissedAt = {},
	dismissalCount = 0,
	fullStopSince = null,
	shownThisSession = false,
	shownLastSession = false,
	registerComplaint = false,
	now,
}: PlusOfferInput): PlusOfferDecision {
	if (safeguardActive) {
		return { reason: "safeguard", show: false };
	}

	const variant: PlusOfferVariant = registerComplaint ? "register" : "default";

	if (userInitiated) {
		return { moment: null, show: true, variant };
	}

	const stopped =
		dismissalCount >= PLUS_OFFER_DISMISSAL_LIMIT &&
		fullStopSince !== null &&
		now - fullStopSince < PLUS_OFFER_FULL_STOP_MS;
	if (stopped) {
		return { reason: "full_stop", show: false };
	}

	if (shownThisSession) {
		return { reason: "session_cap", show: false };
	}
	if (shownLastSession) {
		return { reason: "back_to_back", show: false };
	}

	if (candidates.length === 0) {
		return { reason: "no_candidate", show: false };
	}

	const dismissedAt = lastDismissedAt[surface];
	if (dismissedAt !== undefined && now - dismissedAt < PLUS_OFFER_COOLDOWN_MS) {
		return { reason: "cooldown", show: false };
	}

	return { moment: candidates[0], show: true, variant };
}

const SURFACE_MOMENTS: Record<PlusOfferSurface, PlusOfferMoment[]> = {
	mirror_landed: [2],
	profile_insight: [3],
	session_close: [1, 4, 5],
};

export function plusOfferCandidates(
	surface: PlusOfferSurface,
	conditionMet: Partial<Record<PlusOfferMoment, boolean>>
): PlusOfferMoment[] {
	return SURFACE_MOMENTS[surface].filter((m) => conditionMet[m] === true);
}
