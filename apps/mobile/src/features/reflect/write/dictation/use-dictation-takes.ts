import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/shared/toast";
import { COPY } from "../../copy";
import { reportFailure } from "../../session/report-failure";
import type { useReflectionMachine } from "../../session/use-reflection-machine";

type Machine = ReturnType<typeof useReflectionMachine>;

/**
 * Hold to speak on production's dictation: down starts a take after what's written, up keeps it,
 * a slide away cancels it and puts the words back as they were. `takeN` counts each take kept.
 *
 * A take starts a moment after the press (the mic permission, the recorder's setup). A finger
 * lifted before then would find nothing to stop and leave it listening, so the release is kept
 * and ends the take as soon as it begins.
 */
export function useDictationTakes(m: Machine, text: string) {
	const before = useRef("");
	const cancelled = useRef(false);
	const starting = useRef(false);
	const stopOnStart = useRef(false);
	const [takeN, setTakeN] = useState(0);
	const [wasListening, setWasListening] = useState(m.isRecording);
	if (m.isRecording !== wasListening) {
		setWasListening(m.isRecording);
		if (!(m.isRecording || cancelled.current)) {
			setTakeN((n) => n + 1);
		}
	}

	// The first mic tap's upsell takes the press: its own Not now starts the take, held or not.
	const upsellOpen = m.dictationUpsell.isOpen;
	useEffect(() => {
		if (upsellOpen) {
			stopOnStart.current = false;
		}
	}, [upsellOpen]);

	const { isRecording, startVoiceFromTyping } = m;
	useEffect(() => {
		if (!isRecording) {
			return;
		}
		starting.current = false;
		if (stopOnStart.current) {
			stopOnStart.current = false;
			// Recording now, so the toggle stops it.
			void startVoiceFromTyping();
		}
	}, [isRecording, startVoiceFromTyping]);

	return {
		cancel: () => {
			cancelled.current = true;
			stopOnStart.current = false;
			m.abortRecording();
			m.dispatch({ text: before.current, type: "TEXT_CHANGE" });
			toast(COPY.write.cancelled);
		},
		start: () => {
			if (m.isRecording || starting.current) {
				return;
			}
			before.current = text;
			cancelled.current = false;
			stopOnStart.current = false;
			starting.current = true;
			// Settled without a take (no permission, the upsell): nothing is pending any more.
			m.startVoiceFromTyping()
				.catch(reportFailure)
				.finally(() => {
					starting.current = false;
				});
		},
		stop: () => {
			if (m.isRecording) {
				void m.startVoiceFromTyping();
			} else if (starting.current) {
				stopOnStart.current = true;
			}
		},
		takeN,
	};
}
