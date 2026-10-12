import { setAudioModeAsync } from 'expo-audio';
import type { RefObject } from 'react';

/**
 * The one audio-session mode every playback hook should apply (#367). `doNotMix`
 * is required for lock-screen controls to associate with the active player.
 */
export const AUDIO_SESSION = {
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  interruptionMode: 'doNotMix',
} as const;

/** Who is audible: a per-hook identity (its ref object) and how to silence it. */
type Focus = { owner: RefObject<unknown>; pause: () => void };
let active: Focus | null = null;

/**
 * One sound at a time (S4). The player about to make sound claims focus and
 * whoever held it is paused — in every direction, Browse included. `owner` is
 * the hook's ref object, stable across re-minted players.
 */
export function claimAudioFocus(owner: RefObject<unknown>, pause: () => void) {
  if (active && active.owner !== owner) {
    try {
      active.pause();
    } catch {
      // A released native player makes no sound; nothing to pause.
    }
  }
  active = { owner, pause };
}

/** Recorders: silence whatever is playing without taking focus themselves. */
export function yieldAudioFocus() {
  try {
    active?.pause();
  } catch {
    // released player, see above
  }
  active = null;
}

/** Every in-app player calls this right before `play()`. */
export function claimAudioSession(owner: RefObject<unknown>, pause: () => void) {
  claimAudioFocus(owner, pause);
  return setAudioModeAsync(AUDIO_SESSION);
}
