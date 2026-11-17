/** You're not alone's curves, from the board's keyframes and transitions. */
import { Easing } from "react-native-reanimated";

export const EASE = {
	/** `.bk` blink; `.lab span` label swap. */
	blink: Easing.bezierFn(0.2, 0.8, 0.2, 1),
	/** `.st .in` bloom. */
	bloom: Easing.bezierFn(0.34, 1.56, 0.64, 1),
	/** CSS `ease`. */
	css: Easing.bezierFn(0.25, 0.1, 0.25, 1),
	/** CSS `ease-out` (`.cw .edge`). */
	easeOut: Easing.bezier(0, 0, 0.58, 1),
	/** `.st .hl` hot. */
	halo: Easing.bezierFn(0.34, 1.4, 0.64, 1),
	/** CSS `ease-in-out`. */
	inOut: Easing.bezierFn(0.42, 0, 0.58, 1),
	label: Easing.bezier(0.2, 0.8, 0.2, 1),
	/** `.cw` collapse: the iOS sheet curve. */
	leave: Easing.bezier(0.32, 0.72, 0, 1),
	/** `.lg`, `.lk` stroke-dashoffset; `.pl`. */
	line: Easing.bezierFn(0.45, 0, 0.25, 1),
	/** `.cd .lit` on. */
	lit: Easing.bezier(0.2, 0.6, 0.3, 1),
	/** `.st .mv`. */
	move: Easing.bezierFn(0.34, 1.2, 0.64, 1),
	/** `.gly::after`: the ember's core filling. */
	pop: Easing.bezier(0.34, 1.56, 0.64, 1),
	/** `ring` (None yet). */
	ring: Easing.bezier(0.2, 0.6, 0.3, 1),
	/** `rise` keyframes' curve (opacity, 0 → 40%). */
	rise: Easing.bezierFn(0.34, 1.18, 0.64, 1),
} as const;
