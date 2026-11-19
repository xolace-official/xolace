import {
	BlurMask,
	Canvas,
	Circle,
	DashPathEffect,
	Path,
	RadialGradient,
	type SkPath,
	vec,
} from "@shopify/react-native-skia";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import type { KindlingColours } from "./kindling-colours";
import type { Trail } from "./trail-geometry";

/** The road (handoff §2.3), per leg bottom to top: road, marching dashes, glow, gold. */
const ROAD = {
	dash: { intervals: [7, 9], width: 2.6 },
	glow: { blur: 4, day: 0.38, dusk: 0.3, width: 13 },
	gold: 4.5,
	passedDash: 0.3,
	width: 22,
} as const;
/** The fire's glow is 240 pt across; the board's `radial-gradient(circle, …, 38%, 64%)`. */
const FIRE_GLOW_R = 120;
const GLOW_STOPS = [0, 0.54, 0.9];

export type TendFade = {
	/** The leg whose gold is fading in (−1 for none), and how far it is (0…1). */
	leg: SharedValue<number>;
	t: SharedValue<number>;
};

type Props = {
	trail: Trail;
	/** Per leg: its twig is tended (gold), or passed (dashes stopped, at .3). */
	lit: readonly boolean[];
	passed: readonly boolean[];
	/** The dashes' phase (0 → −16 every 530 ms), on the UI thread. */
	march: SharedValue<number>;
	fade: TendFade;
	fireGlow: SharedValue<number>;
	c: KindlingColours;
};

/** The road, its dashes and the gold, in one canvas under the stops. */
export function KindlingRoad({
	trail,
	lit,
	passed,
	march,
	fade,
	fireGlow,
	c,
}: Props) {
	const [fx, fy] = trail.flame;
	return (
		<Canvas
			pointerEvents="none"
			style={{
				height: trail.drawH,
				left: 0,
				position: "absolute",
				top: 0,
				width: trail.width,
			}}
		>
			<Circle cx={fx} cy={fy} opacity={fireGlow} r={FIRE_GLOW_R}>
				<RadialGradient
					c={vec(fx, fy)}
					colors={c.glow}
					positions={GLOW_STOPS}
					r={FIRE_GLOW_R}
				/>
			</Circle>
			{trail.roads.map((road, j) => (
				<RoadLeg
					c={c}
					fade={fade}
					j={j}
					key={road.key}
					lit={lit[j] ?? false}
					march={march}
					passed={passed[j] ?? false}
					path={road.path}
				/>
			))}
		</Canvas>
	);
}

type LegProps = {
	j: number;
	path: SkPath;
	lit: boolean;
	passed: boolean;
	march: SharedValue<number>;
	fade: TendFade;
	c: KindlingColours;
};

function RoadLeg({ j, path, lit, passed, march, fade, c }: LegProps) {
	const glowOpacity = c.day ? ROAD.glow.day : ROAD.glow.dusk;
	const gold = useDerivedValue(() => {
		if (!lit) {
			return 0;
		}
		return fade.leg.get() === j ? fade.t.get() : 1;
	});
	const glow = useDerivedValue(() => gold.get() * glowOpacity);
	// A lit leg's dashes go as its gold comes; a passed leg's stop, at .3.
	const dashes = useDerivedValue(() => {
		if (lit) {
			return 1 - gold.get();
		}
		return passed ? ROAD.passedDash : 1;
	});
	const phase = useDerivedValue(() => (passed ? 0 : march.get()));
	return (
		<>
			<Path
				color={c.road}
				path={path}
				strokeCap="round"
				strokeWidth={ROAD.width}
				style="stroke"
			/>
			<Path
				color={c.mark}
				opacity={dashes}
				path={path}
				strokeCap="round"
				strokeWidth={ROAD.dash.width}
				style="stroke"
			>
				<DashPathEffect intervals={[...ROAD.dash.intervals]} phase={phase} />
			</Path>
			<Path
				color={c.ember}
				opacity={glow}
				path={path}
				strokeCap="round"
				strokeWidth={ROAD.glow.width}
				style="stroke"
			>
				<BlurMask blur={ROAD.glow.blur} style="normal" />
			</Path>
			<Path
				color={c.ember}
				opacity={gold}
				path={path}
				strokeCap="round"
				strokeWidth={ROAD.gold}
				style="stroke"
			/>
		</>
	);
}
