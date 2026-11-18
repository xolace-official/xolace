import { Easing } from "react-native-reanimated";
import type { CubicBezier } from "@/design/ease";

/**
 * Today's curves and clocks, named once. Every value is the board's
 * (TodayAlive.dc.html `<style>`); the comments say which piece uses it.
 */

/** Rise, greeting words, placeholder swap, choices burst, digit roll. */
export const riseFn = Easing.bezierFn(0.2, 0.8, 0.2, 1);
/** Sun glide, moon rise, blur-ins (the Press ease). */
export const EASE_GLIDE = Easing.bezier(0.23, 1, 0.32, 1);
/** Night falling from the top. */
export const EASE_NIGHT = Easing.bezier(0.45, 0, 0.2, 1);
/** Blur-ins (the Press ease), as a worklet curve. */
export const glideFn = Easing.bezierFn(0.23, 1, 0.32, 1);
/** Kindling: lit stroke trimming on and the wisp. */
export const trimFn = Easing.bezierFn(0.45, 0, 0.25, 1);
/** Kindling: node pop and turn-over (overshoots). */
export const popFn = Easing.bezierFn(0.3, 1.5, 0.5, 1);
/** Kindling sparks. */
export const sparkFn = Easing.bezierFn(0.2, 0.8, 0.3, 1);
/** Streak flame ignite (overshoots). */
export const igniteFn = Easing.bezierFn(0.3, 1.6, 0.5, 1);
/** Toolbar Reflect pill swelling in. */
export const EASE_SWELL = Easing.bezier(0.34, 1.3, 0.64, 1);
/** CSS `ease`. */
export const EASE_CSS = Easing.bezier(0.25, 0.1, 0.25, 1);
/** CSS `ease-out`: a tap's rim running the rest of its lap. */
export const EASE_CSS_OUT = Easing.bezier(0, 0, 0.58, 1);
/** Rim draining when the hold is let go early. */
export const EASE_DRAIN = Easing.bezier(0.3, 0, 0.2, 1);

/** The same curves as react-native-ease tuples, for the parts of Today that run on Ease. */
export const CURVES: Record<"rise" | "css", CubicBezier> = {
	/** EASE_CSS: CSS `ease`. */
	css: [0.25, 0.1, 0.25, 1],
	/** riseFn. */
	rise: [0.2, 0.8, 0.2, 1],
};
export const easeCssFn = Easing.bezierFn(0.25, 0.1, 0.25, 1);
/** CSS `ease-out` and `ease-in-out`. */
export const easeOutFn = Easing.bezierFn(0, 0, 0.58, 1);
export const easeInOutFn = Easing.bezierFn(0.42, 0, 0.58, 1);

export const TIMING = {
	/** Sun and moon glide. */
	glide: 1300,
	/** Night front. */
	night: 1600,
	/** Sky palettes crossfade. */
	palette: 600,
	/** Placeholder rotation and swap. */
	placeholderEvery: 5000,
	placeholderSwap: 500,
	/** Ridge fills. */
	ridges: 900,
	/** First open: modules rise, each in its slot. */
	rise: 620,
	riseSlots: [120, 200, 280],
	/** Greeting word, and the gap between words. */
	word: 800,
	wordGap: 120,
} as const;

export function clamp01(x: number) {
	"worklet";
	if (x < 0) {
		return 0;
	}
	return x > 1 ? 1 : x;
}

/** 0 → 1 as `t` goes from `a` to `b`, clamped. */
export function seg(t: number, a: number, b: number) {
	"worklet";
	return clamp01((t - a) / (b - a));
}

/**
 * A CSS keyframe track: `stops` are offsets (0…1) with values, and the
 * animation's timing function applies within each segment, as CSS does.
 */
export function keyframes(
	p: number,
	stops: readonly (readonly [number, number])[],
	ease: (x: number) => number
) {
	"worklet";
	const first = stops[0];
	if (!first || p <= first[0]) {
		return first ? first[1] : 0;
	}
	for (let i = 0; i < stops.length - 1; i += 1) {
		const a = stops[i];
		const b = stops[i + 1];
		if (a && b && p <= b[0]) {
			return a[1] + (b[1] - a[1]) * ease((p - a[0]) / (b[0] - a[0]));
		}
	}
	const last = stops.at(-1);
	return last ? last[1] : 0;
}

/** Every module below the hero sits 32 pt from the one above. */
export const MODULE_GAP = 32;
