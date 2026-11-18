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

/**
 * A Lantern hub. Its listens play through the app's one now-playing track (the mini player); the
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
	const { open: openTrack, locked } = useOpenTrack(FROM);
	const loaded = useNowPlaying()?.slug ?? null;
	// A boolean: the hub doesn't re-render on every status tick. The full playback is read only
	// when an action needs it.
	const playing = useNowPlayingIsPlaying();

	/** Starts `track` here, whatever's loaded; false when it's the paywall's instead. */
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
			// A failed mint stays failed under the same slug: mint it afresh (playing once in),
			// keeping the sleep timer that clearing would reset.
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
		// The card itself: it plays if it isn't already, then the full player (the prototype's).
		// Locked, the paywall.
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
