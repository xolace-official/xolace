import { PULL } from "../motion";

export function smooth(x: number, a: number, b: number): number {
	"worklet";
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
}

export function easeOut(x: number): number {
	"worklet";
	const u = 1 - Math.min(1, Math.max(0, x));
	return 1 - u * u * u;
}

export function progress(x: number, from: number, span: number): number {
	"worklet";
	return Math.min(1, Math.max(0, (x - from) / span));
}

export function resist(d: number): number {
	"worklet";
	const travelled = Math.max(0, d) * PULL.k;
	return (1 - 1 / (travelled / PULL.max + 1)) * PULL.max;
}
