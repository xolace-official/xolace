import { type SkCanvas, Skia, TileMode } from "@shopify/react-native-skia";
import { BEATS } from "../copy";
import { BOARD, lerp, mixRGB, type Stage, TAU } from "../first-run-motion";
import { BEAT_COLORS, css, type RGB, STORY_COLORS } from "../first-run-palette";

/** Every beat's glow colours in story order, and the seat's ember. */
const PAL = BEATS.map((b) => BEAT_COLORS[b.id]);
const SEAT_PAL = STORY_COLORS.seat;
const WHITE: RGB = [255, 255, 255];
const BREATH_MS = 2200;
const DRIFT_MS = 5500;

export type GlowPose = {
	hot: RGB;
	rim: RGB;
	tint: RGB;
	x: number;
	y: number;
	rx: number;
	ry: number;
	a: number;
};

/**
 * The story's glow at a moment (board `glowCss`): radial `300 × 270` at `(234 + drift, 890 − 80·surge)`
 * breathing ±3.5% every 2.2 s, crossing colours on a beat change, gathering to the fire for the seat.
 */
export function glowPose(
	t: number,
	rm: boolean,
	from: number,
	to: number,
	cross: number,
	surge: number,
	seat: number,
	vent: number
): GlowPose {
	"worklet";
	const tt = rm ? 0 : t;
	const br = Math.sin((tt / BREATH_MS) * TAU);
	const dr = 15 * Math.sin((tt / DRIFT_MS) * TAU);
	const a = PAL[from];
	const b = PAL[to];
	return {
		a: 1 + 0.25 * vent,
		hot: mixRGB(mixRGB(a.hot, b.hot, cross), SEAT_PAL.hot, seat),
		rim: mixRGB(mixRGB(a.rim, b.rim, cross), SEAT_PAL.rim, seat),
		rx: lerp(300, 360, seat) * (1 + 0.035 * br),
		ry: lerp(270, 330, seat) * (1 + 0.035 * br),
		tint: mixRGB(mixRGB(a.tint, b.tint, cross), SEAT_PAL.tint, seat),
		x: lerp(234 + dr, 176, seat),
		y: lerp(890 - 80 * surge, 520, seat),
	};
}

/**
 * Draws the glow on the ground. The glow sits at the bottom edge, so its y keeps the board's
 * distance from the bottom; the seat's fire (y 520) keeps its distance from the top.
 */
export function drawGlow(
	c: SkCanvas,
	s: Stage,
	p: GlowPose,
	seat: number,
	bright = 1
) {
	"worklet";
	const fill = Skia.Paint();
	fill.setColor(Skia.Color(STORY_COLORS.ground));
	c.drawRect(Skia.XYWHRect(0, 0, s.W, s.H), fill);
	const bottomDy = s.H - BOARD.h;
	const y = p.y + lerp(bottomDy, s.dy, seat);
	const lin = Skia.Paint();
	lin.setShader(
		Skia.Shader.MakeLinearGradient(
			{ x: 0, y: s.H },
			{ x: 0, y: s.H / 2 },
			[Skia.Color(css(p.tint, 1)), Skia.Color(css(p.tint, 0))],
			null,
			TileMode.Clamp
		)
	);
	c.drawRect(Skia.XYWHRect(0, 0, s.W, s.H), lin);
	const rad = Skia.Paint();
	const hot = mixRGB(p.hot, WHITE, Math.max(0, bright - 1) * 0.6);
	rad.setShader(
		Skia.Shader.MakeRadialGradient(
			{ x: 0, y: 0 },
			p.rx,
			[
				Skia.Color(css(hot, Math.min(1, 0.82 * p.a * bright))),
				Skia.Color(css(p.rim, Math.min(1, 0.55 * p.a * bright))),
				Skia.Color(css(p.rim, 0.17 * bright)),
				Skia.Color(css(p.rim, 0)),
			],
			[0, 0.3, 0.62, 1],
			TileMode.Clamp
		)
	);
	c.save();
	c.translate(p.x + s.dx, y);
	c.scale(1, p.ry / p.rx);
	c.drawCircle(0, 0, p.rx, rad);
	c.restore();
}
