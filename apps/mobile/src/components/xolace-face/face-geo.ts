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
	cx: number;
	ey: number;
	gx: number;
	gy: number;
	lift: number;
	mouth: number;
	mouthOpen: number;
	open: number;
	shape: number;
};

export type PartProps = { geo: SharedValue<Geo>; side: number; spread: number };

export const clamp = (v: number, lo: number, hi: number) => {
	"worklet";
	return Math.min(hi, Math.max(lo, v));
};
