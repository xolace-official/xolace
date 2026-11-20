import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useRef, useState } from "react";
import { usePaywall } from "@/features/purchases/use-paywall";
import type { SteadinessScreenData } from "@/features/you/steadiness/steadiness-data";
import {
	dialOf,
	partsOf,
	type StView,
	steadinessAccess,
	type Upsell,
} from "@/features/you/steadiness/steadiness-model";
import { useInsightsView } from "@/features/you/use-insights-view";

const SURFACE = "compounding_upsell";

function useHeldUpsell(live: Upsell | null | undefined, free: boolean) {
	const [held, setHeld] = useState<Upsell | null>(null);
	if (!held && free && live) {
		setHeld(live);
	}
	return free ? held : null;
}

export function useSteadiness(): SteadinessScreenData {
	const { view: live, plus, status, now } = useInsightsView();
	const { doors, upsell: mayUpsell } = steadinessAccess(status, plus);
	const upsell = useHeldUpsell(live?.upsell, mayUpsell);
	const markShown = useMutation(api.compounding.upsell.markShown);
	const posthog = usePostHog();
	const openPaywall = usePaywall((s) => s.open);
	const spent = useRef(false);
	const view: StView | undefined = live ? { ...live, upsell } : undefined;

	return {
		actions: {
			faceInfo: () => router.push("/steadiness-face-info"),
			kindling: () => router.push("/kindling"),
			numbers: () => openPaywall("steadiness_numbers"),
			upsell: () => {
				posthog.capture("plus_upsell_tapped", { surface: SURFACE });
				openPaywall(SURFACE);
			},
			upsellSeen: () => {
				if (spent.current || !upsell) {
					return;
				}
				spent.current = true;
				markShown({
					domain: upsell.domain,
					stretchStartedAt: upsell.stretchStartedAt,
				}).catch(() => undefined);
				posthog.capture("plus_upsell_shown", { surface: SURFACE });
			},
		},
		state: view
			? {
					dial: dialOf(view, plus, now),
					doors,
					now,
					parts: partsOf(view, plus, now),
					plus,
					upsell: upsell ? { domain: upsell.domain } : null,
				}
			: undefined,
	};
}
