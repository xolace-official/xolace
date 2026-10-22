import { describe, expect, it } from 'vitest';
import { intentLine } from './intent-line';

describe('intentLine', () => {
  it('returns a line for each of the four committal Q2 answers', () => {
    for (const intent of [
      'understand_feelings',
      'get_through_hard_moment',
      'feel_less_alone',
      'make_it_regular',
    ]) {
      expect(intentLine({ intent } as never, true)).toBeTruthy();
    }
  });

  it('stays static for the non-committal answers and a missing one', () => {
    expect(intentLine({ intent: 'just_looking' } as never, true)).toBeNull();
    expect(intentLine({ intent: 'prefer_not_to_say' } as never, true)).toBeNull();
    expect(intentLine({}, true)).toBeNull();
  });

  it('stays static on the control arm even with a committal answer', () => {
    expect(intentLine({ intent: 'feel_less_alone' } as never, false)).toBeNull();
  });
});
