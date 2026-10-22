import { useThemeColor } from "heroui-native";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	FadeIn,
	useAnimatedStyle,
	useReducedMotion,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";

const HALO_SIZE = 240;
const CORE_SIZE = 150;

const BreathingOrbComponent = () => {
	const accentColor = useThemeColor("accent");
	const reduceMotion = useReducedMotion();
	const scale = useSharedValue(1);
	const coreOpacity = useSharedValue(0.4);
	const haloOpacity = useSharedValue(0.08);

	useEffect(() => {
		if (reduceMotion) {
			scale.set(1.15);
			coreOpacity.set(0.6);
			haloOpacity.set(0.12);
			return;
		}

		scale.set(
			withRepeat(
				withTiming(1.3, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
				-1,
				true
			)
		);
		coreOpacity.set(
			withRepeat(
				withTiming(0.8, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
				-1,
				true
			)
		);
		haloOpacity.set(
			withRepeat(
				withTiming(0.15, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
				-1,
				true
			)
		);

		return () => {
			cancelAnimation(scale);
			cancelAnimation(coreOpacity);
			cancelAnimation(haloOpacity);
		};
	}, [scale, coreOpacity, haloOpacity, reduceMotion]);

	const breathStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.get() }],
	}));

	const haloStyle = useAnimatedStyle(() => ({
		backgroundColor: accentColor,
		borderRadius: HALO_SIZE / 2,
		height: HALO_SIZE,
		opacity: haloOpacity.get(),
		position: "absolute",
		width: HALO_SIZE,
	}));

	const coreStyle = useAnimatedStyle(() => ({
		backgroundColor: accentColor,
		borderRadius: CORE_SIZE / 2,
		height: CORE_SIZE,
		opacity: coreOpacity.get(),
		width: CORE_SIZE,
	}));

	return (
		<Animated.View
			className="items-center justify-center"
			entering={FadeIn.duration(800).delay(300)}
		>
			<Animated.View style={breathStyle}>
				<View style={styles.orbContainer}>
					<Animated.View style={haloStyle} />
					<Animated.View style={coreStyle} />
				</View>
			</Animated.View>
		</Animated.View>
	);
};

export const BreathingOrb = BreathingOrbComponent;

const styles = StyleSheet.create({
	orbContainer: {
		alignItems: "center",
		height: HALO_SIZE,
		justifyContent: "center",
		width: HALO_SIZE,
	},
});
