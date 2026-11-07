// What the drawn features share: the per-frame geometry derived from a pose, in the body's
// 100×100 box, and the colours they paint with.

import type { SharedValue } from "react-native-reanimated";

export type EyeStyle = "round" | "sleepy" | "sparkle";

export type FeatureColors = {
	blush: string;
	brow: string;
	highlight: string;
	mouth: string;
	pupil: string;
	sclera: string;
};

export type Geo = {
	asym: number;
	brow: number;
	cheeks: number;
	/** face centre x and eye line y, after lean, jitter and nod */
	cx: number;
	ey: number;
	gx: number;
	gy: number;
	lift: number;
	mouth: number;
	mouthOpen: number;
	open: number;
};

export type PartProps = { geo: SharedValue<Geo>; side: number; spread: number };

export const clamp = (v: number, lo: number, hi: number) => {
	"worklet";
	return Math.min(hi, Math.max(lo, v));
};
