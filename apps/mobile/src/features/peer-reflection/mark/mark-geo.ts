/**
 * The mark's geometry and its arrival, as pure worklets of the one arrival value
 * (`arrival-time.ts`): each card's line, star and bloom read the same `a`.
 */
import { Skia, type SkPath } from "@shopify/react-native-skia";
import { REDUCED_FADE_MS } from "@/design/springs";
import { cardStart, clamp01 } from "../arrival/arrival-time";
import { EASE } from "../peers-ease";
import { CARD_STAR, CTRL, MARK_AT, STAR, T, TIMING, YOU } from "../peers-look";

const SAMPLES = 64;
const TABLE = 128;
const STARS = 4;

export type Point = { x: number; y: number };
export type Line = { path: SkPath; length: number; lookup: Point[] };

/** A point on the quadratic from you through `c` to `to`, at parameter u. */
function quad(u: number, c: readonly number[], to: readonly number[]): Point {
	const v = 1 - u;
	return {
		x: v * v * YOU.x + 2 * v * u * c[0] + u * u * to[0],
		y: v * v * YOU.y + 2 * v * u * c[1] + u * u * to[1],
	};
}

/** Board `M195 122 Q… …`: a quadratic from you to star k, with an even-speed table for the point of light. */
function makeLine(k: number): Line {
	const c = CTRL[k];
	const to = STAR[k];
	const path = Skia.PathBuilder.Make()
		.moveTo(YOU.x, YOU.y)
		.quadTo(c[0], c[1], to[0], to[1])
		.build();
	const pts: Point[] = [];
	const dist: number[] = [];
	let len = 0;
	for (let i = 0; i <= SAMPLES; i++) {
		const p = quad(i / SAMPLES, c, to);
		if (i > 0) {
			len += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
		}
		pts.push(p);
		dist.push(len);
	}
	const lookup: Point[] = [];
	let at = 1;
	for (let s = 0; s < TABLE; s++) {
		const want = (s / (TABLE - 1)) * len;
		while (at < dist.length - 1 && dist[at] < want) {
			at++;
		}
		const span = dist[at] - dist[at - 1];
		const f = span > 0 ? (want - dist[at - 1]) / span : 1;
		lookup.push({
			x: pts[at - 1].x + (pts[at].x - pts[at - 1].x) * f,
			y: pts[at - 1].y + (pts[at].y - pts[at - 1].y) * f,
		});
	}
	return { length: len, lookup, path };
}

export const LINES: readonly Line[] = Array.from({ length: STARS }, (_, k) =>
	makeLine(k)
);

