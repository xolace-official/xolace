import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { playSoftPress } from "@/lib/haptics";
import {
	clearNowPlaying,
	togglePlayback,
	useNowPlaying,
	useNowPlayingPlayback,
} from "@/lib/now-playing/now-playing-store";
import { useSleepTimer } from "@/lib/now-playing/sleep-timer";

type Track = NonNullable<ReturnType<typeof useNowPlayingPlayback>["track"]>;

export type MiniPlayer = {
	state: { track: Track; isPlaying: boolean; sleeping: boolean };
	actions: { open: () => void; toggle: () => void; dismiss: () => void };
};

/** What the mini player over the tabs shows and does; null while nothing is loaded. */
export function useMiniPlayer(): MiniPlayer | null {
	const np = useNowPlaying();
	const p = useNowPlayingPlayback();
	const posthog = usePostHog();
	const sleeping = useSleepTimer((t) => t.choice !== "off");
	const track = p.track;
	if (!(np && track)) {
		return null;
	}

	const open = () => {
		playSoftPress();
		router.push({
			params: {
				slug: np.slug,
				...(np.stepId && { stepId: np.stepId }),
				...(np.from && { from: np.from }),
			},
			pathname: "/player",
		});
	};
	const toggle = () => {
		playSoftPress();
		togglePlayback(p, posthog);
	};
	const dismiss = () => {
		playSoftPress();
		if (p.isPlaying) {
			p.toggle();
		}
		clearNowPlaying();
	};

	return {
		actions: { dismiss, open, toggle },
		state: { isPlaying: p.isPlaying, sleeping, track },
	};
}
