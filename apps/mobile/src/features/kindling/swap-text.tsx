import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import type { TypeVariant, Weight } from "@/design/type";
import { KMOTION } from "./kindling-motion";

const SHRINK = 0.04;

type Props = {
	text: string;
	color: string;
	variant: TypeVariant;
	className: string;
	weight?: Weight;
	reduced: boolean;
	mode: "lift" | "fade";
	numberOfLines?: number;
};

type Lines = { now: string; nowColor: string; was: string; wasColor: string };

export function SwapText({
	text,
	color,
	variant,
	className,
	weight,
	reduced,
	mode,
	numberOfLines,
}: Props) {
	const [lines, setLines] = useState<Lines>({
		now: text,
		nowColor: color,
		was: text,
		wasColor: color,
	});
	const l = useSharedValue(1);
	if (lines.now !== text) {
		setLines({
			now: text,
			nowColor: color,
			was: lines.now,
			wasColor: lines.nowColor,
		});
	} else if (lines.nowColor !== color) {
		setLines({ ...lines, nowColor: color });
	}
	const lift = mode === "lift" && !reduced;
	let ms: number = KMOTION.eyebrowMs;
	if (reduced) {
		ms = REDUCED_FADE_MS;
	} else if (mode === "lift") {
		ms = KMOTION.swapMs;
	}

	useEffect(() => {
		if (lines.now === lines.was) {
			return;
		}
		l.set(0);
		l.set(
			withTiming(1, {
				duration: ms,
				easing: lift ? KMOTION.lit : Easing.linear,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [l, lift, lines.now, lines.was, ms]);

	const rise = lift ? KMOTION.swapRise : 0;
	const shrink = lift ? SHRINK : 0;
	const inStyle = useAnimatedStyle(() => ({
		opacity: l.get(),
		transform: [
			{ translateY: (1 - l.get()) * rise },
			{ scale: 1 - shrink + shrink * l.get() },
		],
	}));
	const outStyle = useAnimatedStyle(() => ({
		opacity: 1 - l.get(),
		transform: [
			{ translateY: -l.get() * rise },
			{ scale: 1 - shrink * l.get() },
		],
	}));
	const line = (value: string, tint: string) => (
		<AppText
			className={className}
			numberOfLines={numberOfLines}
			style={{ color: tint }}
			variant={variant}
			weight={weight}
		>
			{value}
		</AppText>
	);
	return (
		<View>
			<Animated.View style={inStyle}>
				{line(lines.now, lines.nowColor)}
			</Animated.View>
			{lines.was === lines.now ? null : (
				<Animated.View
					accessibilityElementsHidden
					className="absolute inset-x-0 top-0"
					importantForAccessibility="no-hide-descendants"
					pointerEvents="none"
					style={outStyle}
				>
					{line(lines.was, lines.wasColor)}
				</Animated.View>
			)}
		</View>
	);
}
