import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useAction, useConvexAuth } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { EaseView } from "react-native-ease/uniwind";
import { PlusOfferCard } from "@/features/purchases/components/plus-offer-card";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusOffer } from "@/features/purchases/use-plus-offer";
import { chooseCloseOffer } from "@/features/session-end/close-offer-rule";
import { SuggestionCard } from "@/features/session-end/components/suggestion-card";
import { playSoftPress } from "@/lib/haptics";

/** How long the close slot waits empty for a suggestion before settling. */
const SUGGESTION_WAIT_MS = 2000;

/** Short and unhurried: the card should arrive, not announce itself. */
const CARD_HIDDEN = { opacity: 0 };
const CARD_SHOWN = { opacity: 1 };
const CARD_ARRIVAL = { duration: 320, type: "timing" as const };

type Props = {
	sessionId?: Id<"sessions">;
	/** Structural only: which session-end variant showed the offer. */
	variant: "exit" | "activity";
};

/** The one offer the close phase makes, shared by both variants. Never both
 * cards: the suggestion wins, and Plus competes for the slot rather than stacking. */
export const CloseOffer = ({ sessionId, variant }: Props) => {
	const router = useRouter();
	const posthog = usePostHog();
	// An action, not a query (#570): the session is re-embedded and nothing is
	// stored, so it is asked once. A failure is "no suggestion". Waits for
	// auth: an action fired before it won't re-run.
	const { isAuthenticated } = useConvexAuth();
	const fetchSuggestion = useAction(api.ai.xolacers.suggest.sessionSuggestion);
	const [suggestion, setSuggestion] = useState<
		| FunctionReturnType<typeof api.ai.xolacers.suggest.sessionSuggestion>
		| undefined
	>(undefined);
	useEffect(() => {
		if (!(sessionId && isAuthenticated)) {
			return;
		}
		let live = true;
		// Only fills a slot still waiting: a late result must not swap in a card.
		fetchSuggestion({ sessionId })
			.then(
				(s) => live && setSuggestion((prev) => (prev === undefined ? s : prev))
			)
			.catch(() => live && setSuggestion((prev) => prev ?? null));
		return () => {
			live = false;
		};
	}, [sessionId, isAuthenticated, fetchSuggestion]);
	const shownRef = useRef(false);
	const openPaywall = usePaywall((s) => s.open);
	// Moments 1, 4 and 5 all land here; the policy module decides which.
	const plusOffer = usePlusOffer("session_close", { sessionId });

	useEffect(() => {
		if (!suggestion || shownRef.current) {
			return;
		}
		shownRef.current = true;
		// Structural only: a user's themes must not be reconstructable from analytics.
		posthog.capture("xolacer_suggestion_shown", { variant });
	}, [suggestion, posthog, variant]);

	// Bounds the hold: an unresolved call (offline, auth not yet hydrated)
	// would otherwise hold the slot empty forever.
	useEffect(() => {
		const timer = setTimeout(
			() => setSuggestion((prev) => prev ?? null),
			SUGGESTION_WAIT_MS
		);
		return () => clearTimeout(timer);
	}, []);

	const offer = chooseCloseOffer({
		hasSession: sessionId !== undefined,
		plusOffer: plusOffer !== null,
		suggestion,
	});

	if (offer === "pending" || offer === "none") {
		return null;
	}

	if (offer === "suggestion" && suggestion) {
		return (
			// Fades in on its own: the parent group has already animated by the time
			// the call resolves, so the card would otherwise snap in and shove the
			// button below it down.
			<EaseView
				animate={CARD_SHOWN}
				className="w-full"
				initialAnimate={CARD_HIDDEN}
				transition={CARD_ARRIVAL}
			>
				<SuggestionCard
					displayName={suggestion.displayName}
					onPress={() => {
						playSoftPress();
						posthog.capture("xolacer_suggestion_opened", { variant });
						router.push({
							// The specialty rides along so the profile's escape hatch lands
							// on a roster filtered to the same thing.
							params: {
								profileId: suggestion.xolacerProfileId,
								specialty: suggestion.specialty,
							},
							pathname: "/xolacer/[profileId]",
						});
					}}
					photoUrl={suggestion.photoUrl}
					rating={suggestion.rating}
					ratingCount={suggestion.ratingCount}
					specialty={suggestion.specialty}
				/>
			</EaseView>
		);
	}

	if (offer === "plus" && plusOffer) {
		return (
			<EaseView
				animate={CARD_SHOWN}
				className="w-full"
				initialAnimate={CARD_HIDDEN}
				transition={CARD_ARRIVAL}
			>
				<PlusOfferCard
					moment={plusOffer.moment}
					observation={plusOffer.observation}
					onOpen={() => openPaywall("session_close")}
					sessionId={plusOffer.sessionId}
					variant={plusOffer.variant}
				/>
			</EaseView>
		);
	}

	return null;
};
