import { Easing } from "react-native-reanimated";

export const CHECK_EASE = Easing.bezierFn(0.3, 1.35, 0.5, 1);
export const MOVE_EASE = Easing.bezier(0.2, 0.85, 0.25, 1);
export const CHECK_MS = 420;
export const CHECK_FADE_MS = 280;
export const TITLE_MS = 300;
export const BAND_MS = 280;
export const OPEN_MS = 420;
export const OPEN_FADE_MS = 280;
export const SCROLL_AFTER_MS = 80;
export const LOOK_MS = 700;

export function unit(x: number): number {
	"worklet";
	return Math.min(1, Math.max(0, x));
}
