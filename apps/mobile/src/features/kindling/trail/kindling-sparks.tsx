import {
	Blur,
	BlurMask,
	Canvas,
	Circle,
	Path,
} from "@shopify/react-native-skia";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { arrivalOf, type Burn, END } from "./burn";
import { fxPaths } from "./burn-art";
import { useSparkColours } from "./kindling-colours";
import { FLASH, SparkGlow, StopFlash } from "./spark-parts";
import type { Trail } from "./trail-geometry";

/** fuse-burn's layer sizes; the catch's flash is a 90 pt circle at the flame. */
const FX = {
	emberWidth: 3.4,
	fireFlashR: 45,
	hotWidth: 1.7,
	smoke: { blur: 7, day: 0.14, dusk: 0.2 },
	warmWidth: 1.3,
} as const;
/** At most three sparks run at once (two tends 300 ms apart, and a catch): fixed slots. */
const SLOTS = ["spark0", "spark1", "spark2"] as const;

type Props = {
	trail: Trail;
	burns: SharedValue<Burn[]>;
	time: SharedValue<number>;
	/** The trail clock when the fire's embers began rising (−1: none). */
	embersAt: SharedValue<number>;
	day: boolean;
};

/**
 * The tend's light, over the stops (§4, §5): the match flare and the spark's glow, thrown sparks,
 * the ember, smoke, the bursts and white-hot flashes, and the fire's rising embers. Added light
 * (`plus`) in Dusk; Daylight blends normally, since `plus` washes out on a light page.
 */
export function KindlingSparks({ trail, burns, time, embersAt, day }: Props) {
	const c = useSparkColours();
	const blend = day ? "srcOver" : "plus";
	const paths = useDerivedValue(() => {
		const since = embersAt.get();
		return fxPaths(
			trail,
			burns.get(),
			time.get(),
			since < 0 ? -1 : time.get() - since
		);
	});
	const hot = useDerivedValue(() => paths.get().hot);
	const warm = useDerivedValue(() => paths.get().warm);
	const ember = useDerivedValue(() => paths.get().ember);
	const emberAlpha = useDerivedValue(() => paths.get().emberLevel);
	const smoke = useDerivedValue(() => paths.get().smoke);
	const embers = useDerivedValue(() => paths.get().embers);
	const fireFlash = useDerivedValue(() => {
		let o = 0;
		for (const b of burns.get()) {
			const a = time.get() - b.t0 - arrivalOf(b);
			if (b.end === END.catch && a >= 0) {
				o = Math.max(o, Math.exp(-FLASH.decay * a) * FLASH.lit);
			}
		}
		return o;
	});
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
			<Path
				color={c.smoke}
				opacity={day ? FX.smoke.day : FX.smoke.dusk}
				path={smoke}
			>
				<Blur blur={FX.smoke.blur} />
			</Path>
			{trail.stops.map(([x, y], s) => (
				<StopFlash
					burns={burns}
					c={c}
					key={`flash${x}:${y}`}
					s={s}
					time={time}
					x={x}
					y={y}
				/>
			))}
			<Circle
				color={c.flash}
				cx={trail.flame[0]}
				cy={trail.flame[1]}
				opacity={fireFlash}
				r={FX.fireFlashR}
			/>
			<Path
				blendMode={blend}
				color={c.ember}
				opacity={emberAlpha}
				path={ember}
				strokeCap="round"
				strokeJoin="round"
				strokeWidth={FX.emberWidth}
				style="stroke"
			>
				<BlurMask blur={2} style="solid" />
			</Path>
			{SLOTS.map((slot, k) => (
				<SparkGlow
					blend={blend}
					burns={burns}
					c={c}
					k={k}
					key={slot}
					time={time}
					trail={trail}
				/>
			))}
			<Path
				blendMode={blend}
				color={c.warm}
				path={warm}
				strokeCap="round"
				strokeWidth={FX.warmWidth}
				style="stroke"
			/>
			<Path
				blendMode={blend}
				color={c.hot}
				path={hot}
				strokeCap="round"
				strokeWidth={FX.hotWidth}
				style="stroke"
			/>
			<Path blendMode={blend} color={c.fireEmber} opacity={0.6} path={embers}>
				<BlurMask blur={4} style="normal" />
			</Path>
			<Path blendMode={blend} color={c.fireEmber} path={embers} />
		</Canvas>
	);
}
