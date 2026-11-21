import { api } from "@xolace/backend/convex/_generated/api";
import {
	DICTATION_BIT_RATE,
	DICTATION_MAX_TAKE_MS,
} from "@xolace/backend/shared";
import { useAction, useConvex, useQuery } from "convex/react";
import { File } from "expo-file-system";
import { useIsFocused } from "expo-router/react-navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { AppState } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import {
	fallbackNote,
	takeFailedNote,
} from "@/features/reflect/write/dictation/dictation-fallback";
import { useMeteringRecorder } from "@/lib/audio/use-metering-recorder";
import { useVoiceProcessingConsent } from "@/lib/consent/use-voice-processing-consent";
import { playAffirmativePress, playErrorNotice } from "@/lib/haptics";
import { uploadWithConsent } from "./consented-upload";

// Scribe's own 30s timeout plus room for the upload; offline, an action waits
// for the socket indefinitely.
const UPLOAD_TIMEOUT_MS = 45_000;
const COUNTDOWN_TICK_MS = 1000;

export type PlusDictationPhase = "idle" | "listening" | "writing";

export type PlusDictationView = {
	phase: PlusDictationPhase;
	metering: SharedValue<number>;
	remainingMs: number;
	note: string | null;
	stop: () => void;
};

const deleteRecording = (uri: string | null) => {
	if (!uri) {
		return;
	}
	try {
		new File(uri).delete();
	} catch (err) {
		console.warn("[plus-dictation] could not delete recording:", err);
	}
};

export function usePlusDictation(onTranscript: (text: string) => void) {
	const [phase, setPhase] = useState<PlusDictationPhase>("idle");
	const [note, setNote] = useState<string | null>(null);
	const [scribeFailed, setScribeFailed] = useState(false);
	const cappedOn = useQuery(api.dictation.plus.status)?.cappedOn ?? null;
	const convex = useConvex();
	const { startRecording, stopRecording, metering, getDurationMs } =
		useMeteringRecorder(DICTATION_BIT_RATE);
	const [remainingMs, setRemainingMs] = useState(DICTATION_MAX_TAKE_MS);
	const transcribe = useAction(api.dictation.plus.transcribe);
	const { ensureConsent } = useVoiceProcessingConsent();
	const consentRef = useRef<Promise<void> | null>(null);
	const abandonedStopRef = useRef<Promise<void> | null>(null);
	const takeRef = useRef(0);
	const phaseRef = useRef<PlusDictationPhase>("idle");
	const startingRef = useRef(false);
	const isFocused = useIsFocused();

	const setPhaseSynced = (next: PlusDictationPhase) => {
		phaseRef.current = next;
		setPhase(next);
	};

	const start = async (): Promise<boolean> => {
		if (phaseRef.current !== "idle" || startingRef.current) {
			return true;
		}
		const fallback = fallbackNote({
			cappedOn,
			offline: !convex.connectionState().isWebSocketConnected,
			scribeFailed,
		});
		setNote(fallback);
		if (fallback) {
			return false;
		}
		const take = takeRef.current;
		startingRef.current = true;
		await abandonedStopRef.current;
		const started = await startRecording();
		startingRef.current = false;
		if (take !== takeRef.current) {
			if (started) {
				abandonedStopRef.current = stopRecording().then(deleteRecording);
			}
			return true;
		}
		if (!started) {
			playErrorNotice();
			return true;
		}
		playAffirmativePress();
		const consent = ensureConsent();
		consent.catch(() => {});
		consentRef.current = consent;
		setPhaseSynced("listening");
		return true;
	};

	const stop = async () => {
		if (phaseRef.current !== "listening") {
			return;
		}
		const take = takeRef.current;
		const takeMs = getDurationMs();
		setPhaseSynced("writing");
		const uri = await stopRecording();
		let reachedScribe = false;
		const upload = () =>
			uploadWithConsent(uri, {
				consent: () =>
					consentRef.current?.catch(ensureConsent) ?? ensureConsent(),
				readBytes: (path) => new File(path).bytes(),
				send: (audioBytes) => {
					reachedScribe = true;
					return transcribe({ audioBytes, durationMs: takeMs });
				},
			});
		let timer: ReturnType<typeof setTimeout> | undefined;
		try {
			const text = await Promise.race([
				upload(),
				new Promise<never>((_, reject) => {
					timer = setTimeout(
						() => reject(new Error("upload timed out")),
						UPLOAD_TIMEOUT_MS
					);
				}),
			]);
			if (take !== takeRef.current) {
				return;
			}
			if (text === null) {
				throw new Error("transcription failed");
			}
			if (text) {
				onTranscript(text);
			}
		} catch (err) {
			console.error("[plus-dictation] take failed:", err);
			if (take === takeRef.current) {
				playErrorNotice();
				const { note: failedNote, scribeDown } = takeFailedNote(
					err,
					reachedScribe
				);
				if (scribeDown) {
					setScribeFailed(true);
				}
				setNote(failedNote);
			}
		} finally {
			clearTimeout(timer);
			deleteRecording(uri);
			if (take === takeRef.current) {
				setPhaseSynced("idle");
			}
		}
	};

	const abort = () => {
		setNote(null);
		takeRef.current += 1;
		if (phaseRef.current === "idle") {
			return;
		}
		if (phaseRef.current === "listening") {
			abandonedStopRef.current = stopRecording().then(deleteRecording);
		}
		setPhaseSynced("idle");
	};

	// `stop` has a try/finally, which the React Compiler won't memoize, so the
	// effects below reach it through an effect event rather than depending on it.
	const endTake = useEffectEvent(() => void stop());

	// A full take stops itself and is transcribed. Timed from the start: durationMs
	// still holds the last take's length just after the next one starts.
	useEffect(() => {
		if (phase !== "listening") {
			return;
		}
		const t = setTimeout(endTake, DICTATION_MAX_TAKE_MS);
		return () => clearTimeout(t);
	}, [phase]);

	const tickCountdown = useEffectEvent(() =>
		setRemainingMs(Math.max(0, DICTATION_MAX_TAKE_MS - getDurationMs()))
	);
	useEffect(() => {
		if (phase !== "listening") {
			return;
		}
		const t = setInterval(tickCountdown, COUNTDOWN_TICK_MS);
		return () => {
			clearInterval(t);
			setRemainingMs(DICTATION_MAX_TAKE_MS);
		};
	}, [phase]);

	useEffect(() => {
		if (!isFocused && phase === "listening") {
			endTake();
		}
	}, [isFocused, phase]);

	useEffect(() => {
		const sub = AppState.addEventListener("change", (next) => {
			// Not 'inactive': Control Center or a call banner shouldn't end a take.
			if (next === "background") {
				endTake();
			}
		});
		return () => sub.remove();
	}, []);

	const view: PlusDictationView = {
		metering,
		note,
		phase,
		remainingMs,
		stop: () => void stop(),
	};

	return { abort, isListening: phase === "listening", start, stop, view };
}
