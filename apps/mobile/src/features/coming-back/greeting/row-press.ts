import {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";

const PRESS = { at: 0.4, ms: 220, scale: 0.975 } as const;

export function useRowPress(reduced: boolean) {
	const press = useSharedValue(1);
	const style = useAnimatedStyle(() => ({
		transform: [{ scale: press.get() }],
	}));
	const play = () => {
		if (reduced) {
			return;
		}
		const down = PRESS.ms * PRESS.at;
		press.set(
			withSequence(
				withTiming(PRESS.scale, { duration: down, ...PLAY_AS_CHOSEN }),
				withTiming(1, { duration: PRESS.ms - down, ...PLAY_AS_CHOSEN })
			)
		);
	};
	return { play, style };
}
