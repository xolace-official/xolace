/**
 * Sizing + animation constants for the streak calendar.
 *
 * The card renders at two sizes: a mini version that lives in the Perch strip
 * and a full-size version used during the reveal.
 * All inner dimensions derive proportionally from the card size so
 * the morph between the two is a pure transform (translate + scale)
 * — no layout animation.
 */
export const FULL_SIZE = 190;
export const MINI_SIZE = 62;

export const MORPH_SPRING = { dampingRatio: 1, duration: 520 } as const;
export const FLIP_SPRING = { dampingRatio: 1, duration: 1100 } as const;
export const BLAST_SPRING = { mass: 1, stiffness: 100, damping: 20 } as const;

/** Delay after idle mount before measuring + starting the reveal. */
export const REVEAL_START_DELAY_MS = 700;

export type CardColors = {
  /** Card header strip — --accent */
  header: string;
  /** Header label text — --accent-foreground */
  headerText: string;
  /** Page body — --surface */
  body: string;
  /** Day number — --foreground */
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
    size,
    headerHeight,
    bodyHeight,
    pageSize: bodyHeight / 2,
    numberFontSize: size * 0.42,
    headerFontSize: Math.max(size * 0.085, 8),
    outerRadius: (size * 24) / FULL_SIZE,
    innerRadius: (size * 20) / FULL_SIZE,
  };
}
