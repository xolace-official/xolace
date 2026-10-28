// The breath leaving the Vent figure: a plume of embers that fades to zero before
// reaching the copy. Not `features/vent/particles/ParticleField`: that Skia canvas
// redraws every frame while mounted, and the deck keeps all seven slides mounted.
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	Easing,
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withRepeat,
	withTiming,
} from "react-native-reanimated";

// Fixed jitter table (`Math.random()` in render would reshuffle the plume). Eighteen
// dots over a 2.2s stagger keep about a dozen visible at once; fewer reads as dust.
const PLUME = [
	{ delay: 0, drift: 34, dur: 4200, dx: 0, dy: 0, size: 4.2 },
	{ delay: 130, drift: 48, dur: 4700, dx: 7, dy: 9, size: 3.2 },
	{ delay: 260, drift: 24, dur: 3900, dx: -5, dy: 5, size: 3.6 },
	{ delay: 390, drift: 57, dur: 5100, dx: 11, dy: -4, size: 2.6 },
	{ delay: 510, drift: 38, dur: 4400, dx: 2, dy: 13, size: 3.4 },
	{ delay: 640, drift: 20, dur: 4900, dx: -8, dy: 2, size: 2.4 },
	{ delay: 770, drift: 53, dur: 4100, dx: 14, dy: 7, size: 4.0 },
	{ delay: 900, drift: 30, dur: 5300, dx: 4, dy: -7, size: 2.8 },
	{ delay: 1020, drift: 43, dur: 4600, dx: -3, dy: 11, size: 3.0 },
	{ delay: 1150, drift: 65, dur: 5000, dx: 9, dy: 3, size: 2.3 },
	{ delay: 1280, drift: 26, dur: 4300, dx: -10, dy: 8, size: 3.5 },
	{ delay: 1410, drift: 46, dur: 4800, dx: 6, dy: 15, size: 2.5 },
	{ delay: 1530, drift: 36, dur: 4500, dx: 16, dy: 1, size: 3.1 },
	{ delay: 1660, drift: 61, dur: 5200, dx: -6, dy: -3, size: 2.2 },
	{ delay: 1790, drift: 22, dur: 4000, dx: 12, dy: 12, size: 3.8 },
	{ delay: 1920, drift: 51, dur: 4900, dx: 1, dy: 6, size: 2.7 },
	{ delay: 2040, drift: 32, dur: 4600, dx: -12, dy: 14, size: 3.3 },
	{ delay: 2170, drift: 69, dur: 5400, dx: 8, dy: -6, size: 2.0 },
];

/** Climb before a spark is gone. ~157pt sits between origin and tag; 150 grazed the tag. */
const RISE = 130;

const Spark = ({
	spec,
	color,
	reduced,
}: {
	spec: (typeof PLUME)[number];
	color: string;
	reduced: boolean;
}) => {
	const progress = useSharedValue(0);

	useEffect(() => {
		if (reduced) {
			// Held mid-flight: the plume still reads as a plume, nothing moves.
			progress.set(0.4);
			return;
		}
		progress.set(
			withDelay(
				spec.delay,
				withRepeat(
					withTiming(1, {
						duration: spec.dur,
						easing: Easing.out(Easing.quad),
					}),
					-1,
					false
				)
			)
		);
	}, [progress, reduced, spec.delay, spec.dur]);

	const rStyle = useAnimatedStyle(() => {
		const v = progress.get();
		return {
			// Bright fast, then a long decay.
			opacity: interpolate(v, [0, 0.08, 0.55, 1], [0, 1, 0.6, 0]),
			transform: [
				{ translateY: -v * RISE },
				{ translateX: v * spec.drift },
				{ scale: interpolate(v, [0, 1], [1, 0.42]) },
			],
		};
	});

	return (
		<Animated.View
			style={[
				styles.spark,
				{
					backgroundColor: color,
					borderRadius: spec.size / 2,
					bottom: spec.dy,
					height: spec.size,
					left: spec.dx,
					width: spec.size,
				},
				rStyle,
			]}
		/>
	);
};

/** Origin is measured from the slide's left and bottom edges, like the bottom-anchored figure
 * (see `PLUME_Y` in `vent-beat.tsx`). */
export const VentSparks = ({
	originX,
	originBottom,
	color,
	reduced,
}: {
	originX: number;
	originBottom: number;
	color: string;
	reduced: boolean;
}) => (
	<View
		pointerEvents="none"
		style={[styles.origin, { bottom: originBottom, left: originX }]}
	>
		{PLUME.map((spec) => (
			<Spark color={color} key={spec.delay} reduced={reduced} spec={spec} />
		))}
	</View>
);

const styles = StyleSheet.create({
	origin: { position: "absolute" },
	spark: { position: "absolute" },
});
