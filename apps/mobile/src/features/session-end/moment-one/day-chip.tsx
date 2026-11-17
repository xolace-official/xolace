import { useWindowDimensions, View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { EASE, LAYOUT, REDUCED_MS, T1 } from "../session-look";
import { clamp01 } from "../timeline";

const C = LAYOUT.chip;
/** The chip's label caps at 1.25×, as the titles do. */
const CHIP_MAX = 1.25;
const FLAME = { android: "local_fire_department", ios: "flame.fill" } as const;

type Props = {
	top: number;
	/** The streak before and after this session (equal when it didn't tick over). */
	from: number;
	to: number;
	clock: SharedValue<number>;
	reduced: boolean;
};

/**
 * Board `.dchip`: "Day 12 → 13". It pops in at .15 s (scale .6 → 1, .45 s),
 * and the digits roll up through an 18 pt window at .6 s (.5 s, cubic-bezier(.3,
 * 1.3, .5, 1)) as the day ticks over. Reduce Motion: a 200 ms fade, no roll.
 */
export function DayChip({ top, from, to, clock, reduced }: Props) {
	const ember = useTokenColor("ember");
	// The digits' window grows with Dynamic Type (capped as the label is), so the roll never clips.
	const win = C.window * Math.min(useWindowDimensions().fontScale, CHIP_MAX);
	const pop = useAnimatedStyle(() => {
		const c = clock.get();
		if (reduced) {
			return {
				opacity: clamp01((c - T1.chip.at) / REDUCED_MS),
				transform: [{ scale: 1 }],
			};
		}
		const e = EASE.pop(clamp01((c - T1.chip.at) / T1.chip.ms));
		return {
			opacity: c < T1.chip.at ? 0 : clamp01(e),
			transform: [{ scale: T1.chip.from + (1 - T1.chip.from) * e }],
		};
	});
	const rolls = from !== to && !reduced;
	const roll = useAnimatedStyle(() => {
		const e = rolls
			? EASE.roll(clamp01((clock.get() - T1.roll.at) / T1.roll.ms))
			: 1;
		return { transform: [{ translateY: -win * e }] };
	});
	// RN scales the line height with the font, so the window matches it.
	const style = { fontSize: C.size, lineHeight: C.window } as const;
	const digits = (n: number, className?: string) => (
		<AppText
			className={className}
			color="emberInk"
			maxFontSizeMultiplier={CHIP_MAX}
			style={style}
			variant="footnote"
			weight="bold"
		>
			{String(n)}
		</AppText>
	);
	return (
		<View
			className="absolute inset-x-0 items-center"
			pointerEvents="none"
			style={{ top }}
		>
			<Animated.View
				accessibilityLabel={COPY.chip(to)}
				accessible
				className="flex-row items-center rounded-full bg-ember-wash"
				style={[
					{
						gap: C.gap,
						height: C.height,
						paddingLeft: C.padLeft,
						paddingRight: C.padRight,
					},
					pop,
				]}
			>
				<Icon color={ember} name={FLAME} size={C.icon} />
				<View className="flex-row items-center">
					<AppText
						color="emberInk"
						maxFontSizeMultiplier={CHIP_MAX}
						style={style}
						variant="footnote"
						weight="bold"
					>
						{COPY.chip(to).replace(/\d+$/, "")}
					</AppText>
					<View className="overflow-hidden" style={{ height: win }}>
						{digits(Math.max(from, to), "opacity-0 tabular-nums")}
						<Animated.View className="absolute top-0 left-0" style={roll}>
							{digits(from, "tabular-nums")}
							{digits(to, "tabular-nums")}
						</Animated.View>
					</View>
				</View>
			</Animated.View>
		</View>
	);
}
