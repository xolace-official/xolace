import { useAudioPlayer } from "expo-audio";
import { useEffect } from "react";
import { COMPRESS_MS, FLASH_MS } from "@/features/vent/field/particle-config";

// The one sound (production's `use-vent-sounds.ts`): the burning-paper crackle at the scatter.
const CRACKLE = require("@/assets/sounds/vent/burning-paper-crack-2-scatter.wav");
const VOLUME = 0.7;
/** Reduce Motion has no burst, so the crackle is quieter (the board: "the crackle, softer"). */
const REDUCED_VOLUME = 0.35;

/**
 * Plays the crackle once per burn, `COMPRESS_MS + FLASH_MS` after the release (production). It
 * plays after the recorder has stopped, so it never touches the metering-driven field. No
 * audio-session call: the recorder already set playsInSilentMode, and a doNotMix session on
 * mount would pause the person's background audio.
 */
export function useVentSounds(burning: boolean, reduced: boolean): void {
	const crackle = useAudioPlayer(CRACKLE);

	useEffect(() => {
		if (!burning) {
			return;
		}
		const t = setTimeout(() => {
			// expo-audio's volume is a documented mutable setter.
			crackle.volume = reduced ? REDUCED_VOLUME : VOLUME;
			crackle.seekTo(0);
			crackle.play();
		}, COMPRESS_MS + FLASH_MS);
		return () => clearTimeout(t);
	}, [burning, reduced, crackle]);
}
