import { useLocalSearchParams } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useOpenTrack } from "@/features/browse/use-open-track";
import {
	HubData,
	type HubListen,
	type HubTrack,
} from "@/features/lantern/hub/hub-data";
import { HubScreen } from "@/features/lantern/hub/hub-screen";
import {
	nowPlayingPlayback,
	retryNowPlaying,
	setNowPlaying,
	togglePlayback,
	useNowPlaying,
	useNowPlayingIsPlaying,
} from "@/lib/now-playing/now-playing-store";
import { mintOf, playStep } from "@/lib/now-playing/play-on-load";

const FROM = "library-hub";

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
	const { open: openTrack, locked } = useOpenTrack(FROM);
	const loaded = useNowPlaying()?.slug ?? null;
	const playing = useNowPlayingIsPlaying();

	const start = (track: HubTrack) => {
		const p = nowPlayingPlayback();
		const step = playStep({
			loaded,
			locked,
			mint: mintOf(p),
			playing: p.isPlaying,
			slug: track.slug,
		});
		if (step === "paywall") {
			return false;
		}
		if (step === "resume") {
			togglePlayback(p, posthog);
		} else if (step === "reload") {
			setNowPlaying({ from: FROM, slug: track.slug }, { play: true });
			retryNowPlaying();
		} else if (step === "load") {
			setNowPlaying({ from: FROM, slug: track.slug }, { play: true });
		}
		return true;
	};

	return {
		locked,
		nowPlaying: loaded,
		open: (track) => {
			start(track);
			openTrack(track);
		},
		play: (track) => {
			if (!start(track)) {
				openTrack(track);
			}
		},
		playing,
		toggle: () => togglePlayback(nowPlayingPlayback(), posthog),
	};
}
