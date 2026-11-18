// The first look's curves and durations (the board's), shared by the table and its previews.
import { Easing } from "react-native-reanimated";

/** A check or a pick overshooting a little as it lands. */
export const CHECK_EASE = Easing.bezierFn(0.3, 1.35, 0.5, 1);
/** Opening a row, scrolling to it, sliding the plan frame. */
export const MOVE_EASE = Easing.bezier(0.2, 0.85, 0.25, 1);
export const CHECK_MS = 420;
export const CHECK_FADE_MS = 280;
export const TITLE_MS = 300;
export const BAND_MS = 280;
export const OPEN_MS = 420;
export const OPEN_FADE_MS = 280;
/** The opened row has started moving before the middle scrolls to it. */
export const SCROLL_AFTER_MS = 80;
/** Flux looks down at an opened row, then back up. */
export const LOOK_MS = 700;

/** `x` held to 0…1. */
export function unit(x: number): number {
	"worklet";
	return Math.min(1, Math.max(0, x));
}
