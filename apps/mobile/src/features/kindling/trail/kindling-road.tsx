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
import { type Burn, goldEnd, legBurning } from "./burn";
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
	/**
	 * The burns in flight and their clock (still while nothing burns): a burning leg's gold runs
	 * behind its spark.
	 */
	burns: SharedValue<Burn[]>;
	time: SharedValue<number>;
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
	burns,
	time,
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
					burns={burns}
					c={c}
					fade={fade}
					j={j}
					key={road.key}
					lit={lit[j] ?? false}
					march={march}
					passed={passed[j] ?? false}
					path={road.path}
					time={time}
					trail={trail}
				/>
			))}
		</Canvas>
	);
}

type LegProps = {
	j: number;
	path: SkPath;
	trail: Trail;
	lit: boolean;
	passed: boolean;
	march: SharedValue<number>;
	fade: TendFade;
	burns: SharedValue<Burn[]>;
	time: SharedValue<number>;
	c: KindlingColours;
};

/** Below this the gold has no length yet. */
const NO_GOLD = 0.001;

function RoadLeg({
	j,
	path,
	trail,
	lit,
	passed,
	march,
	fade,
	burns,
	time,
	c,
}: LegProps) {
	const glowOpacity = c.day ? ROAD.glow.day : ROAD.glow.dusk;
	// How far the gold reaches: the burn's head while it runs, else all of a lit leg.
	const end = useDerivedValue(() =>
		goldEnd(trail, burns.get(), lit ? 1 : 0, j, time.get())
	);
	const gold = useDerivedValue(() => {
		if (end.get() <= NO_GOLD) {
			return 0;
		}
		return fade.leg.get() === j ? fade.t.get() : 1;
	});
	const glow = useDerivedValue(() => gold.get() * glowOpacity);
	// A lit leg's dashes go once the burn has passed (or as Reduce Motion's gold comes); a passed
	// leg's stop, at .3.
	const dashes = useDerivedValue(() => {
		if (lit && !legBurning(burns.get(), j, time.get())) {
			return fade.leg.get() === j ? 1 - fade.t.get() : 0;
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
				end={end}
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
				end={end}
				opacity={gold}
				path={path}
				strokeCap="round"
				strokeWidth={ROAD.gold}
				style="stroke"
			/>
		</>
	);
}
