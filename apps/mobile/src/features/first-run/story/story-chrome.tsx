import { Pressable, View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { AnimatedAppText } from "@/components/shared/app-text";
import { BEATS, STORY } from "../copy";
import { BOARD_TEXT_MAX } from "../first-run-layout";
import { clamp, ease, mixRGB, type Stage, seg } from "../first-run-motion";
import { css, STORY_COLORS } from "../first-run-palette";
import { ageB, ageT, DUR, NB, type SEng, seatOpen, WE } from "./story-scene";

/** Board `.bars`: top 56, 20 pt in, six equal segments 4 apart, 3 tall, white 22%, the fill white. */
const BARS = { gap: 4, h: 3, side: 20, top: 56 };
/** Board `.seatb`: top 756, 24 pt in, 54 tall; solid ember on the last beat 3 s after its words. */
const CALL = { h: 54, side: 24, top: 756 };
const EMBER = STORY_COLORS.ember;
/** How solid the call is: from 3 s after the last beat's words, over 500 ms. */
function solidOf(e: SEng) {
	"worklet";
	if (e.beat !== NB - 1) {
		return 0;
	}
	return e.rm ? 1 : ease(seg(ageB(e), WE[NB - 1] + 3000, WE[NB - 1] + 3500));
}
const DARK = STORY_COLORS.emberInk;

function Bar({ eng, i }: { eng: SharedValue<SEng>; i: number }) {
	const fill = useAnimatedStyle(() => {
		const e = eng.get();
		return {
			width: `${i < e.beat ? 100 : i === e.beat ? 100 * clamp(e.bar / DUR[i]) : 0}%`,
		};
	});
	return (
		<View
			className="flex-1 overflow-hidden rounded-[2px] bg-white/22"
			style={{ height: BARS.h }}
		>
			<Animated.View className="bg-white" style={[{ height: BARS.h }, fill]} />
		</View>
	);
}

/** The bars at the top, as in any story: the current one fills over its beat. */
export function StoryBars({
	eng,
	stage,
}: {
	eng: SharedValue<SEng>;
	stage: Stage;
}) {
	const style = useAnimatedStyle(() => {
		const e = eng.get();
		return {
			opacity: (1 - seatOpen(e)) * (e.rm ? 1 : Math.min(1, ageT(e) / 400)),
		};
	});
	return (
		<Animated.View
			accessible={false}
			className="absolute flex-row"
			pointerEvents="none"
			style={[
				{
					gap: BARS.gap,
					left: BARS.side,
					right: BARS.side,
					top: BARS.top + stage.dy,
				},
				style,
			]}
		>
			{BEATS.map((b, i) => (
				<Bar eng={eng} i={i} key={b.id} />
			))}
		</Animated.View>
	);
}

/** "Pull up a seat": ember text on an 8% ember fill, turning solid on the last beat. */
export function SeatCall({
	eng,
	stage,
	hidden,
	onPress,
}: {
	eng: SharedValue<SEng>;
	stage: Stage;
	hidden: boolean;
	onPress: () => void;
}) {
	const box = useAnimatedStyle(() => {
		const e = eng.get();
		const so = seatOpen(e);
		const solid = solidOf(e);
		return {
			backgroundColor: css(EMBER, 0.08 + 0.92 * solid),
			opacity: (1 - so) * (e.rm ? 1 : ease(seg(ageT(e), 500, 900))),
		};
	});
	const ink = useAnimatedStyle(() => {
		const e = eng.get();
		const solid = solidOf(e);
		return { color: css(mixRGB(EMBER, DARK, solid)) };
	});
	const icon = useAnimatedStyle(() => {
		const e = eng.get();
		const solid = solidOf(e);
		return { opacity: 1 - solid };
	});
	return (
		<Animated.View
			accessibilityElementsHidden={hidden}
			className="absolute border border-continuous"
			pointerEvents={hidden ? "none" : "auto"}
			style={[
				{
					borderColor: css(EMBER, 0.35),
					borderRadius: CALL.h / 2,
					height: CALL.h,
					left: CALL.side,
					right: CALL.side,
					top: CALL.top + stage.dy,
				},
				box,
			]}
		>
			<Pressable
				accessibilityLabel={STORY.seatButton}
				accessibilityRole="button"
				className="flex-1 flex-row items-center justify-center gap-2"
				onPress={onPress}
			>
				<View className="size-4">
					<Animated.View className="absolute" style={icon}>
						<Person color={css(EMBER)} />
					</Animated.View>
					<PersonSolid eng={eng} />
				</View>
				<AnimatedAppText
					className="text-[16px] leading-[21px]"
					maxFontSizeMultiplier={BOARD_TEXT_MAX}
					numberOfLines={1}
					style={ink}
					weight="semibold"
				>
					{STORY.seatButton}
				</AnimatedAppText>
			</Pressable>
		</Animated.View>
	);
}

function Person({ color }: { color: string }) {
	return (
		<Svg height={16} viewBox="0 0 24 24" width={16}>
			<Circle cx={12} cy={7} fill={color} r={4} />
			<Path d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5z" fill={color} />
		</Svg>
	);
}

function PersonSolid({ eng }: { eng: SharedValue<SEng> }) {
	const style = useAnimatedStyle(() => {
		const e = eng.get();
		return { opacity: solidOf(e) };
	});
	return (
		<Animated.View className="absolute" style={style}>
			<Person color={css(DARK)} />
		</Animated.View>
	);
}
