import { MOTION, T } from "../peers-look";

export const clamp01 = (x: number) => {
	"worklet";
	return Math.min(1, Math.max(0, x));
};

export const cardStart = (i: number) => {
	"worklet";
	return T.first + i * T.step;
};

export const landedAt = (a: number, n: number) => {
	"worklet";
	return a < T.first ? 0 : Math.min(n, Math.floor((a - T.first) / T.step) + 1);
};

export const readAt = (n: number) =>
	cardStart(Math.max(0, n - 1)) + MOTION.readAfter;

export const wordsIn = (rows: readonly string[]) =>
	rows.join(" ").split(" ").filter(Boolean).length;
