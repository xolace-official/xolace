import {
	type SharedValue,
	useDerivedValue,
	useSharedValue,
} from "react-native-reanimated";

export type Playhead = {
	progress: SharedValue<number>;
	scrubF: SharedValue<number>;
	held: SharedValue<number>;
	touch: SharedValue<number>;
	grow: SharedValue<number>;
	fingerX: SharedValue<number>;
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
