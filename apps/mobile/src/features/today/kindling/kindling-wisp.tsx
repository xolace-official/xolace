import { BlurMask, Circle, Group } from "@shopify/react-native-skia";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { clearOf } from "@/design/clear-of";
import { keyframes } from "@/design/keyframes";
import { useTokenColors } from "@/lib/use-token-color";
import { seg, trimFn } from "../today-motion";
import { alongX, alongY, type PathGeometry } from "./kindling-geometry";
import { BEAT, WISP } from "./kindling-model";

/** The wisp's far glow: the lit stroke's ember at 35%. */
const WISP_FAR = 0.35;

/** wispRun: in by 8%, out from 88%. */
const WISP_OPACITY: readonly (readonly [number, number])[] = [
	[0, 0],
	[0.08, 1],
	[0.88, 1],
	[1, 0],
];

/** The light that runs the next stretch, with two tail dots 60 and 120 ms behind. */
export function Wisp({
	geo,
	seg: j,
	beat,
	low,
}: {
	geo: PathGeometry;
	seg: number;
	beat: SharedValue<number>;
	low: boolean;
}) {
	return (
		<>
			{WISP.tails.map(([r, alpha], i) => (
				<WispDot
					alpha={alpha}
					beat={beat}
					delay={BEAT.tails[i] ?? 0}
					geo={geo}
					key={r}
					low={low}
					r={r}
					seg={j}
				/>
			))}
			<WispDot
				alpha={1}
				beat={beat}
				delay={0}
				geo={geo}
				low={low}
				r={WISP.r}
				seg={j}
			/>
		</>
	);
}

function WispDot({
	geo,
	seg: j,
	beat,
	delay,
	r,
	alpha,
	low,
}: {
	geo: PathGeometry;
	seg: number;
	beat: SharedValue<number>;
	delay: number;
	r: number;
	alpha: number;
	low: boolean;
}) {
	// The glow and core are fixed light; the far glow follows the theme's ember.
	const [ember, glow, core] = useTokenColors([
		"ember",
		"today-kindling-wisp-glow",
		"today-kindling-wisp-core",
	]);
	const table = geo.tables[j];
	const t = useDerivedValue(() =>
		seg(beat.get(), BEAT.travelAt + delay, BEAT.travelAt + delay + BEAT.travel)
	);
	const cx = useDerivedValue(() => alongX(table, trimFn(t.get())));
	const cy = useDerivedValue(() => alongY(table, trimFn(t.get())));
	const opacity = useDerivedValue(() =>
		t.get() <= 0 || t.get() >= 1
			? 0
			: alpha * keyframes(t.get(), WISP_OPACITY, trimFn)
	);
	return (
		<Group opacity={opacity}>
			<Circle color={clearOf(ember, WISP_FAR)} cx={cx} cy={cy} r={r + 8}>
				{low ? null : <BlurMask blur={r + 6} style="normal" />}
			</Circle>
			<Circle color={glow} cx={cx} cy={cy} r={r + 4}>
				{low ? null : <BlurMask blur={r} style="normal" />}
			</Circle>
			<Circle color={core} cx={cx} cy={cy} r={r} />
		</Group>
	);
}
