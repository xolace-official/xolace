import { useBottomSheet, useBottomSheetAnimation } from "heroui-native";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
	interpolate,
	useDerivedValue,
} from "react-native-reanimated";
import { useAppTheme } from "@/context/app-theme-context";
import { AnimatedBlurView } from "./animated-blur-view";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const BottomSheetBlurOverlay = () => {
	const { isDark } = useAppTheme();
	const { isOpen, onOpenChange } = useBottomSheet();
	const { progress } = useBottomSheetAnimation();

	const blurIntensity = useDerivedValue(() =>
		interpolate(progress.get(), [0, 1, 2], [0, 40, 0])
	);

	if (!isOpen) {
		return null;
	}

	return (
		<AnimatedPressable
			onPress={() => onOpenChange(false)}
			style={StyleSheet.absoluteFill}
		>
			<AnimatedBlurView
				blurIntensity={blurIntensity}
				style={StyleSheet.absoluteFill}
				tint={isDark ? "dark" : "systemUltraThinMaterialDark"}
			/>
		</AnimatedPressable>
	);
};
