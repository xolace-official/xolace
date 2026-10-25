import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useAction, useConvexAuth } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { EaseView } from "react-native-ease/uniwind";
import { PlusOfferCard } from "@/src/features/purchases/components/plus-offer-card";
import { usePaywall } from "@/src/features/purchases/use-paywall";
import { usePlusOffer } from "@/src/features/purchases/use-plus-offer";
import { chooseCloseOffer } from "@/src/features/session-end/close-offer-rule";
import { SuggestionCard } from "@/src/features/session-end/components/suggestion-card";
import { playSoftPress } from "@/src/lib/haptics";

/**
 * How long the close slot stays empty waiting for a suggestion. Long enough
 * that a normal round-trip lands inside it, short enough that a stalled call
 * doesn't cost the user their offer.
 */
const SUGGESTION_WAIT_MS = 2000;

/** Short and unhurried — the card should arrive, not announce itself. */
const CARD_HIDDEN = { opacity: 0 };
const CARD_SHOWN = { opacity: 1 };
const CARD_ARRIVAL = { duration: 320, type: "timing" as const };

type Props = {
	sessionId?: Id<"sessions">;
	/** Structural only — which session-end variant showed the offer. */
	variant: "exit" | "activity";
};

/**
 * The one offer the close phase makes, shared by both session-end variants.
 *
 * Never both cards. The suggestion wins when it fires because it is the
 * rarer offer: it has already survived a mapped theme, an intensity floor, a
 * safeguard gate, a live-conversation check and a weekly cooldown. Plus
 * competes for the same slot rather than stacking on top of it.
 */
export const CloseOffer = ({ sessionId, variant }: Props) => {
	const router = useRouter();
	const posthog = usePostHog();
	// An action, not a query (#570): the session is re-embedded to rank on
	// meaning and nothing is stored, so it is asked once rather than subscribed.
	// A failure is "no suggestion", never a broken close.
	// Waits for auth: unlike a query, an action fired before it won't re-run.
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
		// Only fills a slot still waiting: once the hold expires the answer is
		// settled, and a late result must not swap in a card after the fact.
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
	// Moments 1, 4 and 5 all land here; which one (if any) is the policy
	// module's call, not this component's.
	const plusOffer = usePlusOffer("session_close", { sessionId });

	useEffect(() => {
		if (!suggestion || shownRef.current) {
			return;
		}
		shownRef.current = true;
		// Structural only: no specialty, no session content — a user's themes must
		// not be reconstructable from the analytics store.
		posthog.capture("xolacer_suggestion_shown", { variant });
	}, [suggestion, posthog, variant]);

	// Bounds the hold. The slot stays empty while the suggestion call is in
	// flight, but an unresolved call — offline, or auth not yet hydrated —
	// would otherwise hold it empty forever and the user would be offered
	// nothing at all. Expiring settles an unresolved call as "no suggestion".
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
			// Fades in on its own. The parent group has already animated by the time
			// the call resolves, so without this the card snaps into place and
			// shoves the button below it down — at the most fragile moment of the
			// flow. Arriving is the point; a swap that pops reads as a glitch.
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
							// on a roster filtered to the same thing, not on everyone.
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
