import { useEffect } from "react";
import { type SharedValue, useFrameCallback } from "react-native-reanimated";

/**
 * A speaking voice for the simulator, whose mic may be silent (handoff §5): the board's
 * `voiceLevel(t)`, phrases with pauses and syllables inside them, at `loud` (0–1).
 */
function voiceLevel(t: number, loud: number) {
	"worklet";
	const phrase = Math.sin(t * 0.0019) + 0.35 * Math.sin(t * 0.0047);
	if (phrase < -0.35) {
		return 0.04;
	}
	const syl =
		0.5 + 0.5 * Math.abs(Math.sin(t * 0.0105 + Math.sin(t * 0.0031) * 2));
	return loud * (0.45 + 0.55 * syl);
}

/** Writes the pretend voice into the recorder's level while `speaking`, on the UI thread. */
export function usePretendVoice(
	speaking: boolean,
	loud: number,
	level: SharedValue<number>
) {
	const frame = useFrameCallback((f) => {
		"worklet";
		level.set(voiceLevel(f.timeSinceFirstFrame, loud));
	}, false);
	const { setActive } = frame;
	useEffect(() => {
		setActive(speaking);
		if (!speaking) {
			level.set(0);
		}
		return () => setActive(false);
	}, [speaking, setActive, level]);
}
