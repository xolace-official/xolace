import { usePostHog } from "posthog-react-native";
import { useCallback } from "react";
import {
	type PaywallSurface,
	usePaywall,
} from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";

// Which blurred insight teaser drove the tap, mapped onto paywall surfaces.
export type TeaserFeature = "intensity_history" | "words_language";

const SURFACE: Record<TeaserFeature, PaywallSurface> = {
	intensity_history: "week_intensity",
	words_language: "insight_teaser",
};

/** Gated-insight plumbing: a teaser tap records the gate hit and opens the paywall. */
export function useInsightGate(sessionCount: number) {
	const posthog = usePostHog();
	const { isPlus, isLoading } = usePlusEntitlement();
	const openPaywall = usePaywall((s) => s.open);

	// Stable for use in card mount effects (useEffect dep).
	const trackView = useCallback(
		(feature: TeaserFeature) => {
			posthog.capture("teaser_viewed", { feature });
		},
		[posthog]
	);

	const open = (feature: TeaserFeature) => {
		if (isLoading) {
			return;
		}
		if (isPlus) {
			return;
		}
		posthog.capture("premium_gate_hit", {
			feature,
			hasData: sessionCount > 0,
			sessionCount,
		});
		openPaywall(SURFACE[feature]);
	};

	return { isLoading, isPlus, open, trackView };
}
