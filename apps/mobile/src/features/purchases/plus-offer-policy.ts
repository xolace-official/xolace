// Decides whether a proactive Xolace+ offer fires, for which moment and with which
// copy variant. Pure (data in, decision out) so the rules cannot drift between call
// sites. Cadence numbers from #220 §3.

/** The five ranked proactive moments (#220 §5). */
export type PlusOfferMoment = 1 | 2 | 3 | 4 | 5;

/** The three physical places the app may speak first. */
export type PlusOfferSurface =
	| "session_close"
	| "mirror_landed"
	| "profile_insight";

/** Which pitch the card speaks. `register` is a copy swap, never a trigger. */
export type PlusOfferVariant = "default" | "register";

/** A dismissal buys this surface a week of silence. */
export const PLUS_OFFER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
/** Three dismissals stop every proactive surface for a month. */
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
	/** Moments eligible this instant, most-preferred first. Empty for reactive surfaces. */
	candidates?: PlusOfferMoment[];
	/** An active safeguard/escalation flow. Hard veto, checked first (#220 rule 4). */
	safeguardActive: boolean;
	/** They tapped the locked thing themselves; never rate-limited (#220 rule 5). */
	userInitiated?: boolean;
	/** The surface asking. Cooldown is keyed by it, not by moment. */
	surface: PlusOfferSurface;
	/** Per-surface last-dismissed epoch ms. */
	lastDismissedAt?: Partial<Record<PlusOfferSurface, number>>;
	/** Lifetime proactive dismissals across all surfaces. */
	dismissalCount?: number;
	/** When the 30-day full stop started. */
	fullStopSince?: number | null;
	shownThisSession?: boolean;
	shownLastSession?: boolean;
	/** This user complained about how the mirror speaks. Swaps copy only. */
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
	// First and unconditional: the app never sells during an escalation.
	if (safeguardActive) {
		return { reason: "safeguard", show: false };
	}

	const variant: PlusOfferVariant = registerComplaint ? "register" : "default";

	// Cadence, cooldown and the full stop govern unprompted offers only.
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

	// Keyed by surface, not by moment: a "no" is a no to this place, so the next-ranked
	// moment in the same slot must not re-ask.
	const dismissedAt = lastDismissedAt[surface];
	if (dismissedAt !== undefined && now - dismissedAt < PLUS_OFFER_COOLDOWN_MS) {
		return { reason: "cooldown", show: false };
	}

	return { moment: candidates[0], show: true, variant };
}

/** Which moments a surface may raise, in rank order. One table, so it cannot drift. */
const SURFACE_MOMENTS: Record<PlusOfferSurface, PlusOfferMoment[]> = {
	mirror_landed: [2],
	profile_insight: [3],
	session_close: [1, 4, 5],
};

/** Narrows a surface's moments to those whose data condition holds, in #220 §5 rank order;
 * `choosePlusOffer` decides "may we speak". */
export function plusOfferCandidates(
	surface: PlusOfferSurface,
	conditionMet: Partial<Record<PlusOfferMoment, boolean>>
): PlusOfferMoment[] {
	return SURFACE_MOMENTS[surface].filter((m) => conditionMet[m] === true);
}

/** The surface a moment belongs to. Every moment lives at exactly one surface. */
export function plusOfferSurfaceForMoment(
	moment: PlusOfferMoment
): PlusOfferSurface {
	return (Object.keys(SURFACE_MOMENTS) as PlusOfferSurface[]).find((s) =>
		SURFACE_MOMENTS[s].includes(moment)
	)!;
}
