import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";

import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { playSoftPress } from "@/lib/haptics";
import type { BrowseFrom } from "@/lib/now-playing/now-playing-store";

export type { BrowseFrom };

export function useOpenTrack(from: BrowseFrom) {
	const posthog = usePostHog();
	const { isPlus, isLoading } = usePlusEntitlement();
	const locked = !(isLoading || isPlus);

	const open = (track: { slug: string; family: "support" | "music" }) => {
		playSoftPress();
		if (locked) {
			posthog.capture("browse_paywall_tapped", {
				family: track.family,
				from,
				slug: track.slug,
			});
			posthog.capture("browse_paywall_shown", { from, slug: track.slug });
			usePaywall.getState().open("browse");
			return;
		}
		posthog.capture("browse_track_opened", {
			family: track.family,
			from,
			slug: track.slug,
		});
		router.push({
			params: { from, slug: track.slug },
			pathname: "/player",
		});
	};

	return { locked, open };
}
