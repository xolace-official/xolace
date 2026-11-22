import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import Svg, { Path as SvgPath } from "react-native-svg";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { fadeUp } from "@/design/entering";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useTokenColors } from "@/lib/use-token-color";
import { LAYOUT } from "../layout";
import { TILES } from "../motion";
import { MarkTrace, RUN_S } from "./mark-trace";
import { MARKS } from "./marks";

const WELL = LAYOUT.next.mark;
const ICON = 34;
const BOX = 44;
const S_MS = 1000;
const RISE_EASE = Easing.bezier(0.23, 1, 0.32, 1);
const REST = { opacity: 0.35, width: 2.2 } as const;
const LIFT = { cap: 1.045, decay: 10, freq: 14, settled: 0.65 } as const;
const BORDER = { chosen: 1.5, rest: 1 } as const;

function liftSpring(age: number) {
	"worklet";
	if (age >= LIFT.settled) {
		return 1;
	}
	const wave =
		Math.cos(LIFT.freq * age) +
		(LIFT.decay / LIFT.freq) * Math.sin(LIFT.freq * age);
	return Math.max(
		0,
		Math.min(LIFT.cap, 1 - Math.exp(-LIFT.decay * age) * wave)
	);
}

type Props = {
	index: number;
	title: string;
	sub: string;
	chosen: boolean;
	onPress: () => void;
	reduced: boolean;
};

export function PathTile({
	index,
	title,
	sub,
	chosen,
	onPress,
	reduced,
}: Props) {
	const [ember, separator, subtle, shadow] = useTokenColors([
		"ember",
		"separator",
		"subtle",
		"reflect-tile-shadow",
	]);
	const mark = MARKS[index] ?? MARKS[0];
	const age = useSharedValue(0);

	useEffect(() => {
		if (!chosen) {
			age.set(0);
			return;
		}
		age.set(reduced ? RUN_S : 0);
		if (!reduced) {
			age.set(
				withTiming(RUN_S, {
					duration: RUN_S * S_MS,
					easing: Easing.linear,
					...PLAY_AS_CHOSEN,
				})
			);
		}
	}, [chosen, age, reduced]);

	const lift = useAnimatedStyle(() => ({
		borderColor: chosen ? ember : separator,
		borderWidth: chosen ? BORDER.chosen : BORDER.rest,
		transform: [
			{ translateY: -TILES.lift * (chosen ? liftSpring(age.get()) : 0) },
		],
	}));

	return (
		<Animated.View
			entering={fadeUp(
				(TILES.firstS + index * TILES.stepS) * S_MS,
				TILES.inMs,
				TILES.rise,
				reduced,
				RISE_EASE
			)}
		>
			<Animated.View
				className="rounded-card border-continuous bg-surface"
				style={[
					chosen ? { boxShadow: `0px 16px 30px -18px ${shadow}` } : null,
					lift,
				]}
			>
				<PressScale
					accessibilityLabel={`${title}. ${sub}`}
					accessibilityRole="button"
					accessibilityState={{ selected: chosen }}
					className="flex-row items-center gap-4 py-4 pr-4.5 pl-3.5"
					onPress={onPress}
				>
					<View
						className="items-center justify-center rounded-[16px] bg-surface-secondary"
						style={{ height: WELL, width: WELL }}
					>
						<Svg height={ICON} viewBox={`0 0 ${BOX} ${BOX}`} width={ICON}>
							<SvgPath
								d={mark.svg}
								fill="none"
								opacity={REST.opacity}
								stroke={subtle}
								strokeLinecap="round"
								strokeWidth={REST.width}
							/>
						</Svg>
						{chosen ? (
							<MarkTrace
								age={age}
								left={(WELL - ICON) / 2}
								mark={mark}
								size={ICON}
							/>
						) : null}
					</View>
					<View className="flex-1 gap-[3px]">
						<AppText
							className="text-[17px] leading-[22px]"
							variant="body"
							weight="semibold"
						>
							{title}
						</AppText>
						<AppText className="text-[13.5px]" color="muted" variant="detail">
							{sub}
						</AppText>
					</View>
				</PressScale>
			</Animated.View>
		</Animated.View>
	);
}
