import { usePlusEntitlement } from '@/src/features/purchases/use-plus-entitlement';
import { usePlusDictation } from '@/src/features/reflect/hooks/use-plus-dictation';
import { useVoiceInput } from '@/src/features/reflect/hooks/use-voice-input';

/**
 * Dictation for the Reflect composer, on whichever engine the person has:
 * Plus dictation (Scribe, one transcript at the end of a take, delivered to
 * `onPlusTranscript`) or on-device dictation (live `partialTranscript`).
 */
export function useDictation(onPlusTranscript: (text: string) => void) {
  const { isPlus } = usePlusEntitlement();
  const onDevice = useVoiceInput();
  const plus = usePlusDictation(onPlusTranscript);
  // A take in progress keeps its engine even if the entitlement flips mid-way.
  const usingPlus = isPlus || plus.view.phase !== 'idle';

  return {
    isRecording: usingPlus ? plus.isListening : onDevice.isRecording,
    partialTranscript: onDevice.partialTranscript,
    /** Null on the on-device engine, which draws nothing beyond the mic. */
    plusDictation: usingPlus ? plus.view : null,
    startRecording: usingPlus ? plus.start : onDevice.startRecording,
    stopRecording: usingPlus ? plus.stop : onDevice.stopRecording,
    abortRecording: () => {
      onDevice.abortRecording();
      plus.abort();
    },
  };
}
