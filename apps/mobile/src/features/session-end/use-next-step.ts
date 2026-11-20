import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { useAppStore } from "@/store/store";
import type { Domain, EndLetters } from "./session-end-data";
import {
	endLetterOffer,
	type NextInput,
	pitchAllowed,
	type SafeguardFields,
} from "./session-end-model";
import { type ListenerMatch, useListenerMatch } from "./use-listener-match";

/** The insights upsell this session names (`compounding.upsell.get`), spent once it shows. */
export type EndUpsell = { domain: Domain; stretchStartedAt: number };

export type NextStep = {
	slot: Omit<NextInput, "late" | "step">;
	listener: ListenerMatch;
	/** The parts this session brought into focus, held from the first unseen read. */
	unlock: readonly Domain[] | null;
	/** Free: the heavier part to name, held from the first read (the query moves on once spent). */
	upsell: EndUpsell | null;
};

/** How long the slot holds for the plan and kindling answers (and a listener match). */
const SLOT_WAIT_MS = 2000;

type SessionUnlock = { domains: Domain[]; seenAt?: number };

/**
 * The first value a read gives, held for the visit: the unlock is marked seen and the upsell
 * spent while the screen is up, and the card must not vanish under the reader.
 */
function useHeld<T>(live: T | null | undefined): T | null | undefined {
	const [held, setHeld] = useState<{ value: T | null } | null>(null);
	if (held === null && live !== undefined) {
		setHeld({ value: live });
	}
	return held === null ? live : held.value;
}

/**
 * What the next-step slot can offer this session (`nextKey`'s inputs): a
 * listener match, Xolace+, whether the session qualifies for kindling and
 * whether it has landed, letters' two cards, an unseen unlock, the insights upsell, and whether the free pitch's cadence allows it.
 */
export function useNextStep(
	sessionId: Id<"sessions"> | null,
	/** The session doc (`sessions.getById`): undefined while it loads. */
	session:
		| (SafeguardFields & { domainUnlock?: SessionUnlock })
		| null
		| undefined,
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
	const upsellLive = useQuery(
		api.compounding.upsell.get,
		sessionId && isResolved && !isPlus ? { sessionId } : "skip"
	);
	const upsell = useHeld(
		sessionId === null || (isResolved && isPlus) ? null : upsellLive
	);
	const unlockRead =
		session === undefined
			? undefined
			: session?.domainUnlock && session.domainUnlock.seenAt === undefined
				? session.domainUnlock.domains
				: null;
	const unlock = useHeld(unlockRead);

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
			// The safeguard comes off the session too: the offer context is null for Xolace+.
			letters: endLetterOffer(session, context, letters.offer),
			// No backend pick for a track yet (open question 8): the slot never offers one.
			listen: false,
			listener: listener.status,
			pitchAllowed: allowed,
			plus: isPlus,
			// Undefined holds the slot: until Xolace+ is read, the card can't be chosen.
			qualifies: isResolved ? sessionId !== null && qualifies : undefined,
			unlock: unlock === undefined ? undefined : unlock !== null,
			// Undefined until Xolace+ is read, then while a free user's upsell is read.
			upsell: upsell === undefined ? undefined : upsell !== null,
			waitedOut,
		},
		unlock: unlock ?? null,
		upsell: upsell ?? null,
	};
}
