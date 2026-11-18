import { View } from "react-native";
import Animated, {
	interpolateColor,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AnimatedAppText } from "@/components/shared/app-text";
import {
	age,
	type Eng,
	T,
} from "@/features/achievements/arrival/arrival-motion";
import {
	bounce,
	easeIO,
	easeOut,
	seg,
} from "@/features/achievements/motion-math";
import { useTokenColor } from "@/lib/use-token-color";

/** One digit's row: 96 tall, 88 pt. The roll translates a two-row column by it. */
const ROW = 96;
const FADE = { from: 250, to: 600 } as const;
const LIGHT = { from: 900, to: 1300 } as const;
const BOUNCE = { by: 0.08, over: 600 } as const;

/**
 * The count: yesterday's number unlit, rolling to today's at 1 s (each digit a
 * two-row column that translates) as it takes the fire's colour, with a bounce.
 * The milestone is one VoiceOver element, so the digits are hidden.
 */
export function Count({
	eng,
	top,
	from,
	to,
	dark,
}: {
	eng: SharedValue<Eng>;
	top: number;
	from: number;
	to: number;
	dark: boolean;
}) {
	const tos = String(to);
	const froms = String(from).padStart(tos.length, " ");
	const ghost = useTokenColor(
		dark ? "arrival-count-ghost-dusk" : "arrival-count-ghost-day"
	);
	const lit = useTokenColor(
		dark ? "arrival-count-lit-dusk" : "arrival-count-lit-day"
	);
	const box = useAnimatedStyle(() => {
		const e = eng.get();
		const m = age(e, e.tm);
		const b = e.rm
			? 0
			: BOUNCE.by * Math.max(0, bounce(seg(m, T.roll, T.roll + BOUNCE.over)));
		return {
			opacity: e.rm ? 1 : easeOut(seg(m, FADE.from, FADE.to)),
			transform: [{ scale: 1 + b }],
		};
	});
	const colour = useAnimatedStyle(() => {
		const e = eng.get();
		const bright = e.rm ? 1 : seg(age(e, e.tm), LIGHT.from, LIGHT.to);
		return { color: interpolateColor(bright, [0, 1], [ghost, lit]) };
	});
	const roll = useAnimatedStyle(() => {
		const e = eng.get();
		const r = e.rm ? 1 : easeIO(seg(age(e, e.tm), T.roll, T.roll + T.rollFor));
		return { transform: [{ translateY: -ROW * r }] };
	});
	const digit = { height: ROW, lineHeight: ROW };
	return (
		<Animated.View
			accessibilityElementsHidden
			className="absolute inset-x-0 flex-row justify-center"
			importantForAccessibility="no-hide-descendants"
			style={[{ height: ROW, top, transformOrigin: "50% 60%" }, box]}
		>
			{tos.split("").map((d, i) => (
				<View className="overflow-hidden" key={i} style={{ height: ROW }}>
					<Animated.View style={roll}>
						<AnimatedAppText
							allowFontScaling={false}
							center
							className="text-[88px] tabular-nums tracking-[-3.52px]"
							style={[digit, colour]}
							variant="display"
						>
							{froms[i] === " " ? "" : froms[i]}
						</AnimatedAppText>
						<AnimatedAppText
							allowFontScaling={false}
							center
							className="text-[88px] tabular-nums tracking-[-3.52px]"
							style={[digit, colour]}
							variant="display"
						>
							{d}
						</AnimatedAppText>
					</Animated.View>
				</View>
			))}
		</Animated.View>
	);
}
