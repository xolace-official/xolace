import { describe, expect, it } from 'vitest';
import { attemptsFor, MAX_RETRIES } from './bootstrap-retry';

/**
 * The budget decides "retry once more" vs "sign out". Leaking a spent budget
 * across sessions signs a healthy new sign-in straight back out.
 */
describe('attemptsFor', () => {
  it('accumulates within one session', () => {
    expect(attemptsFor({ session: 'sess_a', attempt: 3 }, 'sess_a')).toBe(3);
  });

  it('starts fresh on a session it was not spent against', () => {
    expect(attemptsFor({ session: 'sess_a', attempt: MAX_RETRIES }, 'sess_b')).toBe(0);
  });

  it('starts fresh after sign-out', () => {
    expect(attemptsFor({ session: 'sess_a', attempt: 2 }, null)).toBe(0);
  });
});
