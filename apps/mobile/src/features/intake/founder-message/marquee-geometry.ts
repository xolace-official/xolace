// Belt geometry for the founder marquee, kept separate from the component so the
// coverage guarantee is testable without a renderer.

export const CARD_WIDTH = 150;
export const CARD_HEIGHT = 200;
export const CARD_STRIDE = CARD_WIDTH * 0.82; // deliberate overlap, so the band reads as a stack

/**
 * Slots the belt needs to stay at least one card wider than the viewport.
 * Pinning the belt to the card count instead left the right side permanently
 * empty on anything wider than the belt (#280) — the recycle test never fired.
 */
export const beltSlots = (viewport: number, minSlots: number) =>
  Math.max(minSlots, Math.ceil((viewport + CARD_WIDTH) / CARD_STRIDE));

const mod = (a: number, m: number) => {
  'worklet';
  return ((a % m) + m) % m;
};

/** Left edge of one slot for the current drift, recycled onto the near side. */
export const slotLeft = (
  index: number,
  offset: number,
  beltWidth: number,
  viewport: number
) => {
  'worklet';
  const left = mod(index * CARD_STRIDE - mod(offset, beltWidth), beltWidth);
  return left > viewport ? left - beltWidth : left;
};
