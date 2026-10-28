import { api } from "@xolace/backend/convex/_generated/api";
import { useAction } from "convex/react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { File } from "expo-file-system";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SharedValue } from "react-native-reanimated";
import { useVoiceProcessingConsent } from "@/features/consent/use-voice-processing-consent";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import {
	claimAudioSession,
	holdsAudioFocus,
	releaseAudioFocus,
} from "@/lib/audio/session";
import { useMeteringRecorder } from "@/lib/audio/use-metering-recorder";
import {
	playAffirmativePress,
	playErrorNotice,
	playSoftPress,
} from "@/lib/haptics";

export type VentState =
	| "idle"
	| "recording"
	| "processing"
	| "heard"
	| "gone"
	| "error";

// Recording ceilings keep the m4a under Convex's 1MB v.bytes() limit (mono
// 48kbps AAC ≈ 6KB/s, so ~166s is the hard limit). The daily cap is charged
// by actual duration server-side.
const FREE_MAX_VENT_DURATION_MS = 120_000;
const PLUS_MAX_VENT_DURATION_MS = 150_000;

function getMaxVentDurationMs(isPremium: boolean): number {
	return isPremium ? PLUS_MAX_VENT_DURATION_MS : FREE_MAX_VENT_DURATION_MS;
}

type VentResult = {
	words: string | null;
	audioUrl: string | null;
	isCrisis: boolean;
	capReached: boolean;
};

export type UseVentFlowReturn = {
	state: VentState;
	/** Words for on-screen display, ElevenLabs audio tags ([sighs] etc.) stripped. */
	displayWords: string | null;
	isCrisis: boolean;
	/** True when the daily cap (not a failure) is why there's no acknowledgement. */
	capReached: boolean;
	startVent: () => Promise<void>;
	stopVent: () => Promise<void>;
	// Called when the burn animation finishes; 'heard' is gated on both this and
	// the server result, so the words come as a coda after the dissolution.
	onBurnComplete: () => void;
	// Called when the 'gone' animation finishes; triggers router.back()
	onGoneComplete: () => void;
	metering: SharedValue<number>;
	isRecording: boolean;
	durationMs: number;
	// Tier-aware recording ceiling for the screen's auto-stop effect.
	maxDurationMs: number;
};

