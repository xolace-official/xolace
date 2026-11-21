import { createContext, use } from "react";
import { Easing, type SharedValue } from "react-native-reanimated";

export const T = {
	acts: { ms: 700, rise: 18 },
	actsHide: 450,
	bgFade: 700,
	burst: 950,
	card: 550,
	chrome: 350,
	fade: 600,
	longPress: 450,
	reasonLead: 250,
	reduced: 200,
	reveal: 850,
	shareHeight: 350,
	sheet: 500,
	soft: 600,
	stage: 600,
	stageGone: 300,
	starPop: 450,
	title: { at: 250, ms: 600 },
	toast: 2400,
	top: 500,
	word: { at: 450, gap: 65, ms: 950, rise: 9 },
	wordsTail: 500,
} as const;

const CSS_EASE = Easing.bezierFn(0.25, 0.1, 0.25, 1);

export const EASE = {
	ease: CSS_EASE,
	reveal: Easing.bezierFn(0.25, 0.75, 0.2, 1),
	sheet: Easing.bezierFn(0.2, 0.85, 0.2, 1),
	stage: Easing.bezierFn(0.2, 0.8, 0.2, 1),
	word: Easing.bezierFn(0.2, 0.7, 0.2, 1),
};

export const LIFT = {
	pick: { scale: 0.9, y: 148 },
	write: { scale: 0.82, y: 196 },
} as const;

export const SOFT = { blur: 55, dim: 0.22, scale: 1.1 } as const;

export const wordsEnd = (n: number) => T.word.at + n * T.word.gap + T.wordsTail;

export type QuoteMotion = {
	clock: SharedValue<number>;
	sheet: SharedValue<number>;
	liftY: SharedValue<number>;
	liftScale: SharedValue<number>;
	soft: SharedValue<number>;
	chrome: SharedValue<number>;
	stage: SharedValue<number>;
	acts: SharedValue<number>;
	reduced: boolean;
};

export const SETTLED = 1e6;

export const QuoteMotionContext = createContext<QuoteMotion | null>(null);

export function useQuoteMotion(): QuoteMotion {
	const m = use(QuoteMotionContext);
	if (!m) {
		throw new Error("useQuoteMotion outside the quote screen");
	}
	return m;
}

export function slice(
	clock: number,
	at: number,
	ms: number,
	ease?: (t: number) => number
) {
	"worklet";
	const t = Math.min(1, Math.max(0, (clock - at) / ms));
	return ease ? ease(t) : CSS_EASE(t);
}
