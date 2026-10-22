import { useCallback } from "react";
import { usePostHog } from "posthog-react-native";
import { usePaywall, type PaywallSurface } from "@/src/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/src/features/purchases/use-plus-entitlement";

// Which blurred insight teaser drove the tap. Mapped onto paywall surfaces
// for funnel attribution.
export type TeaserFeature = "intensity_history" | "words_language";

const SURFACE: Record<TeaserFeature, PaywallSurface> = {
  intensity_history: "week_intensity",
  words_language: "insight_teaser",
};

/**
 * Gated-insight plumbing for the profile screen. Replaces the pre-billing
 * insight_waitlist flow: a teaser tap now records the gate hit and opens
 * the real paywall instead of a "notify me" sheet.
 */
export function useInsightGate(sessionCount: number) {
  const posthog = usePostHog();
  const { isPlus, isLoading } = usePlusEntitlement();
  const openPaywall = usePaywall((s) => s.open);

  // Stable for use in card mount effects (useEffect dep).
  const trackView = useCallback(
    (feature: TeaserFeature) => {
      posthog.capture("teaser_viewed", { feature });
    },
    [posthog],
  );

  const open = (feature: TeaserFeature) => {
    if (isLoading) return; // entitlement unresolved — don't gate a maybe-Plus user
    if (isPlus) return; // nothing locked — unlocked depth views are a follow-up
    posthog.capture("premium_gate_hit", {
      feature,
      sessionCount,
      hasData: sessionCount > 0,
    });
    openPaywall(SURFACE[feature]);
  };

  return { isPlus, isLoading, trackView, open };
}
