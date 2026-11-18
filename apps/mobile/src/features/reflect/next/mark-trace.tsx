import {
	BlurMask,
	Canvas,
	Circle,
	Group,
	Path,
} from "@shopify/react-native-skia";
import {
	Easing,
	type SharedValue,
	useDerivedValue,
} from "react-native-reanimated";
import { useTokenColors } from "@/lib/use-token-color";
import { TILES } from "../motion";
import { type Mark, pointAt } from "./marks";

const S_MS = 1000;
const TRACE_S = TILES.traceMs / S_MS;
/** four-elements' tip: in over .04 s, out .12 s after the trace ends. */
const TIP_IN = 0.04;
const TIP_OUT = 0.12;
/** How long a pick's scene runs: the trace, the tip's fade, and a rest. */
export const RUN_S = TRACE_S + TIP_OUT + 0.5;
/** The board's trace ease (`.tile.on .tr`), with the block's even-speed tip on top. */
const TRACE_EASE = Easing.bezierFn(0.2, 0.8, 0.2, 1);
/** Board `.mark .tr`: 2.6 in the 44 box. */
const TRACE_W = 2.6;
const BOX = 44;
const TIP = { core: 0.65, coreR: 1, glow: 0.22, glowR: 6, r: 3.2 } as const;
const BLUR = { glow: 4, trace: 3 } as const;

function clamp01(x: number) {
	"worklet";
	return Math.min(1, Math.max(0, x));
}

type Props = {
	mark: Mark;
	/** Seconds since the tile was chosen. */
	age: SharedValue<number>;
	size: number;
	left: number;
};

/**
 * A chosen tile's mark, traced in ink with an ember glow, and the glowing tip that draws it at
 * even speed along the arc-length table (S13 four-elements-class-picker).
 */
export function MarkTrace({ mark, age, size, left }: Props) {
	const [ember, eink, glowColor, core] = useTokenColors([
		"ember",
		"eink",
		"reflect-trace-glow",
		"reflect-trace-core",
	]);
	const lookup = mark.lookup;
	const progress = useDerivedValue(() =>
		TRACE_EASE(clamp01(age.get() / TRACE_S))
	);
	const tip = useDerivedValue(
		() =>
			clamp01(age.get() / TIP_IN) *
			(1 - clamp01((age.get() - TRACE_S) / TIP_OUT))
	);
	const tipAt = useDerivedValue(() => pointAt(lookup, progress.get()));
	const tipX = useDerivedValue(() => tipAt.get().x);
	const tipY = useDerivedValue(() => tipAt.get().y);
	const glow = useDerivedValue(() => TIP.glow * tip.get());
	const coreOpacity = useDerivedValue(() => TIP.core * tip.get());

	return (
		<Canvas
			pointerEvents="none"
			style={{
				height: size,
				left,
				position: "absolute",
				top: left,
				width: size,
			}}
		>
			<Group transform={[{ scale: size / BOX }]}>
				<Path
					color={glowColor}
					end={progress}
					path={mark.path}
					strokeCap="round"
					strokeWidth={TRACE_W}
					style="stroke"
				>
					<BlurMask blur={BLUR.trace} style="normal" />
				</Path>
				<Path
					color={eink}
					end={progress}
					path={mark.path}
					strokeCap="round"
					strokeJoin="round"
					strokeWidth={TRACE_W}
					style="stroke"
				/>
				<Circle color={ember} cx={tipX} cy={tipY} opacity={glow} r={TIP.glowR}>
					<BlurMask blur={BLUR.glow} style="normal" />
				</Circle>
				<Circle color={ember} cx={tipX} cy={tipY} opacity={tip} r={TIP.r} />
				<Circle
					color={core}
					cx={tipX}
					cy={tipY}
					opacity={coreOpacity}
					r={TIP.coreR}
				/>
			</Group>
		</Canvas>
	);
}
