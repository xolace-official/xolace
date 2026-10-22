/**
 * Proactive Plus offer cadence state — inputs to `choosePlusOffer`. Device-local
 * like every other frequency cap in this app (resets on reinstall; accepted).
 */
import {
  PLUS_OFFER_DISMISSAL_LIMIT,
  PLUS_OFFER_FULL_STOP_MS,
  type PlusOfferSurface,
} from '@/src/features/purchases/plus-offer-policy';

export type PlusOfferSlice = {
  /**
   * Last-dismissed epoch ms keyed by surface: a "no" silences the whole slot,
   * not just the moment that happened to be ranked first in it.
   */
  plusOfferLastDismissedAt: Partial<Record<PlusOfferSurface, number>>;
  /** Lifetime dismissals across all proactive surfaces. */
  plusOfferDismissalCount: number;
  /** When the 3-strike, 30-day full stop began. */
  plusOfferFullStopAt: number | null;
  /** Records a dismissal against one surface and rolls the full stop if it's the third. */
  recordPlusOfferDismissal: (surface: PlusOfferSurface) => void;
  /**
   * The session an offer was last shown in. The whole of "max one offer per
   * session" and "never two sessions in a row" rides on this one id: all three
   * trigger points write it and all three read it, so a moment that already
   * fired mid-session cannot also take the close-of-session slot.
   */
  plusOfferShownSessionId: string | null;
  recordPlusOfferShown: (sessionId: string | null) => void;
};

type SetState = (
  partial: (s: PlusOfferSlice) => Partial<PlusOfferSlice>,
) => void;

export const createPlusOfferSlice = (set: SetState): PlusOfferSlice => ({
  plusOfferLastDismissedAt: {},
  plusOfferShownSessionId: null,
  recordPlusOfferShown: (sessionId) => set(() => ({ plusOfferShownSessionId: sessionId })),
  plusOfferDismissalCount: 0,
  plusOfferFullStopAt: null,
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
        plusOfferLastDismissedAt: {
          ...s.plusOfferLastDismissedAt,
          [surface]: now,
        },
        plusOfferDismissalCount: count,
        plusOfferFullStopAt:
          count >= PLUS_OFFER_DISMISSAL_LIMIT
            ? now
            : lapsed
              ? null
              : s.plusOfferFullStopAt,
      };
    }),
});

/** Keys persisted by the app store's `partialize`. */
export const plusOfferPersistedKeys = (s: PlusOfferSlice) => ({
  plusOfferLastDismissedAt: s.plusOfferLastDismissedAt,
  plusOfferShownSessionId: s.plusOfferShownSessionId,
  plusOfferDismissalCount: s.plusOfferDismissalCount,
  plusOfferFullStopAt: s.plusOfferFullStopAt,
});
