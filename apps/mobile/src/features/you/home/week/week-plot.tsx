import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { BODY_MAX_SCALE } from "@/design/type";
import { UsualBand, UsualLabel } from "@/features/you/home/week/usual-band";
import { WeekBar } from "@/features/you/home/week/week-bar";
import {
	dayAt,
	type IntensityDay,
	levelY,
	PLOT_H,
	peakIndex,
	SCALE,
	type Usual,
} from "@/features/you/home/week/week-model";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";

/** Day letters sit 6 pt under the bars, 12 pt tall: the bars' baseline from the bottom. */
const BASE = 18;
/** Before the readout claims the touch, as on Your days. */
const HOLD_MS = 180;
/**
 * The scale labels' gutter (§6), and their line height before Dynamic Type. AppText caps body
 * text at `BODY_MAX_SCALE` (1.8), so a label is at most 19.8 pt tall: the four, 24 pt apart,
 * never crowd, and all four stay at every text size. A label wider than the gutter shrinks.
 */
const GUTTER = 64;
const LABEL_LINE = 11;
const LABEL_MIN_SCALE = 0.6;

/**
 * The plot: your usual behind seven bars, the scale in its own right gutter with each label on
 * its level. Press and hold, then drag, to read a day (`onHeld` only when the day changes, with
 * a selection haptic). Weeks page with the arrows only: a swipe here would fight the tabs'
 * own swipe (Insights ↔ Follow-ups), which the native pager owns.
 */
export function WeekPlot({
	days,
	usual,
	label,
	initialHeld,
	onHeld,
}: {
	days: IntensityDay[];
	usual: Usual | null;
	label: string;
	initialHeld: number | null;
	onHeld: (index: number | null) => void;
}) {
	const reduced = useEffectiveReducedMotion();
	const { fontScale } = useWindowDimensions();
	const accent = useTokenColor("accent");
	const ember = useTokenColor("ember");
	const [width, setWidth] = useState(0);
	const plotW = useSharedValue(0);
	const held = useSharedValue(initialHeld ?? -1);
	const peak = peakIndex(days);

	const pick = (x: number) => {
		"worklet";
		const i = dayAt(x, plotW.get());
		if (i !== null && i !== held.get()) {
			held.set(i);
			scheduleOnRN(onHeld, i);
		}
	};
	// `onStart`, not `onBegin`: a scroll swipe mustn't light a bar.
	const hold = Gesture.Pan()
		.minDistance(0)
		.activateAfterLongPress(HOLD_MS)
		.onStart((e) => pick(e.x))
		.onUpdate((e) => pick(e.x))
		.onFinalize(() => {
			if (held.get() < 0) {
				return;
			}
			held.set(-1);
			scheduleOnRN(onHeld, null);
		});
	// iOS scales `lineHeight` itself, so the line stays fixed; only the offset follows the
	// text's own (capped) scale.
	const labelH = LABEL_LINE * Math.min(fontScale, BODY_MAX_SCALE);

	return (
		<View className="mt-1.5 flex-row">
			<GestureDetector gesture={hold}>
				<View
					accessibilityLabel={label}
					accessibilityRole="image"
					accessible
					className="flex-1"
					onLayout={(e) => {
						const w = e.nativeEvent.layout.width;
						plotW.set(w);
						setWidth(w);
					}}
					style={{ height: PLOT_H + BASE }}
				>
					{usual && width > 0 ? (
						<UsualBand base={BASE} usual={usual} width={width} />
					) : null}
					<View className="absolute inset-0 flex-row gap-1.5">
						{days.map((d, i) => (
							<WeekBar
								accent={accent}
								ember={ember}
								full={d.isToday || i === peak}
								held={held}
								index={i}
								intensity={d.intensity}
								key={d.dayName}
								letter={d.label}
								reduced={reduced}
								today={d.isToday}
							/>
						))}
					</View>
					{usual ? <UsualLabel base={BASE} usual={usual} /> : null}
				</View>
			</GestureDetector>
			<View
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				style={{ height: PLOT_H + BASE, marginLeft: 12, width: GUTTER }}
			>
				{SCALE.map((s) => (
					<AppText
						adjustsFontSizeToFit
						className="absolute right-0 left-0 text-right text-[9px]"
						color="subtle"
						key={s.label}
						minimumFontScale={LABEL_MIN_SCALE}
						numberOfLines={1}
						style={{
							bottom: BASE + levelY(s.at) - labelH / 2,
							lineHeight: LABEL_LINE,
						}}
						variant="caption"
						weight="medium"
					>
						{s.label}
					</AppText>
				))}
			</View>
		</View>
	);
}
