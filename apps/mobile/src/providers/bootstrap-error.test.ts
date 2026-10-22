import { describe, expect, it } from 'vitest';
import { isBootstrapError } from './bootstrap-error';

/**
 * Guards the branch that decides "hold and retry" vs "crash to the root
 * boundary". A false negative red-screens the app on every sign-in; a false
 * positive swallows a real crash behind an infinite loader.
 */
describe('isBootstrapError', () => {
  it('matches the typed requireAuth codes', () => {
    for (const code of ['user_not_found', 'account_inactive']) {
      expect(isBootstrapError({ data: { code } })).toBe(true);
    }
  });

  it('does not classify bare message throws', () => {
    // Production redacts a bare `Error` to "Server Error" before it reaches the
    // client, so an untyped throw is never safely classifiable as transient.
    expect(
      isBootstrapError(new Error('Uncaught Error: Account is not active')),
    ).toBe(false);
    expect(
      isBootstrapError(new Error('User not found. Call getOrCreate first.')),
    ).toBe(false);
  });

  it('does not swallow other auth or app errors', () => {
    // not_authenticated is Clerk's problem, not a settling row — letting it
    // retry here would mask a broken session behind a loader.
    expect(isBootstrapError({ data: { code: 'not_authenticated' } })).toBe(false);
    expect(isBootstrapError({ data: { code: 'max_refinement_turns' } })).toBe(false);
    expect(isBootstrapError({ data: { code: 'profile_not_found' } })).toBe(false);
    expect(isBootstrapError(new Error('Server Error'))).toBe(false);
    expect(isBootstrapError(null)).toBe(false);
    expect(isBootstrapError(undefined)).toBe(false);
    expect(isBootstrapError('Account is not active')).toBe(false);
  });
});
