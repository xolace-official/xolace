import { Easing } from "react-native-reanimated";

export const EASE = {
	blink: Easing.bezierFn(0.2, 0.8, 0.2, 1),
	bloom: Easing.bezierFn(0.34, 1.56, 0.64, 1),
	css: Easing.bezierFn(0.25, 0.1, 0.25, 1),
	easeOut: Easing.bezier(0, 0, 0.58, 1),
	halo: Easing.bezierFn(0.34, 1.4, 0.64, 1),
	inOut: Easing.bezierFn(0.42, 0, 0.58, 1),
	label: Easing.bezier(0.2, 0.8, 0.2, 1),
	leave: Easing.bezier(0.32, 0.72, 0, 1),
	line: Easing.bezierFn(0.45, 0, 0.25, 1),
	lit: Easing.bezier(0.2, 0.6, 0.3, 1),
	move: Easing.bezierFn(0.34, 1.2, 0.64, 1),
	pop: Easing.bezier(0.34, 1.56, 0.64, 1),
	rise: Easing.bezierFn(0.34, 1.18, 0.64, 1),
} as const;
