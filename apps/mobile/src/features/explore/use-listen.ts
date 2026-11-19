import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import type { Listen } from "@/features/explore/explore-model";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { playSoftPress } from "@/lib/haptics";
import {
	type BrowseFrom,
	useNowPlaying,
	useNowPlayingIsPlaying,
} from "@/lib/now-playing/now-playing-store";
import { usePushOnce } from "@/lib/use-push-once";

/**
 * A row's tap, with production's gate and events (Browse's `useOpenTrack`): a free listener
 * gets the paywall (`browse`), Xolace+ the player. Never carries a `stepId`, so nothing opened
 * here tends a twig. Also the playing mark: which slug is loaded, and whether it plays.
 */
export function useListen(screen: BrowseFrom): Listen {
	const posthog = usePostHog();
	const pushOnce = usePushOnce();
	const { isPlus, isLoading } = usePlusEntitlement();
	const locked = !(isLoading || isPlus);
	const np = useNowPlaying();
	// A preview isn't what's playing: its cover says "Hearing a preview" instead.
	const nowPlaying = np && !np.preview ? np.slug : null;
	// A boolean snapshot: rows don't re-render on every status tick.
	const playing = useNowPlayingIsPlaying();

	const open: Listen["open"] = (track, from = screen) => {
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
		pushOnce(() =>
			router.push({ params: { from, slug: track.slug }, pathname: "/player" })
		);
	};

	return { locked, nowPlaying, open, playing };
}
