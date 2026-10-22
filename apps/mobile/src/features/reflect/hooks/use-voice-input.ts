import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useFocusEffect } from "expo-router";
import {
	ExpoSpeechRecognitionModule,
	useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { joinDictation } from "@/src/features/reflect/hooks/dictation-transcript";
import { yieldAudioFocus } from "@/src/lib/audio/session";

export function useVoiceInput() {
	const [isRecording, setIsRecording] = useState(false);
	const [partialTranscript, setPartialTranscript] = useState("");
	const [error, setError] = useState<string | null>(null);

	const consentStatus = useQuery(api.consent.getCurrentStatus, {
		consentType: "voice_processing",
	});
	const grantConsent = useMutation(api.consent.grant);

	// Set as start() is called, not on the 'start' event, so a blur or background
	// in between still aborts.
	const isRecordingRef = useRef(false);
	const isFocusedRef = useRef(false);
	// Segments already finalised this recording; interim results cover only the next one.
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
		// Don't clear the transcript here: stop()'s final result can land in the
		// same render batch as 'end', and clearing would drop the tail. 'start'
		// clears it instead.
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

	// Continuous recognition never ends on its own — stop it when the person
	// leaves the screen, backgrounds the app, or the hook unmounts.
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

	const startRecording = async () => {
		setError(null);
		const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
		if (!result.granted) {
			setError("Microphone permission is required for voice input.");
			return;
		}

		if (consentStatus?.status !== "granted") {
			grantConsent({
				consentLanguageVersion: "1.0",
				consentType: "voice_processing",
			}).catch(console.error);
		}

		// The person may have left while the permission prompt was up.
		if (!isFocusedRef.current || AppState.currentState === "background") {
			return;
		}

		// Recognition sets its own session, so it yields the Browse track itself.
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
	};

	// stop() delivers a final result for words still in flight, so the tail of
	// the sentence isn't lost. abort() drops them — for when the text must not
	// change any more (dismiss, submit).
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
