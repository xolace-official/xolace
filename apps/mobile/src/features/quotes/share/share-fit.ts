/** The board's preview card is 150 pt wide; everything on it scales from there. */
export const CARD_W = 150;
export const CARD_H = { square: 150, story: 266 } as const;
export const QUOTE = { lineHeight: 1.2, size: 13.5 } as const;
/** The quote centres in the space above the signature's band, never running into it. */
export const WORDS = { bottom: 30, side: 14, top: 14 } as const;
/**
 * A long quote shrinks to fit its band rather than run into the mark. Text area grows with the
 * square of the size, so the scale is √(room ÷ what the words need at full size). `charW` is
 * Space Grotesk Medium's average advance (spaces included) per em; `fill` keeps a margin for
 * ragged line ends.
 */
const FIT = { charW: 0.53, fill: 0.85, min: 0.6 } as const;

export function fitScale(text: string, fmt: keyof typeof CARD_H): number {
	const w = CARD_W - WORDS.side * 2;
	const h = CARD_H[fmt] - WORDS.top - WORDS.bottom;
	const need =
		text.length * FIT.charW * QUOTE.size * QUOTE.size * QUOTE.lineHeight;
	return Math.max(FIT.min, Math.min(1, Math.sqrt((FIT.fill * w * h) / need)));
}
