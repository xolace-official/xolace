import { api } from "@xolace/backend/convex/_generated/api";
import { useAction, useConvex, useQuery } from "convex/react";
import { File } from "expo-file-system";
import { useIsFocused } from "expo-router/react-navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { AppState } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { useVoiceProcessingConsent } from "@/features/consent/use-voice-processing-consent";
import {
	fallbackNote,
	takeFailedNote,
} from "@/features/reflect/hooks/dictation-fallback";
import { useMeteringRecorder } from "@/lib/audio/use-metering-recorder";
import { playAffirmativePress, playErrorNotice } from "@/lib/haptics";

/** One take's ceiling; the server rejects anything larger (convex/dictation/plus.ts). */
export const MAX_TAKE_MS = 180_000;
/** The waveform counts down over the last stretch of a take. */
export const COUNTDOWN_FROM_MS = 15_000;
// Mono 32kbps AAC ≈ 4KB/s → a full take is ~720KB, under Convex's 1MB v.bytes().
const DICTATION_BIT_RATE = 32_000;
// Scribe's own 30s timeout plus room for the upload; offline, an action waits
// for the socket indefinitely.
const UPLOAD_TIMEOUT_MS = 45_000;

export type PlusDictationPhase = "idle" | "listening" | "writing";

/** What the composer needs to draw a take: the waveform, countdown or "writing it down". */
export type PlusDictationView = {
	phase: PlusDictationPhase;
	metering: SharedValue<number>;
	remainingMs: number;
	/** One line on why the mic fell back to on-device, or that a take was lost. */
	note: string | null;
	/** Ends the take and writes it down — the same as tapping the mic. */
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

/**
 * Plus dictation (#557): record on device, then Scribe transcribes the take
 * server-side. The transcript goes to `onTranscript` once, at the end. The
 * recording file is deleted once the take is transcribed or abandoned.
 *
 * Never strands the person (#558): `start` declines (returns false) when the
 * daily cap is spent, the app is offline, or Scribe already failed on this
 * screen, so the caller dictates on device instead; the view's `note` says
 * why. A take that fails to transcribe leaves the composer untouched and asks
 * them to try again.
 */
export function usePlusDictation(onTranscript: (text: string) => void) {
	const [phase, setPhase] = useState<PlusDictationPhase>("idle");
	const [note, setNote] = useState<string | null>(null);
	// ponytail: once Scribe fails, on-device for the rest of this screen; retry
	// per take if Scribe outages turn out to be short blips.
	const [scribeFailed, setScribeFailed] = useState(false);
	const cappedOn = useQuery(api.dictation.plus.status)?.cappedOn ?? null;
	// Loading reads as under the cap; the server refuses an over-cap take anyway.
	const convex = useConvex();
	const { startRecording, stopRecording, metering, isRecording, durationMs } =
		useMeteringRecorder(DICTATION_BIT_RATE);
	const transcribe = useAction(api.dictation.plus.transcribe);
	const { ensureConsent } = useVoiceProcessingConsent();
	const consentRef = useRef<Promise<void> | null>(null);
	// An aborted take's recorder stop, which the next start must wait out.
	const abandonedStopRef = useRef<Promise<void> | null>(null);
	// Bumped by abort so a transcript still in flight is dropped, not appended.
	const takeRef = useRef(0);
	const phaseRef = useRef<PlusDictationPhase>("idle");
	// A start still waiting on the mic permission or recorder setup.
	const startingRef = useRef(false);
	const isFocused = useIsFocused();

	const setPhaseSynced = (next: PlusDictationPhase) => {
		phaseRef.current = next;
		setPhase(next);
	};

	/** False when this take should go to on-device dictation instead. */
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
		// Dismissed or submitted while the mic was still setting up.
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
		// Started now so the write lands while they speak; the upload waits on it.
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
		const takeMs = durationMs;
		setPhaseSynced("writing");
		const uri = await stopRecording();
		// Only a failure at Scribe sends later takes on device; a local one doesn't.
		let reachedScribe = false;
		const upload = async () => {
			if (!uri) {
				throw new Error("no recording");
			}
			// No audio reaches ElevenLabs before voice_processing consent is on record.
			await (consentRef.current?.catch(ensureConsent) ?? ensureConsent());
			const bytes = await new File(uri).bytes();
			const audioBytes = bytes.buffer.slice(
				bytes.byteOffset,
				bytes.byteOffset + bytes.byteLength
			);
			reachedScribe = true;
			return transcribe({ audioBytes, durationMs: takeMs });
		};
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

	// For when the text must not change any more (dismiss, submit).
	const abort = () => {
		setNote(null);
		// Bumped even when idle: it also cancels a start still setting up.
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

	// A full take stops itself and is transcribed — nothing is discarded. Timed
	// from the start rather than from durationMs, which still holds the last
	// take's length for a poll after the next one starts.
	useEffect(() => {
		if (phase !== "listening") {
			return;
		}
		const t = setTimeout(endTake, MAX_TAKE_MS);
		return () => clearTimeout(t);
	}, [phase]);

	// Leaving the screen or backgrounding the app ends the take but keeps what
	// was said — including a take that began after they'd already gone.
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
		// Until the recorder reports this take, durationMs is still the last one's.
		remainingMs: isRecording
			? Math.max(0, MAX_TAKE_MS - durationMs)
			: MAX_TAKE_MS,
		stop: () => void stop(),
	};

	return { abort, isListening: phase === "listening", start, stop, view };
}
