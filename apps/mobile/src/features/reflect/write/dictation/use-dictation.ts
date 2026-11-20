import { useState } from "react";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { useDictationUpsell } from "@/features/reflect/write/dictation/use-dictation-upsell";
import { usePlusDictation } from "@/features/reflect/write/dictation/use-plus-dictation";
import { useVoiceInput } from "@/lib/speech/use-voice-input";

export function useDictation(
	onPlusTranscript: (text: string) => void,
	onPartial: (transcript: string) => void
) {
	const { isPlus } = usePlusEntitlement();
	const onDevice = useVoiceInput(onPartial);
	const plus = usePlusDictation(onPlusTranscript);
	const [fellBack, setFellBack] = useState(false);
	const usingPlus = (isPlus && !fellBack) || plus.view.phase !== "idle";

	const start = async (openComposer?: () => void) => {
		openComposer?.();
		const plusTake = isPlus && (await plus.start());
		setFellBack(isPlus && !plusTake);
		if (!plusTake) {
			await onDevice.startRecording();
		}
	};
	const { dictationUpsell, intercept } = useDictationUpsell(start);

	return {
		abortRecording: () => {
			onDevice.abortRecording();
			plus.abort();
		},
		dictationUpsell,
		isRecording: usingPlus ? plus.isListening : onDevice.isRecording,
		plusDictation: isPlus || usingPlus ? plus.view : null,
		startRecording: async (openComposer?: () => void) => {
			if (!intercept(openComposer)) {
				await start(openComposer);
			}
		},
		stopRecording: usingPlus ? plus.stop : onDevice.stopRecording,
	};
}
