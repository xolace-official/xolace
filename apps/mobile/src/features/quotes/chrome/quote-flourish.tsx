import { useEffect } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
	Easing,
	FadeIn,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { EASE, T } from "../motion/quote-motion";
import { QuoteGlass } from "./quote-glass";
import { HEART_PATH } from "./quote-icons";
import { type InkPalette, textShadow, useQuoteInk } from "./quote-ink";

const BURST = 150;
const BURST_Y = 0.43;
/** The board's `pop`: (t, opacity, scale) stops, each segment on the stage ease. */
const POP = [
	[0, 0, 0.3],
	[0.22, 1, 1.12],
	[0.4, 1, 0.96],
	[0.62, 1, 1],
	[1, 0, 1.25],
] as const;
const LINEAR = { easing: Easing.linear, ...PLAY_AS_CHOSEN };
/** The toast: in over 10%, held to 82%, out. */
const TOAST_IN = 0.1;
const TOAST_HOLD = 0.82;
const TOAST_RISE = 10;
const TOAST_LIFT = 6;
const HINT = { delay: 300, ms: 400 } as const;

/** The heart's burst: a 150 pt heart at 43% height, 0 → 1.12 → .96 → 1 → out at 1.25, 950 ms. */
export function HeartBurst({
	burstKey,
	reduced,
}: {
	burstKey: number;
	reduced: boolean;
}) {
	const { height } = useWindowDimensions();
	const { resonate } = useQuoteInk();
	const t = useSharedValue(1);
	useEffect(() => {
		if (burstKey === 0 || reduced) {
			return;
		}
		t.set(0);
		t.set(withTiming(1, { duration: T.burst, ...LINEAR }));
	}, [burstKey, reduced, t]);
	const style = useAnimatedStyle(() => {
		const v = t.get();
		let i = 0;
		while (i < POP.length - 2 && v > POP[i + 1][0]) {
			i++;
		}
		const [t0, o0, s0] = POP[i];
		const [t1, o1, s1] = POP[i + 1];
		const k = EASE.stage(Math.min(1, Math.max(0, (v - t0) / (t1 - t0))));
		return {
			opacity: v >= 1 ? 0 : o0 + (o1 - o0) * k,
			transform: [{ scale: s0 + (s1 - s0) * k }],
		};
	});
	return (
		<Animated.View
			className="absolute left-1/2"
			pointerEvents="none"
			style={[
				{
					height: BURST,
					marginLeft: -BURST / 2,
					marginTop: -BURST / 2,
					shadowColor: resonate,
					shadowOffset: { height: 8, width: 0 },
					shadowOpacity: 0.45,
					shadowRadius: 15,
					top: height * BURST_Y,
					width: BURST,
				},
				style,
			]}
		>
			<Svg height={BURST} viewBox="0 0 24 24" width={BURST}>
				<Path d={HEART_PATH} fill={resonate} />
			</Svg>
		</Animated.View>
	);
}

/** The board's toast: a glass pill 56 pt under the top bar, 2.4 s. */
export function QuoteToast({
	toast,
	ink,
	reduced,
}: {
	toast: { text: string; key: number } | null;
	ink: InkPalette;
	reduced: boolean;
}) {
	const t = useSharedValue(1);
	useEffect(() => {
		if (!toast) {
			return;
		}
		t.set(0);
		t.set(withTiming(1, { duration: T.toast, ...LINEAR }));
	}, [toast, t]);
	const style = useAnimatedStyle(() => {
		const v = t.get();
		const out = (v - TOAST_HOLD) / (1 - TOAST_HOLD);
		let o = 1;
		let y = 0;
		if (v < TOAST_IN) {
			o = v / TOAST_IN;
			y = -TOAST_RISE * (1 - v / TOAST_IN);
		} else if (v >= TOAST_HOLD) {
			o = Math.max(0, 1 - out);
			y = -TOAST_LIFT * out;
		}
		return {
			opacity: v >= 1 ? 0 : o,
			transform: [{ translateY: reduced ? 0 : y }],
		};
	});
	if (!toast) {
		return null;
	}
	return (
		<View
			className="absolute top-safe-offset-[62px] right-0 left-0 items-center"
			pointerEvents="none"
		>
			<Animated.View accessibilityLiveRegion="polite" style={style}>
				<QuoteGlass
					className="h-9.5 justify-center rounded-full px-4"
					ink={ink}
				>
					<AppText
						accessibilityRole="alert"
						className="text-[13.5px]"
						style={{ color: ink.glassIcon }}
						variant="footnote"
						weight="semibold"
					>
						{toast.text}
					</AppText>
				</QuoteGlass>
			</Animated.View>
		</View>
	);
}

/** Clear view's hint at the bottom, fading in after .3 s. */
export function ClearHint({
	ink,
	text,
	reduced,
}: {
	ink: InkPalette;
	text: string;
	reduced: boolean;
}) {
	const { shadowColor } = useQuoteInk();
	return (
		<Animated.View
			className="absolute right-0 bottom-safe-offset-[6px] left-0"
			entering={
				reduced
					? FadeIn.duration(T.reduced).reduceMotion(PLAY_AS_CHOSEN.reduceMotion)
					: FadeIn.duration(HINT.ms)
							.delay(HINT.delay)
							.reduceMotion(PLAY_AS_CHOSEN.reduceMotion)
			}
			pointerEvents="none"
		>
			<AppText
				center
				className="text-[12.5px]"
				style={[
					{ color: ink.text2 },
					ink.shadow ? textShadow(shadowColor) : null,
				]}
				variant="caption"
				weight="medium"
			>
				{text}
			</AppText>
		</Animated.View>
	);
}
