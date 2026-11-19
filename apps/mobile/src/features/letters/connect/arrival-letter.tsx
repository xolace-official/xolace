import { useIsFocused } from "expo-router";
import { useEffect } from "react";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { FoldedLetter } from "../folded-letter";
import { LETTER_MOTION } from "../letter-motion";

const A = LETTER_MOTION.arrive;
const HALF = A.ms / 2;
/** The board's keyframes: fully opaque by 15 %, scale .62 and −4° at the midpoint. */
const OPAQUE_MS = A.ms * 0.15;
const MID = { rotate: -4, scale: 0.62 };
const CURVE = Easing.bezier(...LETTER_MOTION.curves.arrive);

/** Letters whose arrival has played this app run. In memory only: a relaunch rests them. */
const played = new Set<string>();

/**
 * The folded letter on Connect's shelf (handoff §5 "Arrive", render 18). A letter arrives once,
 * from the fire's side (lower left) through a midpoint to rest: from (−110, +90) pt at .22 and
 * −8°, through (−48, −6) at half, 900 ms, each half on bezier(.33, 1, .68, 1). Then it stays
 * still: no loop. It plays when Connect is on screen (native tabs mount hidden), the first time
 * this letter is shown. Reduced: it fades in place, 200 ms.
 */
export function ArrivalLetter({
	id,
	reduced,
}: {
	id: string;
	reduced: boolean;
}) {
	const focused = useIsFocused();
	const fresh = !played.has(id);
	const x = useSharedValue(fresh ? A.from.x : 0);
	const y = useSharedValue(fresh ? A.from.y : 0);
	const scale = useSharedValue(fresh ? A.from.scale : 1);
	const rotate = useSharedValue(fresh ? A.from.rotate : 0);
	const opacity = useSharedValue(fresh ? 0 : 1);

	useEffect(() => {
		if (!focused || played.has(id)) {
			return;
		}
		played.add(id);
		if (reduced) {
			x.set(0);
			y.set(0);
			scale.set(1);
			rotate.set(0);
			opacity.set(
				withTiming(1, { duration: LETTER_MOTION.reducedMs, ...PLAY_AS_CHOSEN })
			);
			return;
		}
		const half = { duration: HALF, easing: CURVE, ...PLAY_AS_CHOSEN };
		const leg = (via: number, to: number) =>
			withSequence(
				PLAY_AS_CHOSEN.reduceMotion,
				withTiming(via, half),
				withTiming(to, half)
			);
		x.set(leg(A.via.x, 0));
		y.set(leg(A.via.y, 0));
		scale.set(leg(MID.scale, 1));
		rotate.set(leg(MID.rotate, 0));
		opacity.set(withTiming(1, { duration: OPAQUE_MS, ...PLAY_AS_CHOSEN }));
	}, [focused, reduced, id, x, y, scale, rotate, opacity]);

	const style = useAnimatedStyle(() => ({
		opacity: opacity.get(),
		transform: [
			{ translateX: x.get() },
			{ translateY: y.get() },
			{ rotate: `${rotate.get()}deg` },
			{ scale: scale.get() },
		],
	}));

	return (
		<Animated.View style={style}>
			<FoldedLetter size="shelf" />
		</Animated.View>
	);
}
