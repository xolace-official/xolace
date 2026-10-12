import { setAudioModeAsync } from 'expo-audio';
import { pauseNowPlaying } from '@/src/features/browse/now-playing/now-playing-store';

/**
 * The one audio-session mode every playback hook should apply (#367). `doNotMix`
 * is required for lock-screen controls to associate with the active player.
 */
export const AUDIO_SESSION = {
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  interruptionMode: 'doNotMix',
} as const;

/**
 * Every in-app player calls this right before `play()`, so it is also where
 * the Browse mini-player track yields (S4): one sound at a time. The Browse
 * track's own resume reaches here while still paused, so it never pauses itself.
 */
export function configureAudioSession() {
  pauseNowPlaying();
  return setAudioModeAsync(AUDIO_SESSION);
}
