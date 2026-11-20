import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	Easing,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { LETTER_MOTION } from "./letter-motion";
import { useLetterInk } from "./letter-paper";

const SEAL = LETTER_MOTION.open.seal;
const SPLIT_FADE_DELAY = 120;
const ROLL = Easing.bezier(...LETTER_MOTION.curves.roll);
const OUT_QUAD = Easing.out(Easing.quad);

type Props = {
	size?: number;
	split?: boolean;
};

export function EmberSeal({ size = 34, split = false }: Props) {
	const ink = useLetterInk();
	const reduced = useEffectiveReducedMotion();
	const move = useSharedValue(split && !reduced ? 1 : 0);
	const fade = useSharedValue(split ? 1 : 0);

	useEffect(() => {
		const to = split ? 1 : 0;
		if (reduced) {
			move.set(0);
			fade.set(
				withTiming(to, { duration: LETTER_MOTION.reducedMs, ...PLAY_AS_CHOSEN })
			);
			return;
		}
		move.set(
			withTiming(to, { duration: SEAL.fadeMs, easing: ROLL, ...PLAY_AS_CHOSEN })
		);
		fade.set(
			withDelay(
				split ? SPLIT_FADE_DELAY : 0,
				withTiming(to, {
					duration: SEAL.fadeMs,
					easing: OUT_QUAD,
					...PLAY_AS_CHOSEN,
				}),
				PLAY_AS_CHOSEN.reduceMotion
			)
		);
	}, [split, reduced, move, fade]);

	return (
		<View accessible={false} style={{ height: size, width: size }}>
			<Half
				fade={fade}
				fill={ink.emberFill}
				move={move}
				shadow={ink.sealShadow}
				side="left"
				size={size}
			/>
			<Half
				fade={fade}
				fill={ink.emberFill}
				move={move}
				shadow={ink.sealShadow}
				side="right"
				size={size}
			/>
		</View>
	);
}

function Half({
	size,
	side,
	move,
	fade,
	fill,
	shadow,
}: {
	size: number;
	side: "left" | "right";
	move: SharedValue<number>;
	fade: SharedValue<number>;
	fill: string;
	shadow: string;
}) {
	const left = side === "left";
	const shift = left ? -SEAL.shift : SEAL.shift;
	const turn = left ? SEAL.rotateLeft : SEAL.rotateRight;
	const style = useAnimatedStyle(() => ({
		opacity: 1 - fade.get(),
		transform: [
			{ translateX: interpolate(move.get(), [0, 1], [0, shift]) },
			{ rotate: `${interpolate(move.get(), [0, 1], [0, turn])}deg` },
		],
	}));
	return (
		<Animated.View
			style={[
				{
					height: size,
					left: left ? 0 : size / 2,
					overflow: "hidden",
					position: "absolute",
					top: 0,
					width: size / 2,
				},
				style,
			]}
		>
			<View
				style={{
					borderRadius: size / 2,
					boxShadow: shadow,
					experimental_backgroundImage: fill,
					height: size,
					left: left ? 0 : -size / 2,
					position: "absolute",
					top: 0,
					width: size,
				}}
			/>
		</Animated.View>
	);
}
