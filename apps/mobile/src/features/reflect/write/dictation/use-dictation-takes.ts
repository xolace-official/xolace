import { useRef, useState } from "react";
import { toast } from "@/components/shared/toast";
import { COPY } from "../../copy";
import type { useReflectionMachine } from "../../session/use-reflection-machine";

type Machine = ReturnType<typeof useReflectionMachine>;

/**
 * Hold to speak on production's dictation: down starts a take after what's written, up keeps it,
 * a slide away cancels it and puts the words back as they were. `takeN` counts each take kept.
 */
export function useDictationTakes(m: Machine, text: string) {
	const before = useRef("");
	const cancelled = useRef(false);
	const [takeN, setTakeN] = useState(0);
	const [wasListening, setWasListening] = useState(m.isRecording);
	if (m.isRecording !== wasListening) {
		setWasListening(m.isRecording);
		if (!(m.isRecording || cancelled.current)) {
			setTakeN((n) => n + 1);
		}
	}

	return {
		cancel: () => {
			cancelled.current = true;
			m.abortRecording();
			m.dispatch({ text: before.current, type: "TEXT_CHANGE" });
			toast(COPY.write.cancelled);
		},
		start: () => {
			if (m.isRecording) {
				return;
			}
			before.current = text;
			cancelled.current = false;
			void m.startVoiceFromTyping();
		},
		stop: () => {
			if (m.isRecording) {
				void m.startVoiceFromTyping();
			}
		},
		takeN,
	};
}
