import { Canvas, Path } from "@shopify/react-native-skia";
import { useEffect } from "react";
import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import {
	Easing,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { RollDigits } from "@/components/shared/roll-digits";
import { PRESETS, poseForSteadiness } from "@/components/xolace-face/pose";
import { useFace } from "@/components/xolace-face/use-face";
import { XolaceFace } from "@/components/xolace-face/xolace-face";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { COPY } from "@/features/you/copy";
import {
	DIAL_TICKS,
	type DialView,
	litTicks,
} from "@/features/you/steadiness/steadiness-model";
import {
	tickPath,
	useSnappedEnd,
	useTrack,
} from "@/features/you/steadiness/ticks";
import {
	LockedTrendChip,
	TrendChip,
} from "@/features/you/steadiness/trend-chip";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";

// Production's TickGauge (insights/glass.tsx): 240 pt, 56 ticks from 135° over 270°, outer
// radius 118, 20 long, 4 wide, round caps.
const GAUGE = 240;
const START = 135;
const SWEEP = 270;
const R_OUT = 118;
const TICK_LEN = 20;
const TICK_W = 4;
/** The fill; the number rolls with it. The face settles at 900 ms (production's). */
const FILL_MS = 1100;
const FILL_DELAY_MS = 120;
const SETTLE_MS = 900;
/** The chip sits in the 90° the sweep leaves open, its top at y 193 of the gauge box. */
const GAP_TOP = 193;
const FACE = 60;
const FACE_WAITING = 76;
const NUMBER_LINE = 54;
const TICKS = tickPath(
	DIAL_TICKS,
	START,
	SWEEP,
	R_OUT,
	TICK_LEN,
	GAUGE / 2,
	GAUGE / 2
);

/**
 * The glass dial's gauge (steadiness.md §2): the fan, the Xolace face above the number, the
 * change in the bottom gap. Fills once per visit with production's rising swell; the face
 * waits, then settles at 900 ms. `running`: false while the bar's chip shows, so its clock stops.
 */
export function Gauge({
	dial,
	plus,
	now,
	running,
	onLocked,
}: {
	dial: DialView;
	plus: boolean;
	now: Date;
	running: boolean;
	onLocked: () => void;
}) {
	const accent = useTokenColor("accent");
	const track = useTrack();
	const reduced = useEffectiveReducedMotion();
	const score = dial.lit ? dial.score : null;
	const lit = score === null ? 0 : litTicks(score);
	const progress = useSharedValue(reduced ? 1 : 0);
	const { end, opacity } = useSnappedEnd(progress, lit, DIAL_TICKS);
	const face = useFace(PRESETS.waiting, running);
	const { to, hold } = face;

	useEffect(() => {
		if (score === null) {
			return;
		}
		if (reduced) {
			progress.set(1);
			hold(poseForSteadiness(score));
			return;
		}
		progress.set(
			withDelay(
				FILL_DELAY_MS,
				withTiming(1, {
					duration: FILL_MS,
					easing: Easing.out(Easing.cubic),
					...PLAY_AS_CHOSEN,
				})
			)
		);
		const swell = setTimeout(() => Presets.swell(), FILL_DELAY_MS);
		const settle = setTimeout(() => to(poseForSteadiness(score)), SETTLE_MS);
		return () => {
			clearTimeout(swell);
			clearTimeout(settle);
		};
	}, [score, reduced, progress, to, hold]);

	return (
		<View style={{ height: GAUGE, width: GAUGE }}>
			<View
				accessibilityLabel={dial.label}
				accessibilityRole="image"
				accessible
				className="flex-1"
			>
				<Canvas style={{ height: GAUGE, position: "absolute", width: GAUGE }}>
					<Path
						color={track}
						path={TICKS}
						strokeCap="round"
						strokeWidth={TICK_W}
						style="stroke"
					/>
					{score === null ? null : (
						<Path
							color={accent}
							end={end}
							opacity={opacity}
							path={TICKS}
							start={0}
							strokeCap="round"
							strokeWidth={TICK_W}
							style="stroke"
						/>
					)}
				</Canvas>
				<View
					className="absolute inset-0 items-center justify-center"
					pointerEvents="none"
				>
					<View className={score === null ? "" : "-mt-1"}>
						<XolaceFace
							face={face}
							size={score === null ? FACE_WAITING : FACE}
						/>
					</View>
					{score === null ? null : (
						<View className="mt-0.5 flex-row items-end gap-0.75">
							<RollDigits
								className="font-display-bold text-[52px] tabular-nums tracking-[-1.56px]"
								durationMs={reduced ? 0 : FILL_MS}
								lineHeight={NUMBER_LINE}
								value={score}
								variant="display"
							/>
							<AppText
								className="mb-2.25 text-[14px] leading-[18px]"
								color="subtle"
								variant="footnote"
								weight="medium"
							>
								{COPY.steadiness.outOf}
							</AppText>
						</View>
					)}
				</View>
			</View>
			{score === null ? null : (
				<View
					className="absolute right-0 left-0 items-center"
					style={{ top: GAP_TOP }}
				>
					{plus ? (
						dial.lit && dial.trend ? (
							<TrendChip arrow now={now} trend={dial.trend} />
						) : null
					) : (
						<LockedTrendChip onPress={onLocked} />
					)}
				</View>
			)}
		</View>
	);
}
