import {
	AudioModule,
	RecordingPresets,
	setAudioModeAsync,
	useAudioRecorder,
} from "expo-audio";
import { useEffect, useRef } from "react";
import { type SharedValue, useSharedValue } from "react-native-reanimated";
import { meteringLevel } from "@/lib/audio/metering-level";
import { AUDIO_SESSION, yieldAudioFocus } from "@/lib/audio/session";

// 50ms polling — smooth enough for per-frame particle animation
const METERING_POLL_MS = 50;

export type UseMeteringRecorderReturn = {
	// Resolves true only when recording actually began (permission granted and
	// the recorder started); false on denial or any setup failure.
	startRecording: () => Promise<boolean>;
	stopRecording: () => Promise<string | null>;
	// SharedValue so animations read it on the UI thread. 0 = silence, 1 = loud.
	metering: SharedValue<number>;
	// Read on demand: the take's length is not React state, so a recording
	// doesn't re-render its screen on every poll.
	getDurationMs: () => number;
};

// Lower bitRate for longer takes that must still fit Convex's 1MB v.bytes().
export function useMeteringRecorder(
	bitRate = 48_000
): UseMeteringRecorderReturn {
	const meteringValue = useSharedValue(0);
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Mono 48kbps AAC: voice-quality for Scribe STT while keeping a 2-minute
	// recording (~720KB) under Convex's 1MB v.bytes() limit. HIGH_QUALITY
	// (stereo 128kbps) would exceed the limit at ~60 seconds.
	const recorder = useAudioRecorder({
		...RecordingPresets.HIGH_QUALITY,
		bitRate,
		isMeteringEnabled: true,
		numberOfChannels: 1,
		sampleRate: 24_000,
	});

	const stopPolling = () => {
		if (pollRef.current) {
			clearInterval(pollRef.current);
			pollRef.current = null;
		}
	};

	useEffect(
		() => () => {
			if (pollRef.current) {
				clearInterval(pollRef.current);
			}
		},
		[]
	);

	const startRecording = async (): Promise<boolean> => {
		try {
			const { granted } = await AudioModule.requestRecordingPermissionsAsync();
			if (!granted) {
				console.warn("[metering-recorder] Microphone permission denied");
				return false;
			}

			// Recording sets its own session, so it silences any player itself.
			yieldAudioFocus();
			await setAudioModeAsync({ ...AUDIO_SESSION, allowsRecording: true });
			await recorder.prepareToRecordAsync();
			recorder.record();
			// Straight into the SharedValue, never React state: the level changes
			// on every poll and only UI-thread animations read it.
			stopPolling();
			pollRef.current = setInterval(() => {
				meteringValue.set(meteringLevel(recorder.getStatus().metering));
			}, METERING_POLL_MS);
			return true;
		} catch (err) {
			console.error("[metering-recorder] startRecording failed:", err);
			return false;
		}
	};

	const stopRecording = async (): Promise<string | null> => {
		stopPolling();
		meteringValue.set(0);
		try {
			await recorder.stop();
			return recorder.uri ?? null;
		} catch (err) {
			console.error("[metering-recorder] stopRecording failed:", err);
			return null;
		}
	};

	return {
		getDurationMs: () => recorder.getStatus().durationMillis,
		metering: meteringValue,
		startRecording,
		stopRecording,
	};
}
