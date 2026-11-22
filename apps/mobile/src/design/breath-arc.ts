export const ARC = {
	BOT_CORNERS: {
		bottomLeft: [0.98, 1.1],
		bottomRight: [1.08, 1.02],
		topLeft: [0.28, 0.3],
		topRight: [0.32, 0.26],
	},
	GAP: 14,
	SHAPE: {
		bot: {
			peak: { h: 0.54, r: 56, w: 0.86 },
			rest: { h: 0.2, r: 40, w: 0.74 },
		},
		top: {
			peak: { h: 0.32, r: 40, w: 0.74 },
			rest: { h: 0.6, r: 54, w: 0.82 },
		},
	},
	TOP_CORNERS: {
		bottomLeft: [0.26, 0.32],
		bottomRight: [0.3, 0.26],
		topLeft: [1.02, 1.08],
		topRight: [1.1, 0.98],
	},
	WOBBLE: 6,
	WOBBLE_MS: 880,
} as const;

export type Corners = typeof ARC.TOP_CORNERS | typeof ARC.BOT_CORNERS;

const lerp = (a: number, b: number, t: number) => {
	"worklet";
	return a + (b - a) * t;
};

export type Box = { x: number; y: number; w: number; h: number; r: number };
export type Arcs = { top: Box; bot: Box; seamY: number };

export function arcsAt(
	W: number,
	H: number,
	p: number,
	wob: number,
	gap: number = ARC.GAP
): Arcs {
	"worklet";
	const S = ARC.SHAPE;
	const tH = lerp(S.top.rest.h * H, S.top.peak.h * H, p);
	const bH = lerp(S.bot.rest.h * H, S.bot.peak.h * H, p);
	const y0 = (H - tH - gap - bH) / 2;
	const tW = lerp(S.top.rest.w * W, S.top.peak.w * W, p);
	const bW = lerp(S.bot.rest.w * W, S.bot.peak.w * W, p);
	return {
		bot: {
			h: bH,
			r: lerp(S.bot.rest.r, S.bot.peak.r, p) + wob,
			w: bW,
			x: (W - bW) / 2,
			y: y0 + tH + gap,
		},
		seamY: y0 + tH + gap / 2,
		top: {
			h: tH,
			r: lerp(S.top.rest.r, S.top.peak.r, p) + wob,
			w: tW,
			x: (W - tW) / 2,
			y: y0,
		},
	};
}
