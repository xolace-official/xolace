import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { MicFailure } from "@/features/intake/v2/machine";
import { useVoiceInput, type VoiceStart } from "@/lib/speech/use-voice-input";

const MAX_TAKE_SECONDS = 120;
const STOP_GRACE_MS = 2000;
const SECOND_MS = 1000;

type Handlers = {
	onDone: (transcript: string) => void;
	onUnavailable: (reason: MicFailure) => void;
	maxSeconds?: number;
};

export function useListenTake({
	onDone,
	onUnavailable,
	maxSeconds = MAX_TAKE_SECONDS,
}: Handlers) {
	const voice = useVoiceInput();
	const [seconds, setSeconds] = useState(0);
	const [stopping, setStopping] = useState(false);
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

	const onRecognizer = useEffectEvent(
		(recording: boolean, error: string | null) => {
			if (recording) {
				recognizing.current = true;
				return;
			}
			if (error && !startSent.current) {
				return;
			}
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
