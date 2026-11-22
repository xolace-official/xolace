import { Skia, type SkPath } from "@shopify/react-native-skia";
import { EASE, T2, TS } from "../session-look";
import { clamp01 } from "../timeline";

export const YOU = { x: 195, y: 62 } as const;
export const STAR = [
	[62, 48],
	[136, 20],
	[254, 20],
	[328, 48],
] as const;
const CTRL = [
	[124, 74],
	[163, 52],
	[226, 52],
	[266, 74],
] as const;

export const DRAW = {
	blink: 10,
	blinkBlur: 2,
	core: 3.6,
	faint: { alpha: 0.55, halo: 0.22, scale: 0.8 },
	halo: 11,
	haloBlur: 5,
	line: { coreA: 0.62, coreW: 1.2, glowA: 0.3, glowBlur: 3, glowW: 4.5 },
	lit: { alpha: 1, halo: 0.6, scale: 1 },
	me: {
		breathLow: 0.82,
		core: 6,
		from: 0.2,
		halo: 20,
		haloA: 0.75,
		haloBlur: 7,
	},
	slot: { alpha: 0.55, dash: [2.2, 3.2], r: 9, w: 1.4, warmW: 1.8 },
} as const;

export const LINES: readonly SkPath[] = [0, 1, 2, 3].map((k) =>
	Skia.PathBuilder.Make()
		.moveTo(YOU.x, YOU.y)
		.quadTo(CTRL[k][0], CTRL[k][1], STAR[k][0], STAR[k][1])
		.build()
);

const DIST = STAR.map(([x, y]) => Math.hypot(x - YOU.x, y - YOU.y));

export function starPop(c2: number, k: number, reduced: boolean) {
	"worklet";
	const at = T2.stars.at + T2.stars.k[k] * T2.stars.step;
	if (reduced) {
		return clamp01((c2 - at) / 200);
	}
	return EASE.star(clamp01((c2 - at) / T2.stars.ms));
}

export function starLit(cs: number, k: number, reduced: boolean) {
	"worklet";
	if (cs < 0) {
		return 0;
	}
	if (reduced) {
		return clamp01((cs - TS.reducedLand) / 200);
	}
	const at = TS.land + TS.lit.lead + (DIST[k] / TS.lit.per) * 1000;
	return clamp01((cs - at) / TS.lit.ms);
}

export function lineAt(cs: number, k: number, reduced: boolean) {
	"worklet";
	if (cs < 0) {
		return [0, 0];
	}
	if (reduced) {
		const f = clamp01((cs - TS.reducedLand) / 200);
		return [1, f];
	}
	const e = cs - TS.land - TS.lines.lead - k * TS.lines.step;
	return [
		EASE.line(clamp01(e / TS.lines.ms)),
		EASE.css(clamp01(e / TS.lines.fade)),
	];
}

export function blinkAt(cs: number, k: number, reduced: boolean) {
	"worklet";
	if (cs < 0 || reduced) {
		return { a: 0, s: 1 };
	}
	const u =
		(cs - TS.land - TS.blink.lead - (DIST[k] / TS.blink.per) * 1000) /
		TS.blink.ms;
	if (u <= 0 || u >= 1) {
		return { a: 0, s: 1 };
	}
	if (u < 0.25) {
		const e = EASE.blink(u / 0.25);
		return { a: 0.95 * e, s: 0.6 + 0.65 * e };
	}
	const e = EASE.blink((u - 0.25) / 0.75);
	return { a: 0.95 * (1 - e), s: 1.25 + 0.35 * e };
}
