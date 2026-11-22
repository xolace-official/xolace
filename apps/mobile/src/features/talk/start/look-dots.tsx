import { Pressable, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	withTiming,
} from "react-native-reanimated";
import { LOOK_ORDER, LOOKS } from "../companion-look";
import { OUT_EASE, timing } from "../motion/talk-motion";

const DOT = 6;
const DOT_ON = 18;
const DOT_MS = 300;
const OFF_OPACITY = 0.45;
const HIT = 6;

function Dot({ on, onPress }: { on: boolean; onPress: () => void }) {
	const style = useAnimatedStyle(() => ({
		opacity: withTiming(on ? 1 : OFF_OPACITY, timing(DOT_MS)),
		width: withTiming(on ? DOT_ON : DOT, timing(DOT_MS, OUT_EASE)),
	}));
	return (
		<Pressable accessible={false} hitSlop={HIT} onPress={onPress}>
			<Animated.View
				className={on ? "bg-foreground" : "bg-subtle"}
				style={[{ borderRadius: DOT / 2, height: DOT }, style]}
			/>
		</Pressable>
	);
}

export function LookDots({
	index,
	onDot,
}: {
	index: number;
	onDot: (i: number) => void;
}) {
	return (
		<View className="mt-1.5 flex-row justify-center gap-1.5">
			{LOOK_ORDER.map((look, i) => (
				<Dot
					key={LOOKS[look].label}
					on={i === index}
					onPress={() => onDot(i)}
				/>
			))}
		</View>
	);
}
