import { useAudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { COMPRESS_MS, FLASH_MS } from '../components/particles/particle-config';
import type { VentState } from './use-vent-flow';

// Single sound for now: the burning-paper crackle at the scatter — the
// emotional payload of the ritual (docs/vent-design.md → Sound Design).
// The other five moments stay silent until we find a playback approach that
// doesn't lag or disturb the recording session.
const CRACKLE = require('@/assets/sounds/vent/burning-paper-crack-2-scatter.wav');

/**
 * Plays the crackle once per burn, timed to the scatter phase
 * (compress + flash after 'processing' begins). Runs entirely after the
 * recorder has stopped, so it never touches the metering-driven particles.
 */
export function useVentSounds(state: VentState): void {
  const crackle = useAudioPlayer(CRACKLE);
  const prevStateRef = useRef<VentState | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- expo-audio AudioPlayer.volume is a documented mutable setter
    crackle.volume = 0.7;
    // No audio-session call here: the recorder sets playsInSilentMode before
    // the crackle can fire, and a doNotMix session on mount would pause the
    // user's background audio the moment they open Vent.
  }, [crackle]);

  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    if (prev === state || state !== 'processing') return;

    const t = setTimeout(() => {
      crackle.seekTo(0);
      crackle.play();
    }, COMPRESS_MS + FLASH_MS);
    return () => clearTimeout(t);
  }, [state, crackle]);
}
