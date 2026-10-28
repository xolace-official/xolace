/**
 * Streak calendar constants; inner sizes scale with the card, so the morph is a pure transform.
 */
export const FULL_SIZE = 190;
export const MINI_SIZE = 62;

export const MORPH_SPRING = { dampingRatio: 1, duration: 520 } as const;
export const FLIP_SPRING = { dampingRatio: 1, duration: 1100 } as const;
export const BLAST_SPRING = { damping: 20, mass: 1, stiffness: 100 } as const;

/** Delay after idle mount before measuring and starting the reveal. */
export const REVEAL_START_DELAY_MS = 700;

export type CardColors = {
	/** --accent */
	header: string;
	/** --accent-foreground */
	headerText: string;
	/** --surface */
	body: string;
	/** --foreground */
	number: string;
};

export type CardMetrics = {
	size: number;
	headerHeight: number;
	bodyHeight: number;
	pageSize: number;
	numberFontSize: number;
	headerFontSize: number;
	outerRadius: number;
	innerRadius: number;
};

export function getCardMetrics(size: number): CardMetrics {
	const headerHeight = (size * 50) / FULL_SIZE;
	const bodyHeight = size - headerHeight;
	return {
		bodyHeight,
		headerFontSize: Math.max(size * 0.085, 8),
		headerHeight,
		innerRadius: (size * 20) / FULL_SIZE,
		numberFontSize: size * 0.42,
		outerRadius: (size * 24) / FULL_SIZE,
		pageSize: bodyHeight / 2,
		size,
	};
}
