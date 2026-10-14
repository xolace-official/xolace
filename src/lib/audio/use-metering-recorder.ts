import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { AUDIO_SESSION, yieldAudioFocus } from '@/src/lib/audio/session';

export type UseMeteringRecorderReturn = {
  // Resolves true only when recording actually began (permission granted and
  // the recorder started); false on denial or any setup failure.
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<string | null>;
  // SharedValue so animations (vent particles, dictation waveform) read it on the UI thread via
  // useDerivedValue — no JS bridge overhead on every animation frame.
  // 0 = silence, 1 = max volume.
  metering: SharedValue<number>;
  isRecording: boolean;
  durationMs: number;
};

export function useMeteringRecorder(): UseMeteringRecorderReturn {
  const meteringValue = useSharedValue(0);

  // Mono 48kbps AAC: voice-quality for Scribe STT while keeping a 2-minute
  // recording (~720KB) under Convex's 1MB v.bytes() limit. HIGH_QUALITY
  // (stereo 128kbps) would exceed the limit at ~60 seconds.
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    sampleRate: 24000,
    numberOfChannels: 1,
    bitRate: 48000,
    isMeteringEnabled: true,
  });

  // 50ms polling — smooth enough for per-frame particle animation
  const recorderState = useAudioRecorderState(recorder, 50);

  // Push normalized metering into the SharedValue so Reanimated can consume
  // it on the UI thread without bridging on every frame.
  useEffect(() => {
    const raw = recorderState.metering ?? -160;
    meteringValue.set(Math.max(0, Math.min(1, (raw + 160) / 160)));
  }, [recorderState.metering, meteringValue]);

  const startRecording = async (): Promise<boolean> => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        console.warn('[metering-recorder] Microphone permission denied');
        return false;
      }

      // Recording sets its own session, so it silences any player itself.
      yieldAudioFocus();
      await setAudioModeAsync({ ...AUDIO_SESSION, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      return true;
    } catch (err) {
      console.error('[metering-recorder] startRecording failed:', err);
      return false;
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    try {
      await recorder.stop();
      meteringValue.set(0);
      return recorder.uri ?? null;
    } catch (err) {
      console.error('[metering-recorder] stopRecording failed:', err);
      return null;
    }
  };

  return {
    startRecording,
    stopRecording,
    metering: meteringValue,
    isRecording: recorderState.isRecording,
    durationMs: recorderState.durationMillis,
  };
}
