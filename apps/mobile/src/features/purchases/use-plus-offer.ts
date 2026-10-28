import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import {
	choosePlusOffer,
	type PlusOfferMoment,
	type PlusOfferSurface,
	type PlusOfferVariant,
	plusOfferCandidates,
} from "@/features/purchases/plus-offer-policy";
import { useAppStore } from "@/store/store";

export type ActivePlusOffer = {
	moment: PlusOfferMoment;
	variant: PlusOfferVariant;
	/** Only ever a line the server derived from this user's own data. */
	observation?: string;
	/** Scopes the one-offer-per-session cap. Null when there is no session in play. */
	sessionId: string | null;
};

type Options = {
	/** The surface's own precondition. Moment 2's condition is the tap that just happened. */
	enabled?: boolean;
	/** The session in play, when the caller knows it better than the server does. */
	sessionId?: string | null;
};

/** Runs the facts through the policy and hands back a moment or nothing. Does not record it
 * shown; `PlusOfferCard` does on mount. */
export function usePlusOffer(
	surface: PlusOfferSurface,
	{ enabled = true, sessionId }: Options = {}
): ActivePlusOffer | null {
	const context = useQuery(api.plusOffers.offerContext);
	const lastDismissedAt = useAppStore((s) => s.plusOfferLastDismissedAt);
	const dismissalCount = useAppStore((s) => s.plusOfferDismissalCount);
	const fullStopSince = useAppStore((s) => s.plusOfferFullStopAt);
	const shownSessionId = useAppStore((s) => s.plusOfferShownSessionId);

	// `null` is a subscriber; `undefined` is in flight and must not be decided on.
	const activeSessionId = context ? (sessionId ?? context.sessionId) : null;

	const decision =
		context && enabled
			? choosePlusOffer({
					candidates: plusOfferCandidates(surface, {
						1: context.firstSession,
						// Moment 2 stands down in the first session: moment 1 outranks it and comes
						// later in the same session, and firing here would spend the budget.
						2: enabled && context.completedCount > 0,
						3: context.patternObservation !== null,
						4: context.gapObservation !== null,
						5: context.milestoneObservation !== null,
					}),
					dismissalCount,
					fullStopSince,
					lastDismissedAt,
					now: context.now,
					registerComplaint: context.registerComplaint,
					safeguardActive: context.safeguardActive,
					shownLastSession:
						context.previousSessionId !== null &&
						shownSessionId === context.previousSessionId,
					// Both cadence rules key off the same recorded session id.
					shownThisSession:
						activeSessionId !== null && shownSessionId === activeSessionId,
					surface,
				})
			: null;

	const observations: Partial<Record<PlusOfferMoment, string | null>> = {
		3: context?.patternObservation ?? null,
		4: context?.gapObservation ?? null,
		5: context?.milestoneObservation ?? null,
	};

	const next: ActivePlusOffer | null =
		decision?.show && decision.moment !== null
			? {
					moment: decision.moment,
					observation: observations[decision.moment] ?? undefined,
					sessionId: activeSessionId,
					variant: decision.variant,
				}
			: null;

	// Latched on first yes: the card records itself as shown on mount, which flips
	// `shownThisSession` and would otherwise retract the offer one frame later.
	const [latched, setLatched] = useState<ActivePlusOffer | null>(null);
	if (latched === null && next !== null) {
		setLatched(next);
	}

	return latched ?? next;
}