/** The point `u` of the way along a line's even-speed table. */
export function pointAt(lookup: readonly Point[], u: number): Point {
	"worklet";
	const f = clamp01(u) * (lookup.length - 1);
	const i = Math.floor(f);
	const a = lookup[i];
	const b = lookup[Math.min(lookup.length - 1, i + 1)];
	const t = f - i;
	return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Card that lights star k (the inverse of `CARD_STAR`). */
export const CARD_OF: readonly number[] = Array.from(
	{ length: STARS },
	(_, k) => (CARD_STAR as readonly number[]).indexOf(k)
);

export type StarPose = {
	/** 0 before its card, then the line's draw-on (0 → 1). */
	draw: number;
	/** The line's fade (`.lg`, `.lk` opacity .45 s). */
	lineA: number;
	x: number;
	y: number;
	/** Ring → filled core (`.co` .4 s). */
	morph: number;
	/** Halo opacity factor (`.hl` .5 s for the tile's stars). */
	halo: number;
	/** `.in`: bloom scale and opacity. */
	scale: number;
	inA: number;
	/** The tile's ring (r 9) still showing. */
	ring: number;
};

/** A star with no card: the tile's ring where it has one (fading for None yet), else nothing. */
function unlit(a: number, k: number, none: boolean): StarPose {
	"worklet";
	const mark = MARK_AT[k];
	const ringGone = none
		? EASE.css(clamp01((a - T.first) / TIMING.bloomFade))
		: 0;
	const at = mark ?? STAR[k];
	return {
		draw: 0,
		halo: 0,
		inA: mark ? 1 - ringGone : 0,
		lineA: 0,
		morph: 0,
		ring: mark ? 1 : 0,
		scale: 1,
		x: at[0],
		y: at[1],
	};
}

/**
 * Star k at arrival time `a` (board `phoneVals` + `.st`, `.mk`, `.mv`, `.in`). The
 * tile's two upper circles (s1, s2) start as rings at the tile's positions, move
 * .7 s to their place and fill; the outer two bloom .42 s after their line starts.
 */
export function starAt(
	a: number,
	k: number,
	n: number,
	none: boolean,
	reduced: boolean
): StarPose {
	"worklet";
	const ci = CARD_OF[k];
	if (ci >= n) {
		return unlit(a, k, none);
	}
	const [hx, hy] = STAR[k];
	const mark = MARK_AT[k];
	const e = a - cardStart(ci);
	if (reduced) {
		const f = clamp01(e / REDUCED_FADE_MS);
		return {
			draw: 1,
			halo: f,
			inA: mark ? 1 : f,
			lineA: f,
			morph: f,
			ring: mark ? 1 - f : 0,
			scale: 1,
			x: hx,
			y: hy,
		};
	}
	const started = e > 0;
	const draw = started ? EASE.line(clamp01(e / TIMING.draw)) : 0;
	const lineA = started ? EASE.css(clamp01(e / TIMING.fadeIn)) : 0;
	if (mark) {
		const m = started ? EASE.move(clamp01(e / TIMING.move)) : 0;
		const morph = started ? EASE.css(clamp01(e / TIMING.morph)) : 0;
		return {
			draw,
			halo: started ? EASE.css(clamp01(e / TIMING.halo)) : 0,
			inA: 1,
			lineA,
			morph,
			ring: 1 - morph,
			scale: 1,
			x: mark[0] + (hx - mark[0]) * m,
			y: mark[1] + (hy - mark[1]) * m,
		};
	}
	const b = e - TIMING.bloomAt;
	return {
		draw,
		halo: 1,
		inA: b <= 0 ? 0 : EASE.css(clamp01(b / TIMING.bloomFade)),
		lineA,
		morph: 1,
		ring: 0,
		scale: b <= 0 ? 0.3 : 0.3 + 0.7 * EASE.bloom(clamp01(b / TIMING.bloom)),
		x: hx,
		y: hy,
	};
}

/** `.bk`: α 0 → .95 at 25% → 0, scale .6 → 1.25 → 1.6, each leg on bezier(.2, .8, .2, 1). */
export function blinkAt(ms: number): { a: number; s: number } {
	"worklet";
	const u = ms / TIMING.blink;
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

/** `.pl`: opacity in over the first 12%, out over the last 15% (`plA`). */
export function pointAlpha(u: number): number {
	"worklet";
	if (u <= 0 || u >= 1) {
		return 0;
	}
	if (u < 0.12) {
		return u / 0.12;
	}
	if (u > 0.85) {
		return (1 - u) / 0.15;
	}
	return 1;
}

/** The blink wave's delay at star k from star j (board `tap`): .6 s + distance / 240 pt/s. */
export function waveDelay(j: number, k: number): number {
	const d = Math.hypot(STAR[k][0] - STAR[j][0], STAR[k][1] - STAR[j][1]);
	return TIMING.blinkLead + (d / TIMING.wave) * 1000;
}

/** `ldb`: .35 ↔ 1 over 1.5 s, ease-in-out each half, from `delay` (board `--ld`). */
export function loadBreath(ms: number, delay: number): number {
	"worklet";
	const u =
		((((ms - delay) % TIMING.load) + TIMING.load) % TIMING.load) / TIMING.load;
	const k = u < 0.5 ? EASE.inOut(u / 0.5) : 1 - EASE.inOut((u - 0.5) / 0.5);
	return 0.35 + 0.65 * k;
}
