import { describe, expect, it } from 'vitest';
import { rateCtaState } from './utils';

describe('rateCtaState', () => {
  // canRate | myRating → what the CTA does
  const cases: {
    canRate: boolean;
    myRating?: number;
    expected: 'hidden' | 'prompt' | 'rated';
  }[] = [
    { canRate: true, myRating: undefined, expected: 'prompt' },
    { canRate: true, myRating: 4, expected: 'rated' },
    { canRate: false, myRating: undefined, expected: 'hidden' },
    // Rated, then the conversation stopped being rateable (a block): the link
    // goes away even for someone who already used it.
    { canRate: false, myRating: 5, expected: 'hidden' },
  ];

  for (const c of cases) {
    it(`canRate=${c.canRate} myRating=${c.myRating} → ${c.expected}`, () => {
      expect(rateCtaState({ canRate: c.canRate, myRating: c.myRating })).toBe(
        c.expected,
      );
    });
  }
});
