import type { ReactNode } from "react";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { revealCircle } from "./reveal-circle";

/** The smallest circle drawn; below it the counter-scale would run away. */
const SMALLEST = 0.002;

/**
 * A new background grows out of the bottom in a circle as `reveal` runs 0 → 1, or fades in
 * when `reduced`. A circle clips its children: it scales up around the reveal's origin while
 * its content scales down by the same amount around the same point, so the picture stays still
 * and only the clip grows. The GPU does all of it, and it clips a loop's TextureView on
 * Android, which MaskedView couldn't (#910); MaskedView also redrew a screen-sized bitmap per
 * frame there. Once `open`, the clip lets go, so a revealed loop keeps playing unclipped in
 * the same views it revealed in (iOS dropped its CALayer mask for this: a mask can't let go
 * without its children mounting again).
 */
export function RevealMask({
	reveal,
	reduced,
	open,
	width,
	height,
	children,
}: {
	reveal: SharedValue<number>;
	reduced: boolean;
	open: boolean;
	width: number;
	height: number;
	children: ReactNode;
}) {
	const c = revealCircle(width, height);
	const clip = useAnimatedStyle(() => {
		const r = reveal.get();
		if (open) {
			return { opacity: 1, transform: [{ scale: 1 }] };
		}
		if (reduced) {
			return { opacity: r, transform: [{ scale: 1 }] };
		}
		return {
			opacity: r > 0 ? 1 : 0,
			transform: [{ scale: Math.max(SMALLEST, r) }],
		};
	});
	const still = useAnimatedStyle(() => ({
		transform: [
			{ scale: open || reduced ? 1 : 1 / Math.max(SMALLEST, reveal.get()) },
		],
	}));
	return (
		<Animated.View
			className="absolute"
			pointerEvents="none"
			style={[
				open
					? {
							borderRadius: 0,
							height,
							left: 0,
							overflow: "visible",
							top: 0,
							width,
						}
					: {
							borderRadius: c.radius,
							height: c.radius * 2,
							left: c.left,
							overflow: "hidden",
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
						left: open ? 0 : -c.left,
						top: open ? 0 : -c.top,
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
