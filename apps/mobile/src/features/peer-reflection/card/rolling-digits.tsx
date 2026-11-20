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

const ROLL = { delay: 150, from: 18, ms: 420, startA: 0.2 } as const;
const EASE_RISE = Easing.bezier(0.2, 0.8, 0.2, 1);

type Props = {
	value: number;
	play: boolean;
	style: StyleProp<TextStyle>;
};

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
