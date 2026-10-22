import { describe, expect, it } from 'vitest';

import { beltSlots, slotLeft, CARD_STRIDE, CARD_WIDTH } from './marquee-geometry';

const CARD_COUNT = 5;

/** Widest run of the track no card covers, across a full belt revolution. */
const worstGap = (viewport: number) => {
  const slots = beltSlots(viewport, CARD_COUNT);
  const beltWidth = slots * CARD_STRIDE;
  let worst = 0;
  for (let offset = 0; offset < beltWidth; offset += 3) {
    const lefts = Array.from({ length: slots }, (_, i) =>
      slotLeft(i, offset, beltWidth, viewport)
    ).sort((a, b) => a - b);
    let cursor = 0;
    let gap = 0;
    for (const left of lefts) {
      if (left > cursor) gap = Math.max(gap, Math.min(left, viewport) - cursor);
      cursor = Math.max(cursor, left + CARD_WIDTH);
    }
    if (cursor < viewport) gap = Math.max(gap, viewport - cursor);
    worst = Math.max(worst, gap);
  }
  return worst;
};

describe('founder marquee belt', () => {
  // #280: the belt was pinned to the card count (615px), so anything wider
  // never recycled and the right of the band stayed empty.
  it.each([320, 614, 615, 1280, 2000])(
    'covers the whole track at viewport %ipx',
    (viewport) => {
      expect(worstGap(viewport)).toBe(0);
    }
  );

  it('does not add slots on phone widths', () => {
    expect(beltSlots(390, CARD_COUNT)).toBe(CARD_COUNT);
  });
});
