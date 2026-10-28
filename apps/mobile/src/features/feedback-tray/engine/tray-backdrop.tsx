import { use } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
	useAnimatedProps,
	useAnimatedStyle,
	useDerivedValue,
	withTiming,
} from "react-native-reanimated";
import { AnimatedBlurView } from "@/components/animated-blur-view";
import { useAppTheme } from "@/context/app-theme-context";
import { TrayContext } from "./tray-context";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const BACKDROP_DURATION = 250;

/**
 * Blur scrim behind the tray. Driven by the tray's `isActive` shared value —
 * blur fades in when the tray opens, out when it closes. Uses the project's
 * AnimatedBlurView (blur should be felt, not a flat rgba scrim).
 */
export const TrayBackdrop = () => {
	const { state, actions } = use(TrayContext);
	const { isDark } = useAppTheme();

	const blurIntensity = useDerivedValue<number>(() => {
		const target = state.isActive.get() ? (isDark ? 75 : 55) : 0;
		return withTiming(target, { duration: BACKDROP_DURATION });
	});

	const rStyle = useAnimatedStyle(() => ({
		opacity: withTiming(state.isActive.get() ? 1 : 0, {
			duration: BACKDROP_DURATION,
		}),
	}));

	const animatedProps = useAnimatedProps(() => ({
		pointerEvents: state.isActive.get() ? ("auto" as const) : ("none" as const),
	}));

	return (
		<AnimatedPressable
			animatedProps={animatedProps}
			onPress={actions.dismiss}
			style={[StyleSheet.absoluteFill, rStyle]}
		>
			<AnimatedBlurView
				blurIntensity={blurIntensity}
				style={StyleSheet.absoluteFill}
				tint={isDark ? "dark" : "systemUltraThinMaterialDark"}
			/>
		</AnimatedPressable>
	);
};
