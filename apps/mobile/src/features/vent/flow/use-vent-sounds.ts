import { useAudioPlayer } from "expo-audio";
import { useEffect } from "react";
import { COMPRESS_MS, FLASH_MS } from "@/features/vent/field/particle-config";

const CRACKLE = require("@/assets/sounds/vent/burning-paper-crack-2-scatter.wav");
const VOLUME = 0.7;
const REDUCED_VOLUME = 0.35;

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
