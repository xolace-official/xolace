import { useThemeColor } from "heroui-native";
import { useCallback } from "react";
import { Pressable } from "react-native";
import Animated, {
	cancelAnimation,
	FadeIn,
	interpolate,
	ReduceMotion,
	useAnimatedReaction,
	useAnimatedStyle,
	useDerivedValue,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { playAffirmativePress, playSoftPress } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/** Time the user must hold to complete. */
const DEFAULT_HOLD_DURATION_MS = 3000;
/** Scale on press, for tactile feedback. */
const PRESS_SCALE = 0.96;
const PRESS_SCALE_IN = 250;
const PRESS_SCALE_OUT = 200;

type Props = {
	/** Label shown on the button, both before and during the fill reveal. */
	label: string;
	/** Fires once the hold completes and the release animation finishes. */
	onComplete: () => void;
	holdDurationMs?: number;
	className?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedAppText = Animated.createAnimatedComponent(AppText);

/** Press-and-hold CTA: a fill sweeps across while held, revealing an inverse label; releasing
 * early resets. */
export function HoldToContinueButton({
	label,
	onComplete,
	holdDurationMs = DEFAULT_HOLD_DURATION_MS,
	className,
}: Props) {
	const foreground = useThemeColor("foreground") as string;
	const background = useThemeColor("background") as string;

	/** 0→1 over the hold; drives fill width and reveal-text translation. */
	const fillProgress = useSharedValue(0);
	const pressScale = useSharedValue(1);
	const textXShared = useSharedValue(0);
	const textWidthShared = useSharedValue(0);
	const buttonWidthShared = useSharedValue(0);

	useAnimatedReaction(
		() => fillProgress.get(),
		(progress) => {
			if (progress === 1) {
				scheduleOnRN(playAffirmativePress);
			}
		}
	);

	const textStartProgress = useDerivedValue(() => {
		const buttonWidth = buttonWidthShared.get();
		const textX = textXShared.get();
		return buttonWidth > 0 ? Math.min(1, Math.max(0, textX / buttonWidth)) : 0;
	});

	const textEndProgress = useDerivedValue(() => {
		const buttonWidth = buttonWidthShared.get();
		const textX = textXShared.get();
		const textWidth = textWidthShared.get();
		return buttonWidth > 0
			? Math.min(1, Math.max(0, (textX + textWidth) / buttonWidth))
			: 0;
	});

	const handlePressIn = useCallback(() => {
		playSoftPress();
		// The fill is the hold timer, not decoration: under reduce motion a plain
		// withTiming completes instantly and a single tap would pass the gate.
		fillProgress.set(
			withTiming(1, {
				duration: holdDurationMs,
				reduceMotion: ReduceMotion.Never,
			})
		);
		pressScale.set(withTiming(PRESS_SCALE, { duration: PRESS_SCALE_IN }));
	}, [fillProgress, pressScale, holdDurationMs]);

	/** On release: run onComplete when the fill finished, else cancel and reset. */
	const handlePressOut = useCallback(() => {
		if (fillProgress.get() === 1) {
			pressScale.set(
				withTiming(1, { duration: PRESS_SCALE_OUT }, () => {
					scheduleOnRN(onComplete);
				})
			);
		} else {
			cancelAnimation(fillProgress);
			fillProgress.set(withTiming(0, { duration: PRESS_SCALE_OUT }));
			pressScale.set(withTiming(1, { duration: PRESS_SCALE_IN }));
		}
	}, [fillProgress, pressScale, onComplete]);

	const handleButtonLayout = useCallback(
		(event: { nativeEvent: { layout: { width: number } } }) => {
			buttonWidthShared.set(event.nativeEvent.layout.width);
		},
		[buttonWidthShared]
	);

	const handleTextLayout = useCallback(
		(event: { nativeEvent: { layout: { width: number; x: number } } }) => {
			textXShared.set(event.nativeEvent.layout.x);
			textWidthShared.set(event.nativeEvent.layout.width);
		},
		[textXShared, textWidthShared]
	);

	const containerAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: pressScale.get() }],
	}));

	const fillRowAnimatedStyle = useAnimatedStyle(() => {
		const progress = fillProgress.get();
		const translateX = interpolate(
			progress,
			[0, 1],
			[-buttonWidthShared.get(), 0]
		);
		return { transform: [{ translateX }] };
	});

	const revealedTextAnimatedStyle = useAnimatedStyle(() => {
		const progress = fillProgress.get();
		const start = textStartProgress.get();
		const end = Math.max(textEndProgress.get(), start);
		const textWidth = textWidthShared.get();
		const translateX =
			progress < start
				? 0
				: interpolate(progress, [start, end], [0, -textWidth]);
		return { transform: [{ translateX }] };
	});

	return (
		<AnimatedPressable
			// Screen-reader double-tap can't sustain a hold; "activate" completes directly.
			accessibilityActions={[{ name: "activate" }]}
			accessibilityHint="Press and hold to continue"
			accessibilityLabel={label}
			accessibilityRole="button"
			className={cn(
				"h-16 items-center justify-center overflow-hidden rounded-full border-2 px-12",
				className
			)}
			entering={FadeIn}
			onAccessibilityAction={(e) =>
				e.nativeEvent.actionName === "activate" && onComplete()
			}
			onLayout={handleButtonLayout}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			style={[
				containerAnimatedStyle,
				{ borderColor: foreground, borderCurve: "continuous" },
			]}
		>
			<AppText
				className="font-medium text-lg"
				onLayout={handleTextLayout}
				style={{ color: foreground }}
			>
				{label}
			</AppText>

			{/* overflow-hidden clips the fill row for the left-to-right reveal. */}
			<Animated.View
				className="absolute h-full flex-row items-center overflow-hidden"
				style={[fillRowAnimatedStyle, { width: buttonWidthShared }]}
			>
				<Animated.View
					className="h-full"
					style={{ backgroundColor: foreground, width: buttonWidthShared }}
				/>
				<AnimatedAppText
					className="font-medium text-lg"
					style={[revealedTextAnimatedStyle, { color: background }]}
				>
					{label}
				</AnimatedAppText>
			</Animated.View>
		</AnimatedPressable>
	);
}
