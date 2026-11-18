import {
	type SkCanvas,
	type SkFont,
	Skia,
	type SkTypeface,
	TileMode,
	useTypeface,
} from "@shopify/react-native-skia";
import { DEFAULT_FONT_PAIR, FONT_PAIRS } from "@/design/font-pairs";
import { FONT_SOURCES } from "@/design/font-sources";

/**
 * Words drawn in one Skia canvas (gleam-line-intro): each word is a glyph run laid out once on
 * the JS thread, then drawn per frame from a worklet with its own opacity, rise, blur, colour
 * and glow. No view per word; an invisible accessible view carries the same words.
 */

/** Default's faces: first run comes before anyone picks a theme. */
const PAIR = FONT_PAIRS[DEFAULT_FONT_PAIR];

/** Typefaces load from their asset (Skia can't see expo-font's faces on Android). */
const cache: Partial<Record<string, SkTypeface>> = {};
function useFace(name: string): SkTypeface | null {
	const face = useTypeface(FONT_SOURCES[name]);
	if (face) {
		cache[name] = face;
	}
	return cache[name] ?? null;
}

export type FirstRunFaces = {
	/** Bricolage Grotesque 800: the promise and the week's count. */
	heavy: SkTypeface | null;
	/** Bricolage Grotesque 700: the story's sentences. */
	bold: SkTypeface | null;
	/** Figtree 400 and 600: the promise's lines. */
	body: SkTypeface | null;
	bodySemi: SkTypeface | null;
};

/** First run's typefaces, cached for the session so the story's first frame has them. */
export function useFirstRunFaces(): FirstRunFaces {
	return {
		body: useFace(PAIR.normal),
		bodySemi: useFace(PAIR.semibold),
		bold: useFace(PAIR["display-bold"]),
		heavy: useFace(PAIR.display),
	};
}

export type Run = {
	glyphs: number[];
	pos: { x: number; y: number }[];
	/** Baseline origin, in the canvas. */
	x: number;
	y: number;
	w: number;
	font: SkFont;
};

type LayoutWord = { t: string; br?: boolean };

/**
 * Lays words out as the boards' inline-block spans: `gap` after each word, `lineH` per line, the
 * baseline centred in the line box as React Native does, and `track` pt between glyphs.
 */
export function layoutWords(
	font: SkFont,
	words: readonly LayoutWord[],
	o: { left: number; top: number; lineH: number; gap: number; track: number }
): Run[] {
	const m = font.getMetrics();
	const base = (o.lineH - (m.descent - m.ascent)) / 2 - m.ascent;
	let x = o.left;
	let line = 0;
	return words.map((wd) => {
		const glyphs = font.getGlyphIDs(wd.t);
		const widths = font.getGlyphWidths(glyphs);
		let gx = 0;
		const pos = widths.map((gw) => {
			const p = { x: gx, y: 0 };
			gx += gw + o.track;
			return p;
		});
		const run: Run = {
			font,
			glyphs,
			pos,
			w: gx - o.track,
			x,
			y: o.top + line * o.lineH + base,
		};
		x += gx - o.track + o.gap;
		if (wd.br) {
			x = o.left;
			line++;
		}
		return run;
	});
}

/** Width of a phrase in a font, for centring. */
export function textWidth(font: SkFont, t: string, track = 0) {
	const g = font.getGlyphIDs(t);
	return font.getGlyphWidths(g).reduce((a, b) => a + b + track, -track);
}

export type WordPose = {
	/** 0..1 */
	op: number;
	/** pt down */
	dy: number;
	/** CSS blur px */
	blur: number;
	color: string;
	/** A text-shadow `0 0 r color`; r 0 for none. */
	glowR: number;
	glow: string;
};

/** One word at its pose. Filters are made only when a word is blurred or glowing. */
export function drawRun(c: SkCanvas, run: Run, p: WordPose, alpha = 1) {
	"worklet";
	const op = p.op * alpha;
	if (op <= 0.003) {
		return;
	}
	if (p.glowR > 0.2) {
		const gp = Skia.Paint();
		gp.setColor(Skia.Color(p.glow));
		gp.setAlphaf(gp.getColor()[3] * op);
		gp.setImageFilter(
			Skia.ImageFilter.MakeBlur(p.glowR / 2, p.glowR / 2, TileMode.Decal, null)
		);
		c.drawGlyphs(run.glyphs, run.pos, run.x, run.y + p.dy, run.font, gp);
	}
	const paint = Skia.Paint();
	paint.setAntiAlias(true);
	paint.setColor(Skia.Color(p.color));
	paint.setAlphaf(paint.getColor()[3] * op);
	if (p.blur > 0.05) {
		paint.setImageFilter(
			Skia.ImageFilter.MakeBlur(p.blur, p.blur, TileMode.Decal, null)
		);
	}
	c.drawGlyphs(run.glyphs, run.pos, run.x, run.y + p.dy, run.font, paint);
}

/**
 * A picture with nothing in it reaches the canvas as empty and later ones never show, so every
 * picture starts with one pixel at 1/255.
 */
export function seedPicture(c: SkCanvas) {
	"worklet";
	const p = Skia.Paint();
	p.setColor(Skia.Color("rgba(0,0,0,0.004)"));
	c.drawRect(Skia.XYWHRect(0, 0, 1, 1), p);
}

/** A spark: a blurred glow under a dot (the hand-off, the story and the seat). */
export function drawSpark(
	c: SkCanvas,
	x: number,
	y: number,
	size: number,
	op: number,
	colors: { glow: string; dot: string }
) {
	"worklet";
	if (op <= 0.003) {
		return;
	}
	const g = Skia.Paint();
	g.setColor(Skia.Color(colors.glow));
	g.setAlphaf(g.getColor()[3] * op);
	g.setMaskFilter(Skia.MaskFilter.MakeBlur(0, 3, true));
	c.drawCircle(x, y, size / 2 + 1, g);
	const d = Skia.Paint();
	d.setColor(Skia.Color(colors.dot));
	d.setAlphaf(op);
	c.drawCircle(x, y, size / 2, d);
}
