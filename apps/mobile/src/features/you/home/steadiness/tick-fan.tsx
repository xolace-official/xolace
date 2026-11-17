import { useEffect, useRef } from "react";
import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import Animated, {
	Easing,
	ReduceMotion,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { TICKS } from "@/features/you/home/steadiness/steadiness-model";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColors } from "@/lib/use-token-color";

/** The board's `.fan`: 31 ticks, 3 × 13 pt, on a 64 pt radius across 180°. */
export const FAN_W = 132;
const FAN_H = 72;
const TICK_W = 3;
const TICK_H = 13;
const RADIUS = 64;
const TICK_TOP = 2;
const FILL_MS = 1100;
const SWEEP = 180;
const START = -90;
const TOKENS = ["accent", "separator"] as const;

/**
 * The fan of ticks, accent up to the score. They fill over 1100 ms ease-out with production's
 * rising swell, once per visit; under Reduce Motion they're drawn full. On the UI thread.
 */
export function TickFan({ lit }: { lit: number }) {
	const reduced = useEffectiveReducedMotion();
	const filled = useSharedValue(reduced ? lit : 0);
	const swelled = useRef(false);
	const [accent = "", separator = ""] = useTokenColors(TOKENS);

	useEffect(() => {
		if (lit > 0 && !swelled.current) {
			swelled.current = true;
			Presets.swell();
		}
		filled.set(
			reduced
				? lit
				: withTiming(lit, {
						duration: FILL_MS,
						easing: Easing.out(Easing.cubic),
						reduceMotion: ReduceMotion.Never,
					})
		);
	}, [lit, reduced, filled]);

	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={{ height: FAN_H, width: FAN_W }}
		>
			{Array.from({ length: TICKS }, (_, i) => (
				<Tick
					angle={START + (i * SWEEP) / (TICKS - 1)}
					filled={filled}
					index={i}
					key={i}
					off={separator}
					on={accent}
				/>
			))}
		</View>
	);
}

function Tick({
	angle,
	index,
	filled,
	on,
	off,
}: {
	angle: number;
	index: number;
	filled: SharedValue<number>;
	on: string;
	off: string;
}) {
	const style = useAnimatedStyle(() => ({
		backgroundColor: filled.get() > index + 0.5 ? on : off,
	}));
	return (
		<Animated.View
			style={[
				{
					borderRadius: 2,
					height: TICK_H,
					left: FAN_W / 2 - TICK_W / 2,
					position: "absolute",
					top: TICK_TOP,
					transform: [{ rotate: `${angle}deg` }],
					transformOrigin: [TICK_W / 2, RADIUS, 0],
					width: TICK_W,
				},
				style,
			]}
		/>
	);
}
