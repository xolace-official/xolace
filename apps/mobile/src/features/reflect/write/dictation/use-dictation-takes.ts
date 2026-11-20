import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/shared/toast";
import { COPY } from "../../copy";
import { reportFailure } from "../../session/report-failure";
import type { useReflectionMachine } from "../../session/use-reflection-machine";

type Machine = ReturnType<typeof useReflectionMachine>;

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
