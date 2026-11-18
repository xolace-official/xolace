import { Easing } from "react-native-reanimated";

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
/** Streak flame ignite (overshoots). */
export const igniteFn = Easing.bezierFn(0.3, 1.6, 0.5, 1);
/** Toolbar Reflect pill swelling in. */
export const EASE_SWELL = Easing.bezier(0.34, 1.3, 0.64, 1);
/** CSS `ease`. */
export const EASE_CSS = Easing.bezier(0.25, 0.1, 0.25, 1);
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
	/** Ridge fills. */
	ridges: 900,
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
