import { Dialog, useDialogAnimation } from "heroui-native";
import { StyleSheet } from "react-native";
import { interpolate, useDerivedValue } from "react-native-reanimated";
import { useAppTheme } from "@/context/app-theme-context";
import { AnimatedBlurView } from "./animated-blur-view";

export const DialogBlurBackdrop = () => {
	const { isDark } = useAppTheme();
	const { progress, isDragging, isGestureReleaseAnimationRunning } =
		useDialogAnimation();

	const blurIntensity = useDerivedValue(() => {
		const maxIntensity = isDark ? 75 : 50;

		if (
			(isDragging.get() || isGestureReleaseAnimationRunning.get()) &&
			progress.get() <= 1
		) {
			return maxIntensity;
		}

		return interpolate(progress.get(), [0, 1, 2], [0, maxIntensity, 0]);
	});

	return (
		<Dialog.Overlay className="bg-transparent" isAnimatedStyleActive={false}>
			<AnimatedBlurView
				blurIntensity={blurIntensity}
				style={StyleSheet.absoluteFill}
				tint={isDark ? "dark" : "systemUltraThinMaterialDark"}
			/>
		</Dialog.Overlay>
	);
};
