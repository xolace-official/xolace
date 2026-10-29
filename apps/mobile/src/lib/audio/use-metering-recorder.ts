import {
	AudioModule,
	RecordingPresets,
	setAudioModeAsync,
	useAudioRecorder,
	useAudioRecorderState,
} from "expo-audio";
import { useEffect } from "react";
import { type SharedValue, useSharedValue } from "react-native-reanimated";
import { AUDIO_SESSION, yieldAudioFocus } from "@/lib/audio/session";

export type UseMeteringRecorderReturn = {
	// Resolves true only when recording actually began (permission granted and
	// the recorder started); false on denial or any setup failure.
	startRecording: () => Promise<boolean>;
	stopRecording: () => Promise<string | null>;
	// SharedValue so animations read it on the UI thread without bridging. 0 = silence, 1 = max.
	metering: SharedValue<number>;
	isRecording: boolean;
	durationMs: number;
};

// Lower bitRate for longer takes that must still fit Convex's 1MB v.bytes().
export function useMeteringRecorder(
	bitRate = 48_000
): UseMeteringRecorderReturn {
	const meteringValue = useSharedValue(0);

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

	// 50ms polling — smooth enough for per-frame particle animation
	const recorderState = useAudioRecorderState(recorder, 50);

	// Push normalized metering into the SharedValue so Reanimated can consume
	// it on the UI thread without bridging on every frame.
	useEffect(() => {
		const raw = recorderState.metering ?? -160;
		meteringValue.set(Math.max(0, Math.min(1, (raw + 160) / 160)));
	}, [recorderState.metering, meteringValue]);

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
			return true;
		} catch (err) {
			console.error("[metering-recorder] startRecording failed:", err);
			return false;
		}
	};

	const stopRecording = async (): Promise<string | null> => {
		try {
			await recorder.stop();
			meteringValue.set(0);
			return recorder.uri ?? null;
		} catch (err) {
			console.error("[metering-recorder] stopRecording failed:", err);
			return null;
		}
	};

	return {
		durationMs: recorderState.durationMillis,
		isRecording: recorderState.isRecording,
		metering: meteringValue,
		startRecording,
		stopRecording,
	};
}
