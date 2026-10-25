import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { StyleSheet } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";

const HEART_ICON = { android: "favorite", ios: "heart.fill" } as const;

/**
 * The full-screen burst on resonate. It survives the redesign unchanged (#303)
 * — and it is the one part of this screen that is deliberately *themed*: it
 * fires over the whole window, not on the poster, so it takes `--accent`.
 */
export function useHeartBurst() {
	const scale = useSharedValue(0);
	const opacity = useSharedValue(0);

	const trigger = () => {
		scale.set(0);
		opacity.set(1);
		scale.set(
			withSequence(
				withSpring(1.5, { damping: 6, stiffness: 200 }),
				withDelay(180, withTiming(0, { duration: 320 }))
			)
		);
		opacity.set(
			withSequence(
				withTiming(1, { duration: 40 }),
				withDelay(350, withTiming(0, { duration: 270 }))
			)
		);
	};

	return { opacity, scale, trigger };
}

export function HeartBurst({
	scale,
	opacity,
}: Omit<ReturnType<typeof useHeartBurst>, "trigger">) {
	const accentColor = useThemeColor("accent") as string;
	const style = useAnimatedStyle(() => ({
		opacity: opacity.get(),
		transform: [{ scale: scale.get() }],
	}));

	return (
		<Animated.View pointerEvents="none" style={[styles.burst, style]}>
			<SymbolView name={HEART_ICON} size={96} tintColor={accentColor} />
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	burst: {
		alignItems: "center",
		bottom: 0,
		justifyContent: "center",
		left: 0,
		position: "absolute",
		right: 0,
		top: 0,
		zIndex: 20,
	},
});
