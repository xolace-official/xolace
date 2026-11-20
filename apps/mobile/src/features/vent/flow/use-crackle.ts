import { type AudioPlayer, useAudioPlayer } from "expo-audio";

const CRACKLE = require("@/assets/sounds/vent/burning-paper-crack-2-scatter.wav");
const VOLUME = 0.7;
const REDUCED_VOLUME = 0.35;

function play(player: AudioPlayer, reduced: boolean) {
	// expo-audio's volume is a documented mutable setter.
	player.volume = reduced ? REDUCED_VOLUME : VOLUME;
	player.seekTo(0);
	player.play();
}

/** The burning-paper crackle a release plays at the scatter. Quieter with reduced motion. */
export function useCrackle(): (reduced: boolean) => void {
	const crackle = useAudioPlayer(CRACKLE);
	return (reduced) => play(crackle, reduced);
}
