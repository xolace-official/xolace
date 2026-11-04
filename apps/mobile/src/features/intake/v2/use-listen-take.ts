import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { MicFailure } from "@/features/intake/v2/machine";
import { useVoiceInput, type VoiceStart } from "@/lib/speech/use-voice-input";

/** A take stops itself here: one answer, not a monologue. */
const MAX_TAKE_SECONDS = 120;
/** How long a stop waits for the recognizer's last words before going on without them. */
const STOP_GRACE_MS = 2000;
const SECOND_MS = 1000;

type Handlers = {
	/** The take is over: stopped, timed out, or ended by the recognizer. */
	onDone: (transcript: string) => void;
	onUnavailable: (reason: MicFailure) => void;
	/** Where the take stops itself; the intake's answer by default. */
	maxSeconds?: number;
};

/**
 * One spoken answer on the speech recognizer the Mirror's free dictation uses: no model call,
 * no recording kept. The mic permission is asked as it mounts, so only once the user taps talk.
 * Exactly one of the handlers is called, once.
 */
export function useListenTake({
	onDone,
	onUnavailable,
	maxSeconds = MAX_TAKE_SECONDS,
}: Handlers) {
	const voice = useVoiceInput();
	const [seconds, setSeconds] = useState(0);
	const [stopping, setStopping] = useState(false);
	// `start()` went out / the recognizer's `start` event arrived / a handler has been called.
	const startSent = useRef(false);
	const recognizing = useRef(false);
	const finished = useRef(false);

	const finish = (words: string) => {
		if (!finished.current) {
			finished.current = true;
			onDone(words);
		}
	};

	const giveUp = (reason: MicFailure) => {
		if (!finished.current) {
			finished.current = true;
			onUnavailable(reason);
		}
	};

	const stop = () => {
		if (stopping || finished.current) {
			return;
		}
		// Nothing heard yet: no last words to wait for.
		if (!recognizing.current) {
			voice.abortRecording();
			finish(voice.partialTranscript);
			return;
		}
		setStopping(true);
		voice.stopRecording();
	};

	const begin = useEffectEvent(() => voice.startRecording());
	const abort = useEffectEvent(() => voice.abortRecording());
	const onStartOutcome = useEffectEvent((outcome: VoiceStart) => {
		startSent.current = outcome === "started";
		if (outcome === "denied" || outcome === "unavailable") {
			giveUp(outcome);
		} else if (outcome === "left") {
			// The screen lost focus during the prompt: nothing was started, so offer typing.
			finish("");
		}
	});

	useEffect(() => {
		let live = true;
		const run = async () => {
			const outcome = await begin();
			if (live) {
				onStartOutcome(outcome);
			}
		};
		void run();
		return () => {
			live = false;
			abort();
		};
	}, []);

	// One place for how a take ends. The final words land in the same batch as `end`.
	const onRecognizer = useEffectEvent(
		(recording: boolean, error: string | null) => {
			if (recording) {
				recognizing.current = true;
				return;
			}
			// An error before `start()` went out is the permission one: the start outcome has it.
			if (error && !startSent.current) {
				return;
			}
			// A failed take keeps any words it got; one without goes to typing.
			if (error && !voice.partialTranscript.trim()) {
				giveUp("unavailable");
				return;
			}
			if (recognizing.current || error) {
				finish(voice.partialTranscript);
			}
		}
	);
	useEffect(() => {
		onRecognizer(voice.isRecording, voice.error);
	}, [voice.isRecording, voice.error]);

	const onGraceOver = useEffectEvent(() => {
		voice.abortRecording();
		finish(voice.partialTranscript);
	});
	useEffect(() => {
		if (!stopping) {
			return;
		}
		const timer = setTimeout(onGraceOver, STOP_GRACE_MS);
		return () => clearTimeout(timer);
	}, [stopping]);

	useEffect(() => {
		if (!voice.isRecording) {
			return;
		}
		const timer = setInterval(() => setSeconds((s) => s + 1), SECOND_MS);
		return () => clearInterval(timer);
	}, [voice.isRecording]);

	const onTick = useEffectEvent((elapsed: number) => {
		if (elapsed >= maxSeconds) {
			stop();
		}
	});
	useEffect(() => {
		onTick(seconds);
	}, [seconds]);

	return {
		listening: voice.isRecording,
		seconds,
		stop,
		stopping,
		transcript: voice.partialTranscript,
	};
}
