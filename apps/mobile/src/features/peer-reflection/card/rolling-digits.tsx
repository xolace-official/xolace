import { useEffect } from "react";
import type { StyleProp, TextStyle } from "react-native";
import { View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";

/** Today's campfire `RollingCount` roll: 420 ms after 150 ms, from one line below. */
const ROLL = { delay: 150, from: 18, ms: 420, startA: 0.2 } as const;
const EASE_RISE = Easing.bezier(0.2, 0.8, 0.2, 1);

type Props = {
	value: number;
	/** Roll in now (the label just turned on); otherwise the digits sit still. */
	play: boolean;
	style: StyleProp<TextStyle>;
};

/**
 * The count in "You and 12 others", rolling up into its clipped box as the label
 * arrives: the campfire's roll, cut down to the digits so it sits inside a
 * one-line label. The box keeps a clear copy for its size, so the label never
 * reflows.
 */
export function RollingDigits({ value, play, style }: Props) {
	const p = useSharedValue(play ? 0 : 1);
	useEffect(() => {
		if (!play) {
			p.set(1);
			return;
		}
		p.set(0);
		p.set(
			withDelay(
				ROLL.delay,
				withTiming(1, {
					duration: ROLL.ms,
					easing: EASE_RISE,
					...PLAY_AS_CHOSEN,
				}),
				PLAY_AS_CHOSEN.reduceMotion
			)
		);
	}, [p, play]);
	const roll = useAnimatedStyle(() => ({
		opacity: ROLL.startA + (1 - ROLL.startA) * p.get(),
		transform: [{ translateY: ROLL.from * (1 - p.get()) }],
	}));
	return (
		<View className="overflow-hidden">
			<AppText
				className="text-transparent tabular-nums"
				style={style}
				variant="footnote"
				weight="semibold"
			>
				{String(value)}
			</AppText>
			<Animated.View className="absolute top-0 left-0" style={roll}>
				<AppText
					className="tabular-nums"
					style={style}
					variant="footnote"
					weight="semibold"
				>
					{String(value)}
				</AppText>
			</Animated.View>
		</View>
	);
}
