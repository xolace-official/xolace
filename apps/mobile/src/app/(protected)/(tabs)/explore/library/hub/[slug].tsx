import { useLocalSearchParams } from "expo-router";
import { usePostHog } from "posthog-react-native";
import {
	setNowPlaying,
	togglePlayback,
	useNowPlaying,
	useNowPlayingPlayback,
} from "@/features/browse/now-playing/now-playing-store";
import { useOpenTrack } from "@/features/browse/use-open-track";
import { HubData, type HubListen } from "@/features/lantern/hub/hub-data";
import { HubScreen } from "@/features/lantern/hub/hub-screen";

const FROM = "library-hub";

/**
 * A Lantern hub. Its listens play through Browse's one now-playing track (the mini player); the
 * two features meet here, so Lantern never imports the player.
 */
export default function LanternHubRoute() {
	const { slug } = useLocalSearchParams<{ slug: string }>();
	return (
		<HubData listen={useHubListen()} slug={slug}>
			<HubScreen />
		</HubData>
	);
}

function useHubListen(): HubListen {
	const posthog = usePostHog();
	const { open, locked } = useOpenTrack(FROM);
	const np = useNowPlaying();
	const p = useNowPlayingPlayback(np?.slug);
	return {
		locked,
		nowPlaying: np?.slug ?? null,
		open,
		play: (track) => {
			if (locked) {
				open(track);
				return;
			}
			setNowPlaying({ from: FROM, slug: track.slug }, { play: true });
		},
		playing: p.isPlaying,
		toggle: () => togglePlayback(p, posthog),
	};
}
