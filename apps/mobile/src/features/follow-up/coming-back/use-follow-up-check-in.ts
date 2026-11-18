import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import type { FollowUpParams } from "@/features/follow-up/follow-up-screen";

type Args = {
	/** Only arm once the reflect screen is focused and context has loaded. */
	active: boolean;
	/** From getFullContext: any active follow-up card for this user. */
	hasPendingFollowUp: boolean;
};

type Result = {
	/** True while a follow-up is pending or ready; suppresses ReturnWelcomeSheet. */
	blocking: boolean;
};

/**
 * Follow-up check-in on reopen: `markReturn` once per activation, then `/follow-up` per ready card.
 */
export function useFollowUpCheckIn({
	active,
	hasPendingFollowUp,
}: Args): Result {
	const router = useRouter();
	const posthog = usePostHog();
	const markReturn = useMutation(api.followUps.markReturn);
	const markShown = useMutation(api.followUps.markShown);

	// Any card `getReadyCard` returns is surfaceable now (fresh `ready`, or `shown`
	// past its re-show cooldown).
	const card = useQuery(
		api.followUps.getReadyCard,
		active && hasPendingFollowUp ? {} : "skip"
	);

	const returnedRef = useRef(false);
	useEffect(() => {
		if (!(active && hasPendingFollowUp)) {
			returnedRef.current = false;
			return;
		}
		if (returnedRef.current) {
			return;
		}
		returnedRef.current = true;
		void markReturn({});
	}, [active, hasPendingFollowUp, markReturn]);

	// Open each surfaced card once per mount. If the app dies with it open, the
	// card re-opens after its cooldown; markShown re-stamps `shownAt` so it restarts here.
	const openedRef = useRef<Id<"follow_up_cards"> | null>(null);
	useEffect(() => {
		if (!card || openedRef.current === card._id) {
			return;
		}
		openedRef.current = card._id;
		void markShown({ cardId: card._id });
		posthog.capture("follow_up_shown", {
			escalation_derived: card.escalationDerived,
			tier: card.tier,
		});
		const params: FollowUpParams = {
			cardId: card._id,
			cardText: card.cardText,
			escalation: card.escalationDerived ? "1" : undefined,
			tier: card.tier,
		};
		router.push({ params, pathname: "/follow-up" });
	}, [card, markShown, posthog, router]);

	return { blocking: active && hasPendingFollowUp };
}
