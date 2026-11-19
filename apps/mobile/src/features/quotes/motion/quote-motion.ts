import { createContext, use } from "react";
import { Easing, type SharedValue } from "react-native-reanimated";

/**
 * Quotes' timings (handoff §3, the board's CSS), and the shared values every part of the screen
 * reads, so a sheet opening or the arrival moves things on the UI thread with no React commit
 * per frame.
 */
export const T = {
	acts: { ms: 700, rise: 18 },
	actsHide: 450,
	/** The background fades in on arrival. */
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
	/** A sheet rises over 500 ms; the quote moves over 600 ms. */
	sheet: 500,
	soft: 600,
	stage: 600,
	stageGone: 300,
	starPop: 450,
	title: { at: 250, ms: 600 },
	toast: 2400,
	top: 500,
	word: { at: 450, gap: 65, ms: 950, rise: 9 },
	/** The words' end = 450 + n × 65 + 500. */
	wordsTail: 500,
} as const;

/** CSS `ease`, the board's default for fades. */
const CSS_EASE = Easing.bezierFn(0.25, 0.1, 0.25, 1);

/** (.2,.7,.2,1) words; (.2,.8,.2,1) the stage and actions; (.2,.85,.2,1) sheets; (.25,.75,.2,1) the reveal. */
export const EASE = {
	ease: CSS_EASE,
	reveal: Easing.bezierFn(0.25, 0.75, 0.2, 1),
	sheet: Easing.bezierFn(0.2, 0.85, 0.2, 1),
	stage: Easing.bezierFn(0.2, 0.8, 0.2, 1),
	word: Easing.bezierFn(0.2, 0.7, 0.2, 1),
};

/** How far the quote goes for each sheet: up 196 at .82 to write, up 148 at .9 for a picker. */
export const LIFT = {
	pick: { scale: 0.9, y: 148 },
	write: { scale: 0.82, y: 196 },
} as const;

/** The background softens behind write back, share and Words you kept. */
export const SOFT = { blur: 55, dim: 0.22, scale: 1.1 } as const;

export const wordsEnd = (n: number) => T.word.at + n * T.word.gap + T.wordsTail;

export type QuoteMotion = {
	/** ms since the arrival began; a big number once settled (no arrival). */
	clock: SharedValue<number>;
	/** 0 → 1 over 600 ms, linear: the sheet and the quote each ease their own slice of it. */
	sheet: SharedValue<number>;
	liftY: SharedValue<number>;
	liftScale: SharedValue<number>;
	soft: SharedValue<number>;
	/** 1 shown … 0 in Clear view. */
	chrome: SharedValue<number>;
	/** 1 … 0 when Words you kept or Share hide the quote. */
	stage: SharedValue<number>;
	/** 1 shown … 0 hidden (the action row and the kept link). */
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

/** A 0..1 slice of `clock` starting at `at` over `ms`, eased. */
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
