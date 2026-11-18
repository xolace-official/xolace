import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	Easing,
	useAnimatedProps,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { COPY } from "@/features/you/copy";
import type { WeekDay } from "@/features/you/home/days-model";
import { useYouHome } from "@/features/you/home/you-data";
import { useYouUi } from "@/features/you/home/you-ui";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";

const DISC = 30;
/** Today's ring: a page-coloured gap, then 1.5 pt of ember, round the lit disc. */
const RING_BOX = DISC + 7;
const RING_STROKE = 1.5;
const RING_R = RING_BOX / 2 - RING_STROKE / 2;
const RING_C = 2 * Math.PI * RING_R;
const RING_MS = 900;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** The week: seven discs, Monday first. A tap goes to Your days with this week ringed. */
export function WeekRow() {
	const { state } = useYouHome();
	const { tapWeek } = useYouUi();
	const week = state.week;
	if (!week) {
		// Holds the row's height while the history loads.
		return <View className="mt-3.5 h-[52px]" />;
	}
	const shown = week.filter((d) => d.state === "lit").length;
	const open = state.days !== null;
	return (
		<PressScale
			accessibilityLabel={COPY.streak.week(shown, open)}
			accessibilityRole="button"
			className="mt-3.5 flex-row justify-between px-0.5 py-1"
			disabled={!open}
			haptic={playSoftPress}
			onPress={tapWeek}
		>
			{week.map((d) => (
				<Day day={d} key={d.dayKey} />
			))}
		</PressScale>
	);
}

/** One day: lit (ember, a small flame), frozen (frost, dashed), quiet, or ahead. */
function Day({ day }: { day: WeekDay }) {
	const background = useTokenColor("background");
	const lit = day.state === "lit";
	// size-7.5 is DISC (30).
	const disc = "size-7.5 items-center justify-center rounded-full";
	let face = (
		<View
			className={cn(
				disc,
				day.today
					? "border-2 border-foreground"
					: "border-[1.5px] border-separator"
			)}
		/>
	);
	if (lit) {
		face = (
			<View className={cn(disc, "bg-ember")}>
				<Icon
					color={background}
					name={{ android: "local_fire_department", ios: "flame.fill" }}
					size={12}
				/>
			</View>
		);
	} else if (day.state === "frozen") {
		face = (
			<View
				className={cn(
					disc,
					"border-[1.5px] border-frost border-dashed bg-frost/14"
				)}
			/>
		);
	}
	return (
		<View
			className={cn(
				"w-9 items-center gap-1.5",
				day.state === "future" ? "opacity-40" : "opacity-100"
			)}
		>
			<View className="size-7.5 items-center justify-center">
				{face}
				{day.today && lit ? <TodayRing /> : null}
			</View>
			<AppText
				className="text-[11.5px] leading-3.5"
				color={day.today ? "foreground" : "subtle"}
				variant="caption"
				weight="semibold"
			>
				{day.letter}
			</AppText>
		</View>
	);
}

/** Today, once lit: an ember ring that draws itself round over 900 ms. */
function TodayRing() {
	const ember = useTokenColor("ember");
	const reduced = useEffectiveReducedMotion();
	const drawn = useSharedValue(reduced ? 1 : 0);
	useEffect(() => {
		if (!reduced) {
			drawn.set(
				withTiming(1, {
					duration: RING_MS,
					easing: Easing.out(Easing.cubic),
					...PLAY_AS_CHOSEN,
				})
			);
		}
	}, [reduced, drawn]);
	const props = useAnimatedProps(() => ({
		strokeDashoffset: RING_C * (1 - drawn.get()),
	}));
	const offset = (DISC - RING_BOX) / 2;
	return (
		<Svg
			height={RING_BOX}
			style={{
				left: offset,
				position: "absolute",
				top: offset,
				transform: [{ rotate: "-90deg" }],
			}}
			width={RING_BOX}
		>
			<AnimatedCircle
				animatedProps={props}
				cx={RING_BOX / 2}
				cy={RING_BOX / 2}
				fill="none"
				r={RING_R}
				stroke={ember}
				strokeDasharray={`${RING_C} ${RING_C}`}
				strokeWidth={RING_STROKE}
			/>
		</Svg>
	);
}
