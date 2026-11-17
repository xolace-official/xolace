import {
	BlendMode,
	type SkCanvas,
	type SkImage,
	Skia,
	type SkRect,
	type SkRSXform,
	TileMode,
} from "@shopify/react-native-skia";
import {
	RAMP_B,
	RAMP_G,
	RAMP_R,
	RAMP_STEPS,
} from "@/features/vent/field/particle-config";

/**
 * v2: every spark is one sprite in one `drawAtlas` call (native-cook firefly-swarm) instead of
 * production's 100 circles each with a 2.5 blur mask filter. The sprite is a pre-softened white
 * disc; each spark tints it with its colour along the ramp and adds in `BlendMode.Plus`, so where
 * sparks overlap the core runs hotter.
 */
const SPRITE = 64;
/** The board's soft dot: a radial falloff drawn at radius size + 5 (Skia's 2.5 blur, ported). */
const STOPS = [0, 0.34, 0.62, 1];
const ALPHAS = [1, 0.92, 0.34, 0];
const SOFT_EDGE = 5;
/** Below these the dot is invisible; skip it. */
const MIN_ALPHA = 0.004;
const MIN_SIZE = 0.05;

export function makeSprite(): SkImage | null {
	"worklet";
	const surface = Skia.Surface.MakeOffscreen(SPRITE, SPRITE);
	if (!surface) {
		return null;
	}
	const c = surface.getCanvas();
	const r = SPRITE / 2;
	const paint = Skia.Paint();
	const colors = ALPHAS.map((a) => Float32Array.of(1, 1, 1, a));
	paint.setShader(
		Skia.Shader.MakeRadialGradient(
			{ x: r, y: r },
			r,
			colors,
			STOPS,
			TileMode.Clamp
		)
	);
	c.drawRect(Skia.XYWHRect(0, 0, SPRITE, SPRITE), paint);
	surface.flush();
	return surface.makeImageSnapshot();
}

/** One frame's sparks, drawn together at the end. */
export type Batch = {
	src: SkRect;
	rects: SkRect[];
	xforms: SkRSXform[];
	colors: Float32Array[];
};

export function newBatch(): Batch {
	"worklet";
	return {
		colors: [],
		rects: [],
		src: Skia.XYWHRect(0, 0, SPRITE, SPRITE),
		xforms: [],
	};
}

/** A soft spark at (x, y): size in pt, warmth 0–1 along the ramp, alpha (capped at 1). */
export function dot(
	b: Batch,
	x: number,
	y: number,
	s: number,
	warm: number,
	a: number
) {
	"worklet";
	if (a <= MIN_ALPHA || s <= MIN_SIZE) {
		return;
	}
	const R = s + SOFT_EDGE;
	const k = (2 * R) / SPRITE;
	const w = warm < 0 ? 0 : warm > 1 ? 1 : warm;
	const idx = Math.round(w * (RAMP_STEPS - 1));
	b.rects.push(b.src);
	b.xforms.push(Skia.RSXform(k, 0, x - R, y - R));
	b.colors.push(
		Float32Array.of(RAMP_R[idx], RAMP_G[idx], RAMP_B[idx], a > 1 ? 1 : a)
	);
}

export function flush(canvas: SkCanvas, sprite: SkImage, b: Batch) {
	"worklet";
	if (b.rects.length === 0) {
		return;
	}
	const paint = Skia.Paint();
	paint.setBlendMode(BlendMode.Plus);
	canvas.drawAtlas(
		sprite,
		b.rects,
		b.xforms,
		paint,
		BlendMode.Modulate,
		b.colors
	);
}
