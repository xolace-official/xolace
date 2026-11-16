import { useEffect } from "react";
import { type TextStyle, useWindowDimensions, View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { DISPLAY_MAX_SCALE, type TypeVariant } from "@/design/type";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
/** native-cook's Roller: 260 ms per change. */
const ROLL_MS = 260;

type Props = {
	value: number;
	variant: TypeVariant;
	/** Static text classes (size, tracking, colour, `tabular-nums`). */
	className?: string;
	style?: TextStyle;
	lineHeight: number;
	durationMs?: number;
};

/**
 * Digits that roll to a new value (from 0 on mount), on the UI thread, in plain
 * views: a SwiftUI-hosted number (`RollingNumber`) is left at a stale frame
 * inside a transformed parent. Reduce Motion: they just change. The digits grow
 * with Dynamic Type up to the display cap, and so does each line. The sparks
 * card's number (from the prototype's You tab); moves down a layer when a
 * second feature needs it.
 */
export function RollDigits({
	value,
	variant,
	className,
	style,
	lineHeight,
	durationMs = ROLL_MS,
}: Props) {
	const chars = String(value).split("");
	const { fontScale } = useWindowDimensions();
	const line = lineHeight * Math.min(fontScale, DISPLAY_MAX_SCALE);
	return (
		<View
			accessibilityLabel={String(value)}
			accessible
			style={{ flexDirection: "row", height: line, overflow: "hidden" }}
		>
			{chars.map((c, i) => (
				<Digit
					className={className}
					digit={Number(c)}
					durationMs={durationMs}
					// A digit keeps its place while the number keeps its length.
					key={`${chars.length}-${i}`}
					line={line}
					lineHeight={lineHeight}
					style={style}
					variant={variant}
				/>
			))}
		</View>
	);
}

function Digit({
	digit,
	line,
	durationMs,
	...text
}: {
	digit: number;
	line: number;
	durationMs: number;
	variant: TypeVariant;
	className?: string;
	style?: TextStyle;
	lineHeight: number;
}) {
	const reduced = useEffectiveReducedMotion();
	const at = useSharedValue(reduced ? digit : 0);
	useEffect(() => {
		at.set(
			reduced
				? digit
				: withTiming(digit, {
						duration: durationMs,
						easing: Easing.out(Easing.cubic),
						...PLAY_AS_CHOSEN,
					})
		);
	}, [digit, reduced, at, durationMs]);
	const column = useAnimatedStyle(() => ({
		transform: [{ translateY: -at.get() * line }],
	}));
	const face = [text.style, { lineHeight: text.lineHeight }];
	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
		>
			{/* The widest digit sizes the column, so the number doesn't jitter as it rolls. */}
			<AppText
				className={text.className}
				maxFontSizeMultiplier={DISPLAY_MAX_SCALE}
				style={[face, { opacity: 0 }]}
				variant={text.variant}
			>
				8
			</AppText>
			<Animated.View
				style={[
					{
						alignItems: "center",
						left: 0,
						position: "absolute",
						right: 0,
						top: 0,
					},
					column,
				]}
			>
				{DIGITS.map((d) => (
					<AppText
						className={text.className}
						key={d}
						maxFontSizeMultiplier={DISPLAY_MAX_SCALE}
						style={face}
						variant={text.variant}
					>
						{d}
					</AppText>
				))}
			</Animated.View>
		</View>
	);
}
