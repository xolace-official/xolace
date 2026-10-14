import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import { useAction } from 'convex/react';
import { File } from 'expo-file-system';
import type { SharedValue } from 'react-native-reanimated';
import { api } from '@/convex/_generated/api';
import { useVoiceProcessingConsent } from '@/src/features/consent/use-voice-processing-consent';
import { useMeteringRecorder } from '@/src/lib/audio/use-metering-recorder';
import { playAffirmativePress, playErrorNotice } from '@/src/lib/haptics';

/** One take's ceiling; the server rejects anything larger (convex/dictation.ts). */
export const MAX_TAKE_MS = 180_000;
/** The waveform counts down over the last stretch of a take. */
export const COUNTDOWN_FROM_MS = 15_000;
// Mono 32kbps AAC ≈ 4KB/s → a full take is ~720KB, under Convex's 1MB v.bytes().
const DICTATION_BIT_RATE = 32_000;

export type PlusDictationPhase = 'idle' | 'listening' | 'writing';

/** What the composer needs to draw a take: the waveform, countdown or "writing it down". */
export type PlusDictationView = {
  phase: PlusDictationPhase;
  metering: SharedValue<number>;
  remainingMs: number;
};

const deleteRecording = (uri: string | null) => {
  if (!uri) return;
  try {
    new File(uri).delete();
  } catch (err) {
    console.warn('[plus-dictation] could not delete recording:', err);
  }
};

/**
 * Plus dictation (#557): record on device, then Scribe transcribes the take
 * server-side. The transcript goes to `onTranscript` once, at the end. The
 * recording file is deleted once the take is transcribed or abandoned.
 */
export function usePlusDictation(onTranscript: (text: string) => void) {
  const [phase, setPhase] = useState<PlusDictationPhase>('idle');
  const { startRecording, stopRecording, metering, isRecording, durationMs } =
    useMeteringRecorder(DICTATION_BIT_RATE);
  const transcribe = useAction(api.dictation.transcribe);
  const { ensureConsent } = useVoiceProcessingConsent();
  const consentRef = useRef<Promise<void> | null>(null);
  // An aborted take's recorder stop, which the next start must wait out.
  const abandonedStopRef = useRef<Promise<void> | null>(null);
  // Bumped by abort so a transcript still in flight is dropped, not appended.
  const takeRef = useRef(0);
  const phaseRef = useRef<PlusDictationPhase>('idle');
  const isFocused = useIsFocused();

  const setPhaseSynced = (next: PlusDictationPhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const start = async () => {
    if (phaseRef.current !== 'idle') return;
    await abandonedStopRef.current;
    const started = await startRecording();
    if (!started) {
      playErrorNotice();
      return;
    }
    playAffirmativePress();
    // Started now so the write lands while they speak; the upload waits on it.
    const consent = ensureConsent();
    consent.catch(() => {});
    consentRef.current = consent;
    setPhaseSynced('listening');
  };

  const stop = async () => {
    if (phaseRef.current !== 'listening') return;
    const take = takeRef.current;
    setPhaseSynced('writing');
    const uri = await stopRecording();
    try {
      if (!uri) throw new Error('no recording');
      // No audio reaches ElevenLabs before voice_processing consent is on record.
      await (consentRef.current?.catch(ensureConsent) ?? ensureConsent());
      const bytes = await new File(uri).bytes();
      const audioBytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const text = await transcribe({ audioBytes });
      if (take !== takeRef.current) return;
      if (text === null) throw new Error('transcription failed');
      if (text) onTranscript(text);
    } catch (err) {
      console.error('[plus-dictation] take failed:', err);
      if (take === takeRef.current) playErrorNotice();
    } finally {
      deleteRecording(uri);
      if (take === takeRef.current) setPhaseSynced('idle');
    }
  };

  // For when the text must not change any more (dismiss, submit).
  const abort = () => {
    if (phaseRef.current === 'idle') return;
    takeRef.current += 1;
    if (phaseRef.current === 'listening') {
      abandonedStopRef.current = stopRecording().then(deleteRecording);
    }
    setPhaseSynced('idle');
  };

  // `stop` has a try/finally, which the React Compiler won't memoize, so the
  // effects below reach it through an effect event rather than depending on it.
  const endTake = useEffectEvent(() => void stop());

  // A full take stops itself and is transcribed — nothing is discarded. Timed
  // from the start rather than from durationMs, which still holds the last
  // take's length for a poll after the next one starts.
  useEffect(() => {
    if (phase !== 'listening') return;
    const t = setTimeout(endTake, MAX_TAKE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // Leaving the screen or backgrounding the app ends the take but keeps what
  // was said — including a take that began after they'd already gone.
  useEffect(() => {
    if (!isFocused && phase === 'listening') endTake();
  }, [isFocused, phase]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      // Not 'inactive': Control Center or a call banner shouldn't end a take.
      if (next === 'background') endTake();
    });
    return () => sub.remove();
  }, []);

  const view: PlusDictationView = {
    phase,
    metering,
    // Until the recorder reports this take, durationMs is still the last one's.
    remainingMs: isRecording ? Math.max(0, MAX_TAKE_MS - durationMs) : MAX_TAKE_MS,
  };

  return { view, isListening: phase === 'listening', start, stop, abort };
}
