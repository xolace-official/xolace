import { EASE, REDUCED_MS } from "./session-look";

export const clamp01 = (x: number) => {
	"worklet";
	return Math.min(1, Math.max(0, x));
};

export function appear(
	clock: number,
	at: number,
	ms: number,
	reduced: boolean
) {
	"worklet";
	if (reduced) {
		const f = clamp01((clock - at) / REDUCED_MS);
		return { opacity: f, p: 1 };
	}
	const p = clamp01((clock - at) / ms);
	return { opacity: EASE.css(p), p };
}

export function riseIn(
	clock: number,
	at: number,
	ms: number,
	dy: number,
	reduced: boolean
) {
	"worklet";
	if (reduced) {
		return {
			opacity: clamp01((clock - at) / REDUCED_MS),
			transform: [{ translateY: 0 }],
		};
	}
	const e = EASE.rise(clamp01((clock - at) / ms));
	return {
		opacity: clock < at ? 0 : e,
		transform: [{ translateY: dy * (1 - e) }],
	};
}

export function cardRise(
	clock: number,
	at: number,
	ms: number,
	dy: number,
	opaqueAt: number,
	reduced: boolean
) {
	"worklet";
	if (reduced) {
		return {
			opacity: clamp01((clock - at) / REDUCED_MS),
			transform: [{ translateY: 0 }],
		};
	}
	const u = clamp01((clock - at) / ms);
	return {
		opacity: clock < at ? 0 : clamp01(EASE.card(clamp01(u / opaqueAt))),
		transform: [{ translateY: dy * (1 - EASE.card(u)) }],
	};
}
