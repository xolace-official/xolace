import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { playSoftPress } from "@/lib/haptics";
import type { BrowseFrom } from "@/lib/now-playing/now-playing-store";
import type { RailTile } from "./rail/rail-model";
import type { Today } from "./today-data";

/** Plays reached from Today keep Discovery's name, so the analytics keep their history. */
const FROM: BrowseFrom = "discovery-strip";

/**
 * Today's ways out to the catalogue, Moments and Quotes, with production's gate and
 * events: a free member's tap on a track opens the paywall (`browse`), Plus goes to the
 * player, as every catalogue surface does (Browse's `useOpenTrack`).
 */
export function useTodayActions(): Pick<
	Today["actions"],
	"openTrack" | "openExplore" | "openMoment" | "openMoments" | "openQuotes"
> {
	const posthog = usePostHog();
	const { isPlus, isLoading } = usePlusEntitlement();
	const locked = !(isLoading || isPlus);

	const openTrack = (tile: RailTile) => {
		playSoftPress();
		const track = { family: tile.family, from: FROM, slug: tile.slug };
		if (locked) {
			posthog.capture("browse_paywall_tapped", track);
			posthog.capture("browse_paywall_shown", { from: FROM, slug: tile.slug });
			usePaywall.getState().open("browse");
			return;
		}
		posthog.capture("browse_track_opened", track);
		router.push({
			params: { from: FROM, slug: tile.slug },
			pathname: "/player",
		});
	};

	return {
		openExplore: () => {
			playSoftPress();
			posthog.capture("discovery_library_strip_tapped");
			router.push("/explore");
		},
		openMoment: (id) => {
			playSoftPress();
			router.push({ params: { id }, pathname: "/moments/session/[id]" });
		},
		openMoments: () => {
			playSoftPress();
			router.push("/moments");
		},
		openQuotes: () => {
			playSoftPress();
			router.push("/quotes");
		},
		openTrack,
	};
}
