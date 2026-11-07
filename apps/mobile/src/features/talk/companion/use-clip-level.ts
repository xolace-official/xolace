// Android reads a clip's samples only with RECORD_AUDIO, which a voice preview shouldn't
// ask for: the orb swells to a steady level while the sample plays instead.
// (`use-clip-level.ios.ts` reads the real level.)

import type { AudioPlayer } from "expo-audio";
import { useEffect } from "react";
import { useSharedValue, withTiming } from "react-native-reanimated";

const PLAYING_LEVEL = 0.35;
const EASE_MS = 400;

export function useClipLevel(_player: AudioPlayer, playing: boolean) {
	const level = useSharedValue(0);
	useEffect(() => {
		level.set(withTiming(playing ? PLAYING_LEVEL : 0, { duration: EASE_MS }));
	}, [playing, level]);
	return level;
}
