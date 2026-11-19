import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { useAppStore } from "@/store/store";
import type { EndLetters } from "./session-end-data";
import { type NextInput, pitchAllowed } from "./session-end-model";
import { type ListenerMatch, useListenerMatch } from "./use-listener-match";

export type NextStep = {
	slot: Omit<NextInput, "late" | "step">;
	listener: ListenerMatch;
};

/**
 * What the next-step slot can offer this session (`nextKey`'s inputs): a
 * listener match, Xolace+, whether the session qualifies for kindling and
 * whether it has landed, letters' two cards, and whether the free pitch's cadence allows it.
 */
/** How long the slot holds for the plan and kindling answers (and a listener match). */
const SLOT_WAIT_MS = 2000;

export function useNextStep(
	sessionId: Id<"sessions"> | null,
	letters: EndLetters
): NextStep {
	const listener = useListenerMatch(sessionId);
	const [waitedOut, setWaitedOut] = useState(false);
	useEffect(() => {
		const timer = setTimeout(() => setWaitedOut(true), SLOT_WAIT_MS);
		return () => clearTimeout(timer);
	}, []);
	const { isPlus, isResolved } = usePlusEntitlement();
	const qualifies = useQuery(
		api.paths.isKindlingQualifyingSession,
		sessionId ? { sessionId } : "skip"
	);
	// Same args as Today's kindling card, so the subscription is shared and warm there.
	const active = useQuery(
		api.paths.getActive,
		sessionId && isPlus ? { withRead: true, withTry: true } : "skip"
	);
	const context = useQuery(api.plusOffers.offerContext);
	const lastDismissedAt = useAppStore(
		(s) => s.plusOfferLastDismissedAt.session_close
	);
	const dismissalCount = useAppStore((s) => s.plusOfferDismissalCount);
	const fullStopSince = useAppStore((s) => s.plusOfferFullStopAt);
	const shownSessionId = useAppStore((s) => s.plusOfferShownSessionId);

	const allowed =
		context != null &&
		pitchAllowed({
			dismissalCount,
			fullStopSince,
			lastDismissedAt,
			now: context.now,
			previousSessionId: context.previousSessionId,
			safeguardActive: context.safeguardActive,
			sessionId: sessionId ?? context.sessionId,
			shownSessionId,
		});

	return {
		listener,
		slot: {
			kindlingReady: active != null && active.sessionId === sessionId,
			// The write card waits on the safeguard (in the offer context), as the pitch does.
			letters: context ? letters.offer(context.safeguardActive) : undefined,
			// No backend pick for a track yet (open question 8): the slot never offers one.
			listen: false,
			listener: listener.status,
			pitchAllowed: allowed,
			plus: isPlus,
			// Undefined holds the slot: until Xolace+ is read, the card can't be chosen.
			qualifies: isResolved ? sessionId !== null && qualifies : undefined,
			waitedOut,
		},
	};
}
