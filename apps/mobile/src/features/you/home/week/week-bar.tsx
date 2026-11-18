import { View } from "react-native";
import Animated, {
	interpolateColor,
	ReduceMotion,
	type SharedValue,
	useAnimatedStyle,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { EaseView } from "@/design/ease";
import { barHeight, PLOT_H } from "@/features/you/home/week/week-model";

/** The held bar's column widens ×1.36 on this spring (NC's mood-stack-columns `WIDEN`). */
const WIDEN = 1.36;
const FOCUS_SPRING = {
	damping: 18,
	reduceMotion: ReduceMotion.Never,
	stiffness: 190,
};
const MAX_W = 30;
const HELD_MAX_W = 40;
const DIM = 0.4;
const REST = 0.65;
const DIM_MS = 150;
/** Production's grow-in. */
const GROW = { damping: 20, stiffness: 180, type: "spring" } as const;

/**
 * One day's column: production's bar (height and colour from intensity, accent low to ember
 * high; today and the peak full, the rest .65; a native scaleY grow-in that still lands at full
 * height if the spring misses, so it stays on Ease), the day's letter 6 pt under it. While a day
 * is held, its column widens and the others dim to .4, all on the UI thread.
 */
export function WeekBar({
	index,
	intensity,
	letter,
	today,
	full,
	held,
	accent,
	ember,
	reduced,
}: {
	index: number;
	intensity: number | null;
	letter: string;
	today: boolean;
	/** Today or the week's peak. */
	full: boolean;
	held: SharedValue<number>;
	accent: string;
	ember: string;
	reduced: boolean;
}) {
	const column = useAnimatedStyle(() => {
		const on = held.get() === index;
		const grow = on ? WIDEN : 1;
		return {
			flexGrow: reduced ? grow : withSpring(grow, FOCUS_SPRING),
		};
	});
	const bar = useAnimatedStyle(() => {
		const h = held.get();
		const on = h === index;
		const opacity = h < 0 ? (full ? 1 : REST) : on ? 1 : DIM;
		const maxWidth = on ? HELD_MAX_W : MAX_W;
		return {
			maxWidth: reduced ? maxWidth : withSpring(maxWidth, FOCUS_SPRING),
			opacity: withTiming(opacity, {
				duration: DIM_MS,
				reduceMotion: ReduceMotion.Never,
			}),
		};
	});
	const progress = intensity === null ? 0 : intensity / 10;
	const color =
		intensity === null
			? `${accent}30`
			: interpolateColor(
					progress,
					[0, 0.5, 1],
					[`${accent}28`, `${accent}99`, ember]
				);

	return (
		<Animated.View
			className="flex-1 basis-0 items-center gap-1.5"
			style={column}
		>
			<View
				className="w-full items-center justify-end"
				style={{ height: PLOT_H }}
			>
				<Animated.View className="w-full" style={bar}>
					<EaseView
						animate={{ scaleY: 1 }}
						initialAnimate={{ scaleY: reduced || intensity === null ? 1 : 0 }}
						style={{ height: barHeight(intensity) }}
						transformOrigin={{ x: 0.5, y: 1 }}
						transition={GROW}
					>
						<View
							className="flex-1 rounded-[7px] border-continuous"
							style={{ backgroundColor: color }}
						/>
					</EaseView>
				</Animated.View>
			</View>
			<AppText
				className="text-[10px] leading-3"
				color={today ? "foreground" : "subtle"}
				variant="caption"
				weight={today ? "bold" : undefined}
			>
				{letter}
			</AppText>
		</Animated.View>
	);
}
