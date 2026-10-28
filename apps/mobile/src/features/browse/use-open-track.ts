import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";

import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { playSoftPress } from "@/lib/haptics";

/** Where a browse play was reached from (docs/paths-v1.md §13). */
export type BrowseFrom =
	| "hub-new"
	| "family-list"
	| "topic"
	| "discovery-strip"
	| "twig-more-like-this"
	| "library-hub"
	| "search";

/**
 * The one tap every catalogue surface shares (row, shelf tile, Discovery
 * strip): a Plus user goes to the player, a free user gets the paywall
 * *instead of* navigating so the player never mounts for them (§9.4). While
 * the entitlement is still loading the tap behaves as unlocked; the player's
 * own gate catches a free user who slips through in that window.
 *
 * Never carries a `stepId`, so nothing opened from here can tend a twig (§9.6).
 */
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
			pathname: "/browse-player",
		});
	};

	return { locked, open };
}
