/** Proactive Plus offer cadence state, the inputs to `choosePlusOffer`. Device-local; resets on
 * reinstall. */
import {
	PLUS_OFFER_DISMISSAL_LIMIT,
	PLUS_OFFER_FULL_STOP_MS,
	type PlusOfferSurface,
} from "@/features/purchases/plus-offer-policy";

export type PlusOfferSlice = {
	/** Last-dismissed epoch ms keyed by surface: a "no" silences the whole slot. */
	plusOfferLastDismissedAt: Partial<Record<PlusOfferSurface, number>>;
	/** Lifetime dismissals across all proactive surfaces. */
	plusOfferDismissalCount: number;
	/** When the 3-strike, 30-day full stop began. */
	plusOfferFullStopAt: number | null;
	/** Records a dismissal against one surface and rolls the full stop if it's the third. */
	recordPlusOfferDismissal: (surface: PlusOfferSurface) => void;
	/** Session an offer was last shown in. All three trigger points read and write it, so one
	 * offer per session holds. */
	plusOfferShownSessionId: string | null;
	recordPlusOfferShown: (sessionId: string | null) => void;
};

type SetState = (
	partial: (s: PlusOfferSlice) => Partial<PlusOfferSlice>
) => void;

export const createPlusOfferSlice = (set: SetState): PlusOfferSlice => ({
	plusOfferDismissalCount: 0,
	plusOfferFullStopAt: null,
	plusOfferLastDismissedAt: {},
	plusOfferShownSessionId: null,
	recordPlusOfferDismissal: (surface) =>
		set((s) => {
			const now = Date.now();
			// A full stop that has run its course clears the slate — otherwise
			// the very next dismissal would re-trigger it off a stale count.
			const lapsed =
				s.plusOfferFullStopAt !== null &&
				now - s.plusOfferFullStopAt >= PLUS_OFFER_FULL_STOP_MS;
			const count = (lapsed ? 0 : s.plusOfferDismissalCount) + 1;
			return {
				plusOfferDismissalCount: count,
				plusOfferFullStopAt:
					count >= PLUS_OFFER_DISMISSAL_LIMIT
						? now
						: lapsed
							? null
							: s.plusOfferFullStopAt,
				plusOfferLastDismissedAt: {
					...s.plusOfferLastDismissedAt,
					[surface]: now,
				},
			};
		}),
	recordPlusOfferShown: (sessionId) =>
		set(() => ({ plusOfferShownSessionId: sessionId })),
});

/** Keys persisted by the app store's `partialize`. */
export const plusOfferPersistedKeys = (s: PlusOfferSlice) => ({
	plusOfferDismissalCount: s.plusOfferDismissalCount,
	plusOfferFullStopAt: s.plusOfferFullStopAt,
	plusOfferLastDismissedAt: s.plusOfferLastDismissedAt,
	plusOfferShownSessionId: s.plusOfferShownSessionId,
});