export function useVentFlow(): UseVentFlowReturn {
	const posthog = usePostHog();
	const router = useRouter();
	const { isPlus } = usePlusEntitlement();
	const maxDurationMs = getMaxVentDurationMs(isPlus);
	const busyRef = useRef(false);
	const resultRef = useRef<VentResult | "error" | null>(null);
	const burnDoneRef = useRef(false);
	// Snapshot of durationMs at stop time, for events after the recorder state clears.
	const durationAtStopRef = useRef(0);
	// Consent write started with the vent; the upload waits on it.
	const consentRef = useRef<Promise<void> | null>(null);

	const [state, setState] = useState<VentState>("idle");
	const [words, setWords] = useState<string | null>(null);
	const [audioUrl, setAudioUrl] = useState<string | null>(null);
	const [isCrisis, setIsCrisis] = useState(false);
	const [capReached, setCapReached] = useState(false);

	const { startRecording, stopRecording, metering, isRecording, durationMs } =
		useMeteringRecorder();
	const processVentAudio = useAction(api.vent.processVentAudio);
	const { ensureConsent } = useVoiceProcessingConsent();

	// TTS audio player; source swapped in via player.replace() when playback starts
	const player = useAudioPlayer(null);
	const focus = useRef(null);
	const playerStatus = useAudioPlayerStatus(player);

	// Advance out of 'processing' only when the burn has finished and the
	// server result (or its failure) is known.
	const tryAdvance = useCallback(() => {
		if (!burnDoneRef.current) {
			return;
		}
		const result = resultRef.current;
		if (result === null) {
			return;
		}

		if (result === "error" || !result.words) {
			if (result !== "error" && result.capReached) {
				setCapReached(true);
				posthog.capture("vent_cap_reached", {
					duration_ms: durationAtStopRef.current,
				});
			} else {
				posthog.capture("vent_error", {
					duration_ms: durationAtStopRef.current,
				});
			}
			setState((prev) => (prev === "processing" ? "gone" : prev));
			return;
		}
		setWords(result.words);
		setAudioUrl(result.audioUrl);
		setIsCrisis(result.isCrisis);
		posthog.capture("vent_heard", {
			duration_ms: durationAtStopRef.current,
			has_audio: !!result.audioUrl,
		});
		setState((prev) => (prev === "processing" ? "heard" : prev));
	}, [posthog]);

	// TTS plays alongside the text reveal (design spec: the coda).
	useEffect(() => {
		if (state !== "heard" || !audioUrl) {
			return;
		}
		player.replace({ uri: audioUrl });
		let cancelled = false;
		claimAudioSession(focus, () => player.pause())
			.then(() => {
				if (!cancelled && holdsAudioFocus(focus)) {
					player.play();
				}
			})
			.catch((err) => console.error("[vent-flow] TTS playback failed:", err));
		return () => {
			cancelled = true;
			releaseAudioFocus(focus);
		};
	}, [state, audioUrl, player]);

	// Advance to 'gone' once TTS finishes
	useEffect(() => {
		if (playerStatus.didJustFinish && state === "heard") {
			posthog.capture("vent_completed", {
				duration_ms: durationAtStopRef.current,
			});
			// eslint-disable-next-line react-hooks/set-state-in-effect -- syncing to expo-audio playback completion, an external-system event
			setState("gone");
		}
	}, [playerStatus.didJustFinish, state, posthog]);

	// Fallback: advance to 'gone' after 3.5s when words arrived but no audio
	useEffect(() => {
		if (state !== "heard" || audioUrl) {
			return;
		}
		const t = setTimeout(() => {
			posthog.capture("vent_completed", {
				duration_ms: durationAtStopRef.current,
			});
			setState("gone");
		}, 3500);
		return () => clearTimeout(t);
	}, [state, audioUrl, posthog]);

	const startVent = async () => {
		if (state !== "idle") {
			return;
		}

		// Haptics live here, not on the button: a denied mic permission returns
		// silently, so confirming the press there said recording when it wasn't.
		const started = await startRecording();
		if (!started) {
			playErrorNotice();
			return;
		}
		playAffirmativePress();
		// Started here so the write lands while they speak.
		const consent = ensureConsent();
		consent.catch(() => {}); // surfaced when the upload awaits it
		consentRef.current = consent;
		setState("recording");
		posthog.capture("vent_started");
	};

	const stopVent = async () => {
		if (state !== "recording" || busyRef.current) {
			return;
		}
		// Softer than the start: stopping is a release, not a commitment.
		playSoftPress();
		busyRef.current = true;
		burnDoneRef.current = false;
		resultRef.current = null;

		durationAtStopRef.current = durationMs;
		posthog.capture("vent_stopped", {
			duration_ms: durationMs,
			max_duration_reached: durationMs >= maxDurationMs,
		});

		setState("processing");
		const uri = await stopRecording();

		if (!uri) {
			// Recording failed: destruction plays anyway, then straight to gone
			resultRef.current = "error";
			busyRef.current = false;
			tryAdvance();
			return;
		}

		const run = async () => {
			// No audio reaches ElevenLabs before voice_processing consent is on record;
			// a write that failed at start gets one retry.
			await (consentRef.current?.catch(ensureConsent) ?? ensureConsent());
			// RN's fetch Blob has no arrayBuffer(), so read via expo-file-system.
			const bytes = await new File(uri).bytes();
			const audioBytes = bytes.buffer.slice(
				bytes.byteOffset,
				bytes.byteOffset + bytes.byteLength
			);

			const result = await processVentAudio({ audioBytes, durationMs });
			resultRef.current = result;
		};

		run()
			.catch((err) => {
				console.error("[vent-flow] pipeline failed:", err);
				// Destruction ritual is not contingent on AI
				resultRef.current = "error";
			})
			.finally(() => {
				busyRef.current = false;
				tryAdvance();
			});
	};

	const onBurnComplete = useCallback(() => {
		burnDoneRef.current = true;
		tryAdvance();
	}, [tryAdvance]);

	const onGoneComplete = useCallback(() => {
		router.back();
	}, [router]);

	// Audio tags like [sighs] are for the TTS voice only, never shown on screen.
	const displayWords = words
		? words
				.replace(/\[[^\]]*\]/g, " ")
				.replace(/\s+/g, " ")
				.trim() || null
		: null;

	return {
		capReached,
		displayWords,
		durationMs,
		isCrisis,
		isRecording,
		maxDurationMs,
		metering,
		onBurnComplete,
		onGoneComplete,
		startVent,
		state,
		stopVent,
	};
}
