import { Easing } from "react-native-reanimated";
import type { CubicBezier } from "@/design/ease";

export const riseFn = Easing.bezierFn(0.2, 0.8, 0.2, 1);
export const EASE_GLIDE = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_NIGHT = Easing.bezier(0.45, 0, 0.2, 1);
export const glideFn = Easing.bezierFn(0.23, 1, 0.32, 1);
export const trimFn = Easing.bezierFn(0.45, 0, 0.25, 1);
export const popFn = Easing.bezierFn(0.3, 1.5, 0.5, 1);
export const sparkFn = Easing.bezierFn(0.2, 0.8, 0.3, 1);
export const EASE_INK = Easing.bezier(0.15, 0.7, 0.3, 1);
export const EASE_SWELL = Easing.bezier(0.34, 1.3, 0.64, 1);
export const EASE_CSS = Easing.bezier(0.25, 0.1, 0.25, 1);
export const EASE_CSS_OUT = Easing.bezier(0, 0, 0.58, 1);
export const EASE_DRAIN = Easing.bezier(0.3, 0, 0.2, 1);

export const CURVES: Record<"rise" | "css", CubicBezier> = {
	css: [0.25, 0.1, 0.25, 1],
	rise: [0.2, 0.8, 0.2, 1],
};
export const easeCssFn = Easing.bezierFn(0.25, 0.1, 0.25, 1);
export const easeOutFn = Easing.bezierFn(0, 0, 0.58, 1);
export const easeInOutFn = Easing.bezierFn(0.42, 0, 0.58, 1);

export const TIMING = {
	glide: 1300,
	night: 1600,
	palette: 600,
	ridges: 900,
	rise: 620,
	riseSlots: [120, 200, 280],
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

export function seg(t: number, a: number, b: number) {
	"worklet";
	return clamp01((t - a) / (b - a));
}

export const MODULE_GAP = 32;
