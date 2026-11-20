import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useFocusEffect } from "expo-router";
import {
	ExpoSpeechRecognitionModule,
	useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { yieldAudioFocus } from "@/lib/audio/session";
import { joinDictation } from "@/lib/speech/dictation-transcript";

export type VoiceStart = "started" | "denied" | "unavailable" | "left";

export function useVoiceInput() {
	const [isRecording, setIsRecording] = useState(false);
	const [partialTranscript, setPartialTranscript] = useState("");
	const [error, setError] = useState<string | null>(null);

	const consentStatus = useQuery(api.consent.getCurrentStatus, {
		consentType: "voice_processing",
	});
	const grantConsent = useMutation(api.consent.grant);

	const isRecordingRef = useRef(false);
	const isFocusedRef = useRef(false);
	const finalisedRef = useRef("");

	useSpeechRecognitionEvent("start", () => {
		finalisedRef.current = "";
		setPartialTranscript("");
		setIsRecording(true);
		isRecordingRef.current = true;
	});

	useSpeechRecognitionEvent("end", () => {
		setIsRecording(false);
		isRecordingRef.current = false;
	});

	useSpeechRecognitionEvent("result", (event) => {
		const text = joinDictation(
			finalisedRef.current,
			event.results[0]?.transcript ?? ""
		);
		if (event.isFinal) {
			finalisedRef.current = text;
		}
		if (text) {
			setPartialTranscript(text);
		}
	});

	useSpeechRecognitionEvent("error", (event) => {
		if (event.error !== "aborted" && event.error !== "no-speech") {
			setError(event.message ?? event.error);
		}
		setIsRecording(false);
		isRecordingRef.current = false;
	});

	useFocusEffect(
		useCallback(() => {
			isFocusedRef.current = true;
			return () => {
				isFocusedRef.current = false;
				if (isRecordingRef.current) {
					ExpoSpeechRecognitionModule.abort();
				}
			};
		}, [])
	);

	useEffect(() => {
		const sub = AppState.addEventListener("change", (state) => {
			if (state !== "active" && isRecordingRef.current) {
				ExpoSpeechRecognitionModule.abort();
			}
		});
		return () => sub.remove();
	}, []);

	const startRecording = async (): Promise<VoiceStart> => {
		setError(null);
		const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
		if (!result.granted) {
			setError("Microphone permission is required for voice input.");
			return "denied";
		}
		if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
			setError("Speech recognition isn't available on this device.");
			return "unavailable";
		}

		if (consentStatus?.status !== "granted") {
			grantConsent({
				consentLanguageVersion: "1.0",
				consentType: "voice_processing",
			}).catch(console.error);
		}

		if (!isFocusedRef.current || AppState.currentState === "background") {
			return "left";
		}

		yieldAudioFocus();
		isRecordingRef.current = true;
		ExpoSpeechRecognitionModule.start({
			addsPunctuation: Platform.OS === "ios",
			continuous: true,
			interimResults: true,
			iosTaskHint: "dictation",
			lang: "en-US",
			maxAlternatives: 1,
		});
		return "started";
	};

	// stop() delivers a final result for words still in flight; abort() drops
	// them, for when the text must not change any more.
	const stopRecording = () => {
		ExpoSpeechRecognitionModule.stop();
	};

	const abortRecording = () => {
		if (isRecordingRef.current) {
			ExpoSpeechRecognitionModule.abort();
		}
	};

	return {
		abortRecording,
		error,
		isRecording,
		partialTranscript,
		startRecording,
		stopRecording,
	};
}
