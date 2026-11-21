export const CARD_W = 150;
export const CARD_H = { square: 150, story: 266 } as const;
export const QUOTE = { lineHeight: 1.2, size: 13.5 } as const;
export const WORDS = { bottom: 30, side: 14, top: 14 } as const;
const FIT = { charW: 0.53, fill: 0.85, min: 0.6 } as const;

export function fitScale(text: string, fmt: keyof typeof CARD_H): number {
	const w = CARD_W - WORDS.side * 2;
	const h = CARD_H[fmt] - WORDS.top - WORDS.bottom;
	const need =
		text.length * FIT.charW * QUOTE.size * QUOTE.size * QUOTE.lineHeight;
	return Math.max(FIT.min, Math.min(1, Math.sqrt((FIT.fill * w * h) / need)));
}
