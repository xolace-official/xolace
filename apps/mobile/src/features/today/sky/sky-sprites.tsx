import {
	Atlas,
	Circle,
	RadialGradient,
	rect,
	useColorBuffer,
	useRSXformBuffer,
	useTexture,
	vec,
} from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import { keyframes } from "@/design/keyframes";
import { easeInOutFn } from "../today-motion";
import { EMBER, EMBERS, STAR, STARS } from "./sky-model";
import type { SkyMotion } from "./use-sky-motion";

const SPRITE = 64;
const HALF = SPRITE / 2;
const COUNT = STARS.length + EMBERS.length;
const SRC = rect(0, 0, SPRITE, SPRITE);
const SPRITES = Array.from({ length: COUNT }, () => SRC);
const DOT_SHARE = 0.16;
const TAU = Math.PI * 2;
const DRIFT_X = EMBER.path.map((k) => [k[0], k[1]] as const);
const DRIFT_Y = EMBER.path.map((k) => [k[0], k[2]] as const);

function flash(p: number, floor: number) {
	"worklet";
	const f = p - Math.floor(p);
	if (f < 0.08) {
		const u = f / 0.08;
		return floor + (1 - floor) * u * u * (3 - 2 * u);
	}
	return floor + (1 - floor) * Math.exp(-(f - 0.08) * 4.5);
}

type Props = {
	motion: SkyMotion;
	clock: SharedValue<number>;
	sx: number;
	low: boolean;
};

export function SkySprites({ motion, clock, sx, low }: Props) {
	const texture = useTexture(
		<Circle cx={HALF} cy={HALF} r={HALF}>
			<RadialGradient
				c={vec(HALF, HALF)}
				colors={[
					"#FFFFFF",
					"#FFFFFF",
					"rgba(255,255,255,0.72)",
					"rgba(255,255,255,0.22)",
					"rgba(255,255,255,0)",
				]}
				positions={[0, DOT_SHARE, DOT_SHARE + 0.06, 0.5, 1]}
				r={HALF}
			/>
		</Circle>,
		{ height: SPRITE, width: SPRITE }
	);

	const transforms = useRSXformBuffer(COUNT, (xf, i) => {
		"worklet";
		const t = clock.get();
		if (i < STARS.length) {
			const s = STARS[i];
			if (!s) {
				return;
			}
			const k = 0.5 - 0.5 * Math.cos((TAU * (t - s[3])) / s[2]);
			const scale = (STAR.glow / HALF) * (1 - (1 - STAR.low) * k);
			xf.set(scale, 0, s[0] * sx - HALF * scale, s[1] - HALF * scale);
			return;
		}
		const e = EMBERS[i - STARS.length];
		if (!e) {
			return;
		}
		const p = ((((t - e[4]) / e[2]) % 1) + 1) % 1;
		const dx = keyframes(p, DRIFT_X, easeInOutFn);
		const dy = keyframes(p, DRIFT_Y, easeInOutFn);
		const scale = EMBER.glow / HALF;
		xf.set(scale, 0, e[0] * sx + dx - HALF * scale, e[1] + dy - HALF * scale);
	});

	const colors = useColorBuffer(COUNT, (c, i) => {
		"worklet";
		const t = clock.get();
		if (low && i % 2 === 1) {
			c[3] = 0;
			return;
		}
		if (i < STARS.length) {
			const s = STARS[i];
			if (!s) {
				return;
			}
			const k = 0.5 - 0.5 * Math.cos((TAU * (t - s[3])) / s[2]);
			const shown = i === 0 ? motion.firstStar.get() : motion.stars.get();
			c[0] = STAR.color[0];
			c[1] = STAR.color[1];
			c[2] = STAR.color[2];
			c[3] = shown * (1 - (1 - STAR.dim) * k);
			return;
		}
		const e = EMBERS[i - STARS.length];
		if (!e) {
			return;
		}
		c[0] = EMBER.color[0];
		c[1] = EMBER.color[1];
		c[2] = EMBER.color[2];
		c[3] = motion.embers.get() * flash((t - e[4]) / e[3], EMBER.floor);
	});

	return (
		<Atlas
			colorBlendMode="modulate"
			colors={colors}
			image={texture}
			sprites={SPRITES}
			transforms={transforms}
		/>
	);
}
