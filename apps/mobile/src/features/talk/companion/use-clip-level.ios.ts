// A playing voice sample's live level, 0–1, read from the clip itself, so the voice orb
// swells with the voice.

import { type AudioPlayer, useAudioSampleListener } from "expo-audio";
import { useEffect } from "react";
import { useSharedValue, withTiming } from "react-native-reanimated";

const SAMPLE_EASE_MS = 70;
const QUIET_EASE_MS = 400;
// Speech sits low (RMS ~0.03–0.25); the root and gain lift it into 0–1.
const GAIN = 1.8;
const FLOOR = 0.2;

export function useClipLevel(player: AudioPlayer, playing: boolean) {
	const level = useSharedValue(0);

	useAudioSampleListener(player, (sample) => {
		const frames = sample.channels[0]?.frames ?? [];
		let sum = 0;
		for (const f of frames) {
			sum += f * f;
		}
		const rms = Math.sqrt(sum / Math.max(1, frames.length));
		const lifted = Math.min(1, Math.max(0, Math.sqrt(rms) * GAIN - FLOOR));
		level.set(withTiming(lifted, { duration: SAMPLE_EASE_MS }));
	});

	useEffect(() => {
		if (!playing) {
			level.set(withTiming(0, { duration: QUIET_EASE_MS }));
		}
	}, [playing, level]);

	return level;
}
