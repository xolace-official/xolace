import { useLocalSearchParams } from "expo-router";
import { usePostHog } from "posthog-react-native";
import {
	setNowPlaying,
	togglePlayback,
	useNowPlaying,
	useNowPlayingPlayback,
} from "@/features/browse/now-playing/now-playing-store";
import { playStep } from "@/features/browse/now-playing/play-on-load";
import { useOpenTrack } from "@/features/browse/use-open-track";
import { HubData, type HubListen } from "@/features/lantern/hub/hub-data";
import { HubScreen } from "@/features/lantern/hub/hub-screen";

const FROM = "library-hub";

/**
 * A Lantern hub. Its listens play through Browse's one now-playing track (the mini player); the
 * two features meet here, so Lantern never imports the player. The player redesign (S10)
 * replaces this adapter.
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
	const loaded = np?.slug ?? null;
	return {
		locked,
		nowPlaying: loaded,
		open,
		play: (track) => {
			const step = playStep({
				loaded,
				locked,
				playing: p.isPlaying,
				slug: track.slug,
			});
			if (step === "paywall") {
				open(track);
			} else if (step === "resume") {
				togglePlayback(p, posthog);
			} else if (step === "load") {
				setNowPlaying({ from: FROM, slug: track.slug }, { play: true });
			}
		},
		playing: p.isPlaying,
		toggle: () => togglePlayback(p, posthog),
	};
}
