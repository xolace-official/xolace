import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { EaseView } from "react-native-ease/uniwind";
import { useAction, useConvexAuth } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { usePostHog } from "posthog-react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SuggestionCard } from "@/src/features/session-end/components/suggestion-card";
import { chooseCloseOffer } from "@/src/features/session-end/close-offer-rule";
import { PlusOfferCard } from "@/src/features/purchases/components/plus-offer-card";
import { usePlusOffer } from "@/src/features/purchases/use-plus-offer";
import { usePaywall } from "@/src/features/purchases/use-paywall";
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
const CARD_ARRIVAL = { type: "timing" as const, duration: 320 };

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
    FunctionReturnType<typeof api.ai.xolacers.suggest.sessionSuggestion> | undefined
  >(undefined);
  useEffect(() => {
    if (!sessionId || !isAuthenticated) return;
    let live = true;
    fetchSuggestion({ sessionId })
      .then((s) => live && setSuggestion(s))
      .catch(() => live && setSuggestion(null));
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
    if (!suggestion || shownRef.current) return;
    shownRef.current = true;
    // Structural only: no specialty, no session content — a user's themes must
    // not be reconstructable from the analytics store.
    posthog.capture("xolacer_suggestion_shown", { variant });
  }, [suggestion, posthog, variant]);

  // Bounds the hold. The slot stays empty while the suggestion call is in
  // flight, but an unresolved call — offline, or auth not yet hydrated —
  // would otherwise hold it empty forever and the user would be offered
  // nothing at all.
  const [waitedOut, setWaitedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setWaitedOut(true), SUGGESTION_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  const offer = chooseCloseOffer({
    hasSession: sessionId !== undefined,
    suggestion,
    waitedOut,
    plusOffer: plusOffer !== null,
  });

  if (offer === "pending" || offer === "none") return null;

  if (offer === "suggestion" && suggestion) {
    return (
      // Fades in on its own. The parent group has already animated by the time
      // the call resolves, so without this the card snaps into place and
      // shoves the button below it down — at the most fragile moment of the
      // flow. Arriving is the point; a swap that pops reads as a glitch.
      <EaseView
        initialAnimate={CARD_HIDDEN}
        animate={CARD_SHOWN}
        transition={CARD_ARRIVAL}
        className="w-full"
      >
        <SuggestionCard
          displayName={suggestion.displayName}
          photoUrl={suggestion.photoUrl}
          specialty={suggestion.specialty}
          rating={suggestion.rating}
          ratingCount={suggestion.ratingCount}
          onPress={() => {
            playSoftPress();
            posthog.capture("xolacer_suggestion_opened", { variant });
            router.push({
              pathname: "/xolacer/[profileId]",
              // The specialty rides along so the profile's escape hatch lands
              // on a roster filtered to the same thing, not on everyone.
              params: {
                profileId: suggestion.xolacerProfileId,
                specialty: suggestion.specialty,
              },
            });
          }}
        />
      </EaseView>
    );
  }

  if (offer === "plus" && plusOffer) {
    return (
      <EaseView
        initialAnimate={CARD_HIDDEN}
        animate={CARD_SHOWN}
        transition={CARD_ARRIVAL}
        className="w-full"
      >
        <PlusOfferCard
          moment={plusOffer.moment}
          variant={plusOffer.variant}
          observation={plusOffer.observation}
          sessionId={plusOffer.sessionId}
          onOpen={() => openPaywall("session_close")}
        />
      </EaseView>
    );
  }

  return null;
};
