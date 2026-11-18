import { BlurMask, Path, type SkPath } from "@shopify/react-native-skia";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { useTokenColors } from "@/lib/use-token-color";
import { easeInOutFn, keyframes, seg, trimFn } from "../today-motion";
import { BEAT, STROKE } from "./kindling-model";

/** pulseRun: the highlight runs 0 → 30% of the loop, seen from 6% to 30%. */
const PULSE_POS: readonly (readonly [number, number])[] = [
	[0, -12],
	[0.3, 96],
	[1, 96],
];
const PULSE_OPACITY: readonly (readonly [number, number])[] = [
	[0, 0],
	[0.06, 0.95],
	[0.3, 0.95],
	[0.34, 0],
	[1, 0],
];

/** A lit stretch: the glow, the ember stroke trimming on with the wisp, and the highlight that runs it. */
export function Stretch({
	path,
	len,
	lit,
	drawing,
	beat,
	clock,
	low,
	ember,
}: {
	path: SkPath;
	len: number;
	lit: boolean;
	drawing: boolean;
	beat: SharedValue<number>;
	clock: SharedValue<number>;
	low: boolean;
	/** The lit stroke: the theme's ember. */
	ember: string;
}) {
	// The soft amber under the lit stroke and the highlight that runs it: fixed firelight.
	const [amber, highlight] = useTokenColors([
		"today-kindling-glow",
		"today-kindling-pulse",
	]);
	// The lit stroke trims on in step with the wisp.
	const end = useDerivedValue(() =>
		drawing
			? trimFn(seg(beat.get(), BEAT.travelAt, BEAT.travelAt + BEAT.travel))
			: lit
				? 1
				: 0
	);
	const pulse = useDerivedValue(
		() => (clock.get() % STROKE.pulse.period) / STROKE.pulse.period
	);
	const pulseStart = useDerivedValue(() =>
		Math.max(0, keyframes(pulse.get(), PULSE_POS, easeInOutFn) / len)
	);
	const pulseEnd = useDerivedValue(() =>
		Math.min(
			1,
			(keyframes(pulse.get(), PULSE_POS, easeInOutFn) + STROKE.pulse.length) /
				len
		)
	);
	const pulseOpacity = useDerivedValue(() =>
		keyframes(pulse.get(), PULSE_OPACITY, easeInOutFn)
	);
	if (!lit) {
		return null;
	}
	return (
		<>
			<Path
				color={amber}
				end={end}
				opacity={STROKE.glow.opacity}
				path={path}
				strokeCap="round"
				strokeWidth={STROKE.glow.width}
				style="stroke"
			>
				{low ? null : <BlurMask blur={STROKE.glow.blur} style="normal" />}
			</Path>
			<Path
				color={ember}
				end={end}
				path={path}
				strokeCap="round"
				strokeWidth={STROKE.lit.width}
				style="stroke"
			/>
			{drawing ? null : (
				<Path
					color={highlight}
					end={pulseEnd}
					opacity={pulseOpacity}
					path={path}
					start={pulseStart}
					strokeCap="round"
					strokeWidth={STROKE.pulse.width}
					style="stroke"
				/>
			)}
		</>
	);
}
