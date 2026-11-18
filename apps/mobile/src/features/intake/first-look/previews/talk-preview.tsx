// Talk's preview: a play button with a ring that pulses while the row is open, a waveform that
// rises once, and "Try it", which opens production's Talk demo.
import { View } from "react-native";
import Animated, {
	Easing,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { EaseView } from "@/design/ease";
import { loopProps, useLoopRun } from "@/design/ease-loops";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";
import { FIRST_LOOK } from "../copy";
import { unit } from "../first-look-motion";
import { useAct } from "./use-act";

const WAVE_LEN = 20;
const WAVE_STEP = 29;
const BARS = Array.from(
	{ length: WAVE_LEN },
	(_, i) => 6 + ((i * WAVE_STEP) % WAVE_LEN)
);
const BAR_FROM_MS = 250;
const BAR_STAGGER_MS = 30;
const BAR_MS = 500;
const ACT_MS = BAR_FROM_MS + BARS.length * BAR_STAGGER_MS + BAR_MS;
const BAR_EASE = Easing.bezierFn(0.3, 1.4, 0.5, 1);
const PULSE_DELAY_MS = 900;
const PULSE_MS = 1400;
const RING = {
	from: { opacity: 0.45, scale: 1 },
	to: { opacity: 0, scale: 1.32 },
};

function Bar({
	act,
	h,
	i,
}: {
	act: SharedValue<number>;
	h: number;
	i: number;
}) {
	const style = useAnimatedStyle(() => {
		const p = unit((act.get() - BAR_FROM_MS - i * BAR_STAGGER_MS) / BAR_MS);
		return {
			opacity: 0.25 + 0.55 * p,
			transform: [{ scaleY: 0.15 + 0.85 * BAR_EASE(p) }],
		};
	});
	return (
		<Animated.View
			className="flex-1 rounded-[2px] bg-ember"
			style={[{ height: h }, style]}
		/>
	);
}

type Props = { onTry?: () => void; open: boolean; reduced: boolean };

export function TalkPreview({ onTry, open, reduced }: Props) {
	const act = useAct(open, reduced, ACT_MS);
	const onEmber = useTokenColor("offer-ink");
	const pulsing = open && !reduced;
	// Remounts the ring each time the row opens, so its loop starts again (Ease 0.9).
	const run = useLoopRun(pulsing);
	return (
		<PressScale
			accessibilityLabel={FIRST_LOOK.a11y.tryIt}
			accessibilityRole="button"
			accessibilityState={{ disabled: !onTry }}
			className="h-14 flex-row items-center gap-2.5 rounded-full border-[1.5px] border-ember/55 bg-surface-secondary px-[4.5px]"
			disabled={!onTry}
			haptic={playSoftPress}
			onPress={onTry}
			style={{ borderCurve: "continuous" }}
		>
			<View className="size-11 items-center justify-center rounded-full bg-ember">
				{pulsing ? (
					<EaseView
						className="absolute top-0 left-0 size-11 rounded-full bg-ember"
						key={run}
						{...loopProps({
							delay: PULSE_DELAY_MS,
							easing: "linear",
							from: RING.from,
							mode: "repeat",
							periodMs: PULSE_MS,
							reduced,
							to: RING.to,
						})}
					/>
				) : null}
				<Svg
					height={15}
					style={{ marginLeft: 2 }}
					viewBox="0 0 24 24"
					width={15}
				>
					<Path d="M8 5.5v13l11-6.5z" fill={onEmber} />
				</Svg>
			</View>
			<View className="h-7 flex-1 flex-row items-center gap-[2.5px]">
				{BARS.map((h, i) => (
					<Bar act={act} h={h} i={i} key={i} />
				))}
			</View>
			<View className="mr-1 h-7.5 justify-center rounded-full bg-ember px-3">
				<AppText
					className="text-offer-ink"
					variant="footnote"
					weight="semibold"
				>
					{FIRST_LOOK.tryIt}
				</AppText>
			</View>
		</PressScale>
	);
}
