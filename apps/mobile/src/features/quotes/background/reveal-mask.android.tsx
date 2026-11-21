import type { ReactNode } from "react";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { revealCircle } from "./reveal-circle";

/** The smallest circle drawn; below it the counter-scale would run away. */
const SMALLEST = 0.002;

/**
 * Android's reveal. MaskedView redraws its mask into a new screen-sized bitmap on every frame the
 * mask moves (a ~15 MB allocation and a software draw per frame on a 1440p phone), and it can't
 * mask a video's SurfaceView at all. Here a circle clips its children instead: it scales up
 * around the reveal's origin while its content scales down by the same amount around the same
 * point, so the picture stays still and only the clip grows. The GPU does all of it.
 */
export function RevealMask({
	reveal,
	reduced,
	width,
	height,
	children,
}: {
	reveal: SharedValue<number>;
	reduced: boolean;
	width: number;
	height: number;
	children: ReactNode;
}) {
	const c = revealCircle(width, height);
	const clip = useAnimatedStyle(() => {
		const r = reveal.get();
		if (reduced) {
			return { opacity: r, transform: [{ scale: 1 }] };
		}
		return {
			opacity: r > 0 ? 1 : 0,
			transform: [{ scale: Math.max(SMALLEST, r) }],
		};
	});
	const still = useAnimatedStyle(() => ({
		transform: [{ scale: reduced ? 1 : 1 / Math.max(SMALLEST, reveal.get()) }],
	}));
	return (
		<Animated.View
			className="absolute overflow-hidden"
			pointerEvents="none"
			style={[
				{
					borderRadius: c.radius,
					height: c.radius * 2,
					left: c.left,
					top: c.top,
					width: c.radius * 2,
				},
				clip,
			]}
		>
			<Animated.View
				className="absolute"
				style={[
					{
						height,
						left: -c.left,
						top: -c.top,
						transformOrigin: [c.cx, c.cy, 0],
						width,
					},
					still,
				]}
			>
				{children}
			</Animated.View>
		</Animated.View>
	);
}
