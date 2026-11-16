import {
	AlphaType,
	ColorType,
	type SkImage,
	Skia,
} from "@shopify/react-native-skia";
import { matchBodyFace } from "@/design/skia-face";
import type { WordAsh } from "@/features/vent/field/particle-after";
import { mulberry32 } from "@/features/vent/field/particle-config";
import { VENT_COLORS } from "@/features/vent/vent-palette";
import { reachedAt, vnoise } from "@/features/vent/words/burn-shader";

/**
 * The reply, drawn once into an image on the UI thread at the screen's scale, exactly where the
 * real text laid out (each word's frame from React Native), so the burn can take over without a
 * jump. Then 130 ash points are sampled on the letters (handoff §10), each born when the front
 * reaches it.
 */
export type WordRect = {
	word: string;
	x: number;
	y: number;
	w: number;
	h: number;
};

export type WordLayer = {
	image: SkImage;
	x0: number;
	y0: number;
	bw: number;
	bh: number;
	scale: number;
	top: number;
	lineH: number;
	lines: number;
	ash: WordAsh;
};

const PAD = 4;
const ASH_N = 130;
const ASH_TRIES = 20_000;
const ASH_SEED = 11;
/** A pixel counts as letter above this alpha (0–255). */
const INK = 140;
const LONG_SHARE = 0.36;
const CREAM = VENT_COLORS.cream;

type Block = {
	x0: number;
	y0: number;
	bw: number;
	tops: number[];
	lineH: number;
};

/** The burn's reading-order value at a point (the shader's `v`). */
function valueAt(xp: number, yp: number, k: Block) {
	"worklet";
	const li = Math.min(
		k.tops.length - 1,
		Math.max(0, Math.floor((yp - k.tops[0]) / k.lineH))
	);
	const o = (li + (xp - k.x0) / k.bw) / k.tops.length;
	const n = 0.65 * vnoise(xp / 7, yp / 7) + 0.35 * vnoise(xp / 2.6, yp / 2.6);
	return 0.66 * o + 0.34 * n;
}

function sampleAsh(
	image: SkImage,
	pw: number,
	ph: number,
	scale: number,
	k: Block
): WordAsh {
	"worklet";
	const ash: WordAsh = {
		amp: [],
		born: [],
		die: [],
		f: [],
		lift: [],
		n: 0,
		ph: [],
		s: [],
		vx: [],
		vy: [],
		x: [],
		y: [],
	};
	const px = image.readPixels(0, 0, {
		alphaType: AlphaType.Unpremul,
		colorType: ColorType.RGBA_8888,
		height: ph,
		width: pw,
	});
	if (!px) {
		return ash;
	}
	const r = mulberry32(ASH_SEED);
	for (let tries = 0; ash.n < ASH_N && tries < ASH_TRIES; tries++) {
		const ix = Math.floor(r() * pw);
		const iy = Math.floor(r() * ph);
		if (px[(iy * pw + ix) * 4 + 3] < INK) {
			continue;
		}
		const x = ix / scale + k.x0;
		const y = iy / scale + k.y0;
		const ang = r() * 6.283;
		const sp = 15 + r() * 33;
		const long = r() < LONG_SHARE;
		ash.x.push(x);
		ash.y.push(y);
		ash.born.push(reachedAt(valueAt(x, y, k)));
		ash.vx.push(Math.cos(ang) * sp);
		ash.vy.push(Math.sin(ang) * sp * 0.6);
		ash.lift.push(45 + r() * 85);
		ash.ph.push(r() * 6.283);
		ash.f.push(4 + r() * 5);
		ash.amp.push(2 + r() * 5);
		ash.die.push(long ? 0.86 + r() * 0.14 : 0.32 + r() * 0.32);
		ash.s.push(0.7 + r() * 1.1);
		ash.n++;
	}
	return ash;
}

export function buildWordLayer(
	rects: WordRect[],
	fontSize: number,
	lineH: number,
	scale: number,
	family: string
): WordLayer | null {
	"worklet";
	if (rects.length === 0) {
		return null;
	}
	let x0 = Number.POSITIVE_INFINITY;
	let y0 = Number.POSITIVE_INFINITY;
	let x1 = Number.NEGATIVE_INFINITY;
	let y1 = Number.NEGATIVE_INFINITY;
	const tops: number[] = [];
	for (const r of rects) {
		x0 = Math.min(x0, r.x);
		y0 = Math.min(y0, r.y);
		x1 = Math.max(x1, r.x + r.w);
		y1 = Math.max(y1, r.y + r.h);
		const top = Math.round(r.y);
		if (!tops.includes(top)) {
			tops.push(top);
		}
	}
	x0 = Math.floor(x0) - PAD;
	y0 = Math.floor(y0) - PAD;
	const bw = Math.ceil(x1) + PAD - x0;
	const bh = Math.ceil(y1) + PAD - y0;
	const pw = Math.round(bw * scale);
	const ph = Math.round(bh * scale);
	const surface = Skia.Surface.MakeOffscreen(pw, ph);
	if (!surface) {
		return null;
	}

	// The theme's body family, as React Native drew the words.
	const typeface = matchBodyFace(family, 400);
	const font = Skia.Font(typeface ?? undefined, fontSize);
	const m = font.getMetrics();
	// React Native centres the glyphs in the line box: the baseline sits half the spare height down.
	const baseline = (lineH - (m.descent - m.ascent)) / 2 - m.ascent;
	const paint = Skia.Paint();
	paint.setColor(Skia.Color(CREAM));
	paint.setAntiAlias(true);
	const c = surface.getCanvas();
	c.scale(scale, scale);
	c.translate(-x0, -y0);
	// UIKit and Skia can still space glyphs differently, so each word gets the tracking that
	// makes it fill the width React Native laid it out at: the same glyphs, in the same places.
	for (const r of rects) {
		const glyphs = font.getGlyphIDs(r.word);
		const widths = font.getGlyphWidths(glyphs);
		const track =
			(r.w - widths.reduce((a, b) => a + b, 0)) / Math.max(1, glyphs.length);
		let x = 0;
		const pos = widths.map((gw) => {
			const p = { x, y: 0 };
			x += gw + track;
			return p;
		});
		c.drawGlyphs(glyphs, pos, r.x, r.y + baseline, font, paint);
	}
	surface.flush();
	const image = surface.makeImageSnapshot();

	tops.sort((a, b) => a - b);
	const ash = sampleAsh(image, pw, ph, scale, { bw, lineH, tops, x0, y0 });
	return {
		ash,
		bh,
		bw,
		image,
		lineH,
		lines: tops.length,
		scale,
		top: tops[0],
		x0,
		y0,
	};
}
