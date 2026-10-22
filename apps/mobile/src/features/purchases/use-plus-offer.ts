import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  choosePlusOffer,
  plusOfferCandidates,
  type PlusOfferMoment,
  type PlusOfferSurface,
  type PlusOfferVariant,
} from "@/src/features/purchases/plus-offer-policy";
import { useAppStore } from "@/src/store/store";

export type ActivePlusOffer = {
  moment: PlusOfferMoment;
  variant: PlusOfferVariant;
  /** Only ever a line the server derived from this user's own data. */
  observation?: string;
  /** Scopes the one-offer-per-session cap. Null when there is no session in play. */
  sessionId: string | null;
};

type Options = {
  /**
   * The surface's own precondition. Moment 2 has no server-side data
   * condition — its condition is the tap that just happened — so the mirror
   * beat passes it in. Elsewhere it just holds the offer until the screen is
   * ready to carry one.
   */
  enabled?: boolean;
  /** The session in play, when the caller knows it better than the server does. */
  sessionId?: string | null;
};

/**
 * The one hook every proactive Plus moment asks. Reads the facts once, runs
 * them through the policy module, and hands back a moment or nothing.
 *
 * Deliberately does not record that the offer was shown: a decision is not an
 * appearance. The session-end slot can decide "plus" and still lose the slot
 * to a Xolacer suggestion, and marking that as shown would spend the user's
 * one-per-session budget on a card they never saw. `PlusOfferCard` records it
 * on mount instead — the moment it is actually on screen.
 */
export function usePlusOffer(
  surface: PlusOfferSurface,
  { enabled = true, sessionId }: Options = {},
): ActivePlusOffer | null {
  const context = useQuery(api.plusOffers.offerContext);
  const lastDismissedAt = useAppStore((s) => s.plusOfferLastDismissedAt);
  const dismissalCount = useAppStore((s) => s.plusOfferDismissalCount);
  const fullStopSince = useAppStore((s) => s.plusOfferFullStopAt);
  const shownSessionId = useAppStore((s) => s.plusOfferShownSessionId);

  // `null` is a subscriber — nothing to offer. `undefined` is in flight; an
  // offer that arrives late is fine, one decided on absent facts is not.
  const activeSessionId = context ? (sessionId ?? context.sessionId) : null;

  const decision =
    context && enabled
      ? choosePlusOffer({
          surface,
          candidates: plusOfferCandidates(surface, {
            1: context.firstSession,
            // Moment 2's condition is the tap the caller just handled, which
            // is what `enabled` carries. It stands down inside the user's
            // first session: moment 1 outranks it and comes later in the same
            // session, so firing here would spend the budget and moment 1 —
            // the only moment every user passes through — would never ship.
            2: enabled && context.completedCount > 0,
            3: context.patternObservation !== null,
            4: context.gapObservation !== null,
            5: context.milestoneObservation !== null,
          }),
          safeguardActive: context.safeguardActive,
          lastDismissedAt,
          dismissalCount,
          fullStopSince,
          // Both cadence rules key off the same recorded id: it is this
          // session, so the budget is spent; it is the one before, so
          // back-to-back is refused.
          shownThisSession:
            activeSessionId !== null && shownSessionId === activeSessionId,
          shownLastSession:
            context.previousSessionId !== null &&
            shownSessionId === context.previousSessionId,
          registerComplaint: context.registerComplaint,
          now: context.now,
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
          variant: decision.variant,
          observation: observations[decision.moment] ?? undefined,
          sessionId: activeSessionId,
        }
      : null;

  // Latched on first yes. The card records itself as shown the moment it
  // mounts, which immediately makes `shownThisSession` true — without this the
  // offer would take itself back one frame after making it. "May we speak" is
  // settled once, when the beat happens.
  const [latched, setLatched] = useState<ActivePlusOffer | null>(null);
  if (latched === null && next !== null) setLatched(next);

  return latched ?? next;
}
