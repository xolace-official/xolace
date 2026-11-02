import { View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { MoodSlider } from "@/features/session-end/hooks/use-mood-slider";
import { SAME } from "@/features/session-end/mood-scale";

type Props = {
	slider: MoodSlider;
	/** The status word, read back as the slider's value. */
	label: string;
};

const HEIGHT = 56;
const LINE = 10;
const NOTCH = 24;
const LINE_TOP = (HEIGHT - LINE) / 2;
const NOTCH_TOP = (HEIGHT - NOTCH) / 2;

/** The heavier ↔ lighter track: a centre notch for "the same", a fill growing from the
 * centre toward the thumb, and the thumb. One adjustable control to a screen reader. */
export function MoodTrack({ slider, label }: Props) {
	const { inset, pos, width } = slider;

	// Absolute and childless, so animating its left/width relays out nothing else.
	const fillStyle = useAnimatedStyle(() => {
		const span = Math.max(0, width.get() - inset * 2);
		const p = pos.get();
		return {
			left: inset + Math.min(p, SAME) * span,
			width: Math.abs(p - SAME) * span,
		};
	});
	const thumbStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateX: pos.get() * Math.max(0, width.get() - inset * 2) },
		],
	}));

	return (
		<GestureDetector gesture={slider.gesture}>
			<View
				accessibilityActions={[
					{ label: "Lighter", name: "increment" },
					{ label: "Heavier", name: "decrement" },
				]}
				accessibilityLabel="How do you feel now, from heavier to lighter"
				accessibilityRole="adjustable"
				accessibilityValue={{ text: label }}
				accessible
				onAccessibilityAction={(e) =>
					slider.nudge(e.nativeEvent.actionName === "increment" ? 1 : -1)
				}
				onLayout={(e) => width.set(e.nativeEvent.layout.width)}
				style={{ height: HEIGHT }}
			>
				<View
					className="absolute rounded-full bg-border"
					style={{ height: LINE, left: inset, right: inset, top: LINE_TOP }}
				/>
				<View
					className="absolute w-1 self-center rounded-full bg-foreground/30"
					style={{ height: NOTCH, top: NOTCH_TOP }}
				/>
				<Animated.View
					className="absolute rounded-full bg-accent"
					style={[{ height: LINE, top: LINE_TOP }, fillStyle]}
				/>
				<Animated.View
					className="absolute top-0 bottom-0 left-0 items-center justify-center"
					pointerEvents="none"
					style={[{ width: inset * 2 }, thumbStyle]}
				>
					<View
						className="rounded-full border-2 border-background bg-foreground shadow-lg"
						style={{ height: inset * 2, width: inset * 2 }}
					/>
				</Animated.View>
			</View>
		</GestureDetector>
	);
}
