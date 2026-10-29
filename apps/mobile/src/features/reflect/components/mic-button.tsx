import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { useEffect } from "react";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useReducedMotion,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { playSoftPress } from "@/lib/haptics";

type Props = {
	size: "sm" | "md";
	isRecording: boolean;
	onPress: () => void;
};

const MIC_NAME = { android: "mic", ios: "mic", web: "mic" } as const;
const PRESS_ANIMATION = { scale: { ignoreScaleCoefficient: true, value: 0.9 } };

export const MicButton = ({ size, isRecording, onPress }: Props) => {
	const accentColor = useThemeColor("accent");
	const reduceMotion = useReducedMotion();
	const scale = useSharedValue(1);
	const bgOpacity = useSharedValue(0);

	useEffect(() => {
		if (isRecording && !reduceMotion) {
			scale.set(
				withRepeat(
					withTiming(1.25, {
						duration: 700,
						easing: Easing.inOut(Easing.ease),
					}),
					-1,
					true
				)
			);
			bgOpacity.set(
				withRepeat(
					withTiming(0.15, {
						duration: 700,
						easing: Easing.inOut(Easing.ease),
					}),
					-1,
					true
				)
			);
		} else {
			cancelAnimation(scale);
			cancelAnimation(bgOpacity);
			scale.set(withTiming(1, { duration: 150 }));
			bgOpacity.set(withTiming(isRecording ? 0.12 : 0, { duration: 150 }));
		}
		return () => {
			cancelAnimation(scale);
			cancelAnimation(bgOpacity);
		};
	}, [isRecording, reduceMotion, scale, bgOpacity]);

	const iconSize = size === "md" ? 20 : 14;
	const containerSize = size === "md" ? 40 : 26;

	const containerStyle = useAnimatedStyle(() => ({
		alignItems: "center",
		borderRadius: containerSize / 2,
		height: containerSize,
		justifyContent: "center",
		overflow: "hidden",
		transform: [{ scale: scale.get() }],
		width: containerSize,
	}));

	const bgStyle = useAnimatedStyle(() => ({
		backgroundColor: accentColor,
		borderRadius: containerSize / 2,
		height: containerSize,
		opacity: bgOpacity.get(),
		position: "absolute",
		width: containerSize,
	}));

	const handlePress = () => {
		playSoftPress();
		onPress();
	};

	return (
		<PressableFeedback
			accessibilityLabel={
				isRecording ? "Stop voice input" : "Start voice input"
			}
			accessibilityRole="button"
			animation={PRESS_ANIMATION}
			hitSlop={10}
			onPress={handlePress}
		>
			{/* A bordered surface, not a bare glyph: it has to read as pressable. */}
			<Animated.View
				className="border border-border bg-surface-secondary"
				style={containerStyle}
			>
				<Animated.View style={bgStyle} />
				<SymbolView name={MIC_NAME} size={iconSize} tintColor={accentColor} />
			</Animated.View>
		</PressableFeedback>
	);
};
