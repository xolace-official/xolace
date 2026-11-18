import {
	type SharedValue,
	useDerivedValue,
	useSharedValue,
} from "react-native-reanimated";

/**
 * Where the playhead is, on the UI thread. `progress` follows the clock (`PlayheadSync`); while
 * a finger is down, or the release snap is settling, `held` is 1 and `scrubF` leads. Nothing
 * here renders React: the bars, the pill and the times read these directly (handoff §9).
 */
export type Playhead = {
	progress: SharedValue<number>;
	scrubF: SharedValue<number>;
	/** 1 from touch down until the release snap settles. */
	held: SharedValue<number>;
	/** 1 while the finger is down (the pill, the hidden centre text). */
	touch: SharedValue<number>;
	/** 0 → 1 over 200 ms on touch down: the strip grows. */
	grow: SharedValue<number>;
	fingerX: SharedValue<number>;
	/** What's drawn: the finger while held, the clock otherwise. */
	shown: SharedValue<number>;
};

export function usePlayhead(): Playhead {
	const progress = useSharedValue(0);
	const scrubF = useSharedValue(0);
	const held = useSharedValue(0);
	const touch = useSharedValue(0);
	const grow = useSharedValue(0);
	const fingerX = useSharedValue(0);
	const shown = useDerivedValue(() =>
		held.get() ? scrubF.get() : progress.get()
	);
	return { fingerX, grow, held, progress, scrubF, shown, touch };
}
