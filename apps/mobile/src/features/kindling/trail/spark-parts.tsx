import { Circle, RadialGradient, vec } from "@shopify/react-native-skia";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import {
	arrivalOf,
	type Burn,
	END,
	flareAt,
	sparkAt,
	sparkLevel,
} from "./burn";
import type { SparkColours } from "./kindling-colours";
import type { Trail } from "./trail-geometry";
import { RADIUS } from "./trail-points";

export const FLASH = { decay: 5, landed: 0.5, lit: 0.8 } as const;
const SPARK = { coreR: 2.6, flareR: 34, glowR: 20, stops: [0, 0.18, 0.5, 1] };

type FlashProps = {
	s: number;
	x: number;
	y: number;
	burns: SharedValue<Burn[]>;
	time: SharedValue<number>;
	c: SparkColours;
};

export function StopFlash({ s, x, y, burns, time, c }: FlashProps) {
	const opacity = useDerivedValue(() => {
		let o = 0;
		for (const b of burns.get()) {
			const tau = time.get() - b.t0;
			if (tau < 0) {
				continue;
			}
			if (b.leg === s) {
				o = Math.max(o, Math.exp(-FLASH.decay * tau) * FLASH.lit);
			}
			const a = tau - arrivalOf(b);
			if (b.end === END.stop && b.leg + 1 === s && a >= 0) {
				o = Math.max(o, Math.exp(-FLASH.decay * a) * FLASH.landed);
			}
		}
		return o;
	});
	return <Circle color={c.flash} cx={x} cy={y} opacity={opacity} r={RADIUS} />;
}

type GlowProps = {
	k: number;
	trail: Trail;
	burns: SharedValue<Burn[]>;
	time: SharedValue<number>;
	blend: "plus" | "srcOver";
	c: SparkColours;
};

export function SparkGlow({ k, trail, burns, time, blend, c }: GlowProps) {
	const pose = useDerivedValue(() => {
		const b = burns.get()[k];
		if (!b) {
			return { flare: 0, level: 0, x: 0, y: 0 };
		}
		const tau = time.get() - b.t0;
		const [x, y] = sparkAt(trail, b, tau);
		return { flare: flareAt(b, tau), level: sparkLevel(trail, b, tau), x, y };
	});
	const at = useDerivedValue(() => vec(pose.get().x, pose.get().y));
	const cx = useDerivedValue(() => pose.get().x);
	const cy = useDerivedValue(() => pose.get().y);
	const r = useDerivedValue(
		() => SPARK.glowR + pose.get().flare * SPARK.flareR
	);
	const glow = useDerivedValue(() =>
		Math.min(1, pose.get().level + pose.get().flare)
	);
	const core = useDerivedValue(() => pose.get().level);
	return (
		<>
			<Circle blendMode={blend} cx={cx} cy={cy} opacity={glow} r={r}>
				<RadialGradient c={at} colors={c.glow} positions={SPARK.stops} r={r} />
			</Circle>
			<Circle color={c.core} cx={cx} cy={cy} opacity={core} r={SPARK.coreR} />
		</>
	);
}
