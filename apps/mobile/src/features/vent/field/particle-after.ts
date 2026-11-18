import { type Batch, dot } from "@/features/vent/field/particle-atlas";
import { DIR_X, PHASE0, SIZE } from "@/features/vent/field/particle-config";
import { clamp01, type Stage } from "@/features/vent/field/particle-render";

/**
 * Production's afterglow while the reply is on its way: nine sparks rising 110 pt off the burn
 * spot, on production's exact paths. v2 only makes them visible (handoff §8): they fade in over
 * 500 ms from 400 ms before the scatter ends, no 0.85 cap, a shallower flicker, a longer visible
 * stretch of each climb, a little larger, and a hot core on the same spark. Nothing else.
 */
const SPARKS = 9;
const FADE_IN_MS = 500;

export function drawAfter(b: Batch, st: Stage, wt: number) {
	"worklet";
	const fin = clamp01(wt / FADE_IN_MS);
	for (let i = 0; i < SPARKS; i++) {
		const cyc = 2400 + PHASE0[i] * 350;
		const p = ((wt + PHASE0[i] * 900) % cyc) / cyc;
		const x = st.cx + DIR_X[i] * 30 + Math.sin(p * 6.283 + PHASE0[i]) * 12;
		const y = st.cy + 16 - p * 110;
		const fk = 0.8 + 0.2 * Math.sin(wt * 0.013 + PHASE0[i] * 7);
		const life = Math.sin(Math.PI * p) ** 0.8;
		const a = fin * life * fk;
		const r = 2.2 + SIZE[i] * 0.6 * (1 - p * 0.5);
		dot(b, x, y, r, i % 3 === 0 ? 1 : 0.75, a);
		// A hot core on the same spark, so it reads as glowing rather than as a dim dot.
		dot(b, x, y, r * 0.45, 1, a * 0.8);
	}
}

/**
 * v2: the ash the words shed as they burn (native-cook particle-dispersion's closed form): a quick
 * scatter, a lift that grows with age^1.6, a small curl. Points are sampled on the letters once,
 * on the JS thread (`words/word-image.ts`); each is born when the burning front reaches it.
 */
export type WordAsh = {
	n: number;
	x: number[];
	y: number[];
	born: number[];
	vx: number[];
	vy: number[];
	lift: number[];
	ph: number[];
	f: number[];
	amp: number[];
	die: number[];
	s: number[];
};

export const ASH_RUN_MS = 2600;
const GLINT_S = 0.2;

const smooth = (a: number, b: number, x: number) => {
	"worklet";
	const t = clamp01((x - a) / (b - a));
	return t * t * (3 - 2 * t);
};

export function drawAsh(b: Batch, ash: WordAsh, ms: number) {
	"worklet";
	for (let i = 0; i < ash.n; i++) {
		const age = (ms - ash.born[i]) / 1000;
		if (age < 0) {
			continue;
		}
		const life = age / (ASH_RUN_MS / 1000);
		if (life > ash.die[i]) {
			continue;
		}
		const sc = 1 - Math.exp(-3.6 * age);
		const x =
			ash.x[i] +
			ash.vx[i] * sc +
			(Math.sin(ash.ph[i] + ash.f[i] * age) - Math.sin(ash.ph[i])) * ash.amp[i];
		const y = ash.y[i] + ash.vy[i] * sc - ash.lift[i] * age ** 1.6;
		// An amber glint for the first 200 ms, then ash grey.
		const warm = age < GLINT_S ? 0.75 * (1 - age / GLINT_S) : 0;
		dot(b, x, y, ash.s[i], warm, 0.5 * (1 - smooth(0.5, 1, life / ash.die[i])));
	}
}
