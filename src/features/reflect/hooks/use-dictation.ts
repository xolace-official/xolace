import { useState } from 'react';
import { usePlusEntitlement } from '@/src/features/purchases/use-plus-entitlement';
import { usePlusDictation } from '@/src/features/reflect/hooks/use-plus-dictation';
import { useVoiceInput } from '@/src/features/reflect/hooks/use-voice-input';

/**
 * Dictation for the Reflect composer, on whichever engine the person has:
 * Plus dictation (Scribe, one transcript at the end of a take, delivered to
 * `onPlusTranscript`) or on-device dictation (live `partialTranscript`). A
 * Plus take Scribe can't serve falls back to on-device (#558).
 */
export function useDictation(onPlusTranscript: (text: string) => void) {
  const { isPlus } = usePlusEntitlement();
  const onDevice = useVoiceInput();
  const plus = usePlusDictation(onPlusTranscript);
  // Whether the last mic tap fell back to on-device dictation.
  const [fellBack, setFellBack] = useState(false);
  // A take in progress keeps its engine even if the entitlement flips mid-way.
  const usingPlus = (isPlus && !fellBack) || plus.view.phase !== 'idle';

  return {
    isRecording: usingPlus ? plus.isListening : onDevice.isRecording,
    partialTranscript: onDevice.partialTranscript,
    /** Null for a free person; a Plus person's strip also carries the fallback note. */
    plusDictation: isPlus || usingPlus ? plus.view : null,
    startRecording: async () => {
      const plusTake = isPlus && (await plus.start());
      setFellBack(isPlus && !plusTake);
      if (!plusTake) await onDevice.startRecording();
    },
    stopRecording: usingPlus ? plus.stop : onDevice.stopRecording,
    abortRecording: () => {
      onDevice.abortRecording();
      plus.abort();
    },
  };
}
