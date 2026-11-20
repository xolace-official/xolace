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

export type EndUpsell = { domain: Domain; stretchStartedAt: number };

export type NextStep = {
	slot: Omit<NextInput, "late" | "step">;
	listener: ListenerMatch;
	unlock: readonly Domain[] | null;
	upsell: EndUpsell | null;
};

const SLOT_WAIT_MS = 2000;

type SessionUnlock = { domains: Domain[]; seenAt?: number };

function useHeld<T>(live: T | null | undefined): T | null | undefined {
	const [held, setHeld] = useState<{ value: T | null } | null>(null);
	if (held === null && live !== undefined) {
		setHeld({ value: live });
	}
	return held === null ? live : held.value;
}

export function useNextStep(
	sessionId: Id<"sessions"> | null,
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
			letters: endLetterOffer(session, context, letters.offer),
			listen: false,
			listener: listener.status,
			pitchAllowed: allowed,
			plus: isPlus,
			qualifies: isResolved ? sessionId !== null && qualifies : undefined,
			unlock: unlock === undefined ? undefined : unlock !== null,
			upsell: upsell === undefined ? undefined : upsell !== null,
			waitedOut,
		},
		unlock: unlock ?? null,
		upsell: upsell ?? null,
	};
}
