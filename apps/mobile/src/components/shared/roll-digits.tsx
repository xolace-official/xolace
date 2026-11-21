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
import {
	DISPLAY_MAX_SCALE,
	type TypeVariant,
	type Weight,
} from "@/design/type";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const ROLL_MS = 260;
export const QUICK_ROLL_MS = 420;

type Props = {
	value: number;
	variant: TypeVariant;
	weight?: Weight;
	className?: string;
	style?: TextStyle;
	lineHeight: number;
	durationMs?: number;
	rollIn?: boolean;
	maxScale?: number;
};

export function RollDigits({
	value,
	variant,
	weight,
	className,
	style,
	lineHeight,
	durationMs = ROLL_MS,
	rollIn = true,
	maxScale = DISPLAY_MAX_SCALE,
}: Props) {
	const chars = String(value).split("");
	const { fontScale } = useWindowDimensions();
	const line = lineHeight * Math.min(fontScale, maxScale);
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
					key={`${chars.length}-${i}`}
					line={line}
					lineHeight={lineHeight}
					maxScale={maxScale}
					rollIn={rollIn}
					style={style}
					variant={variant}
					weight={weight}
				/>
			))}
		</View>
	);
}

function Digit({
	digit,
	line,
	durationMs,
	rollIn,
	maxScale,
	...text
}: {
	digit: number;
	line: number;
	durationMs: number;
	rollIn: boolean;
	maxScale: number;
	variant: TypeVariant;
	weight?: Weight;
	className?: string;
	style?: TextStyle;
	lineHeight: number;
}) {
	const reduced = useEffectiveReducedMotion();
	const at = useSharedValue(reduced || !rollIn ? digit : 0);
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
			<AppText
				className={text.className}
				maxFontSizeMultiplier={maxScale}
				style={[face, { opacity: 0 }]}
				variant={text.variant}
				weight={text.weight}
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
						maxFontSizeMultiplier={maxScale}
						style={face}
						variant={text.variant}
						weight={text.weight}
					>
						{d}
					</AppText>
				))}
			</Animated.View>
		</View>
	);
}
