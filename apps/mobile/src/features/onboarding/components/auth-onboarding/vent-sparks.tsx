/**
 * The breath leaving the character on the Vent beat: a slow plume of embers
 * that rises, drifts right, and is gone before it reaches the copy.
 *
 * THE VANISHING IS THE PROMISE. The beat says nothing is stored and it goes
 * when you close it — so nothing here is allowed to arrive anywhere. Every
 * spark fades to zero mid-flight. If one ever lands on the text the slide is
 * saying the opposite of the words above it.
 *
 * NOT `features/vent/particles/ParticleField`, deliberately. That one is a
 * full-screen Skia canvas driven by `useFrameCallback` and the vent ritual's
 * stage machine (mic metering, compress, burn). It redraws every frame for as
 * long as it is mounted, and this deck keeps all seven slides mounted inside a
 * carousel — it would burn frames behind six slides nobody is looking at. It
 * also has no notion of a plume from a point, which is the only thing needed
 * here. Eighteen transform-only views cost nothing by comparison.
 *
 * Jitter comes from a fixed table rather than `Math.random()`: a random value
 * read during render would reshuffle the plume on every re-render.
 */
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

/**
 * x/bottom offsets from the plume origin, dot size, rightward drift, ms, start delay.
 *
 * Sizes and stagger are set by what actually reads on device, not by what looks
 * reasonable in the table: an earlier pass ran twelve 1.5–3pt dots staggered
 * across 3.8s, and at any instant only three or four were in their bright
 * window — the plume read as sensor dust rather than as breath. Eighteen larger
 * dots over a 2.2s stagger keeps roughly a dozen visible at once.
 */
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

/**
 * How far a spark climbs before it is fully gone. It must die short of the
 * copy — see the note above about never arriving. The plume starts clear of the
 * character's head, which leaves ~157pt between it and the tag line, so the
 * climb is sized to fill that gap and stop inside it. At 150 the highest sparks
 * grazed the tag on device; 130 keeps the whole plume under it.
 */
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
			// Bright fast, then a long decay: an ember is at its most visible just
			// after it leaves, and the slow tail is what reads as "letting go".
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

/**
 * `originX` / `originBottom` place the plume just above the character's head,
 * on the mouth's axis — see the note on `PLUME_Y` in `vent-beat.tsx` for why it
 * is not on the mouth itself. Both are measured from the slide's left and
 * bottom edges so the plume stays married to the figure, which is
 * bottom-anchored too.
 */
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
