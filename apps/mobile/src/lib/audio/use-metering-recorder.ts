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

const METERING_POLL_MS = 50;

export type UseMeteringRecorderReturn = {
	startRecording: () => Promise<boolean>;
	stopRecording: () => Promise<string | null>;
	metering: SharedValue<number>;
	getDurationMs: () => number;
	getUri: () => string | null;
};

export function useMeteringRecorder(
	bitRate = 48_000
): UseMeteringRecorderReturn {
	const meteringValue = useSharedValue(0);
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

			yieldAudioFocus();
			await setAudioModeAsync({ ...AUDIO_SESSION, allowsRecording: true });
			await recorder.prepareToRecordAsync();
			recorder.record();
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
		getUri: () => recorder.uri ?? null,
		metering: meteringValue,
		startRecording,
		stopRecording,
	};
}
