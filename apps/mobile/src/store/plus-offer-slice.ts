import {
	PLUS_OFFER_DISMISSAL_LIMIT,
	PLUS_OFFER_FULL_STOP_MS,
	type PlusOfferSurface,
} from "@/features/purchases/plus-offer-policy";

export type PlusOfferSlice = {
	plusOfferLastDismissedAt: Partial<Record<PlusOfferSurface, number>>;
	plusOfferDismissalCount: number;
	plusOfferFullStopAt: number | null;
	recordPlusOfferDismissal: (surface: PlusOfferSurface) => void;
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

export const plusOfferPersistedKeys = (s: PlusOfferSlice) => ({
	plusOfferDismissalCount: s.plusOfferDismissalCount,
	plusOfferFullStopAt: s.plusOfferFullStopAt,
	plusOfferLastDismissedAt: s.plusOfferLastDismissedAt,
	plusOfferShownSessionId: s.plusOfferShownSessionId,
});
