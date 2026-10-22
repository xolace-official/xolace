import { describe, expect, it } from 'vitest';
import {
  extractErrorMessage,
  isMaxRefinementError,
  isRateLimitMessage,
  projectScreen,
  type ServerSessionState,
} from './session-service';
import type { ReflectionStateName } from './types';

describe('projectScreen', () => {
  // [serverState, localScreen, escalationTriggered, expected]
  const table: [
    ServerSessionState,
    ReflectionStateName,
    boolean,
    ReflectionStateName | null,
  ][] = [
    // Pre-processing — local always wins
    ['initiated', 'idle', false, null],
    ['input_received', 'processing', false, null],
    // Processing — server wins
    ['processing', 'mirror', false, 'processing'],
    // Mirror delivered — server wins at the edge…
    ['mirror_delivered', 'processing', false, 'mirror'],
    ['mirror_delivered', 'idle', false, 'mirror'], // cold resume
    ['mirror_delivered', 'processing', true, 'escalation'],
    // …but local sub-modes and optimistic advances win
    ['mirror_delivered', 'clarify', false, null],
    ['mirror_delivered', 'gave-up', false, null],
    ['mirror_delivered', 'path-selection', false, null],
    ['mirror_delivered', 'clarify', true, null],
    // Confirmed — server wins
    ['confirmed', 'mirror', false, 'path-selection'],
    // In-path — owned by the path screens, never projected onto reflect
    // (a stale in-path session via getActive must not resurrect a screen)
    ['path_selected', 'path-selection', false, null],
    ['path_in_progress', 'idle', false, null],
    // Error — server wins
    ['error', 'processing', false, 'error'],
    // Terminal — no screen; the machine resets
    ['completed', 'path-selection', false, null],
    ['abandoned', 'typing', false, null],
  ];

  for (const [serverState, localScreen, escalation, expected] of table) {
    it(`(${serverState}, ${localScreen}, escalation=${escalation}) → ${expected}`, () => {
      expect(projectScreen(serverState, localScreen, escalation)).toBe(
        expected,
      );
    });
  }
});

describe('isMaxRefinementError', () => {
  it('matches the typed ConvexError code', () => {
    const error = Object.assign(new Error('Server Error'), {
      data: { code: 'max_refinement_turns', message: 'Maximum refinement turns reached' },
    });
    expect(isMaxRefinementError(error)).toBe(true);
  });

  it('falls back to the legacy message substring', () => {
    expect(
      isMaxRefinementError(new Error('Uncaught Error: Maximum refinement turns reached')),
    ).toBe(true);
  });

  it('rejects unrelated errors and non-errors', () => {
    expect(isMaxRefinementError(new Error('Not authenticated'))).toBe(false);
    expect(
      isMaxRefinementError(
        Object.assign(new Error('x'), { data: { code: 'input_too_long' } }),
      ),
    ).toBe(false);
    expect(isMaxRefinementError('Maximum refinement turns')).toBe(false);
    expect(isMaxRefinementError(null)).toBe(false);
  });
});

describe('extractErrorMessage — rate limit', () => {
  // Production scrubs the error *message* ("Server Error"); only ConvexError
  // `data` survives. Dev leaves the message intact, which is why this only
  // ever broke in prod.
  const prodRateLimitError = () =>
    Object.assign(
      new Error(
        '[CONVEX M(sessions:initiate)] [Request ID: abc123] Server Error',
      ),
      { data: { kind: 'RateLimited', name: 'sessionInitiate', retryAfter: 120000 } },
    );

  it('reads the rate limit off ConvexError data when the message is scrubbed', () => {
    const message = extractErrorMessage(prodRateLimitError());
    expect(message).toBe("You've been reflecting a lot. Come back in 2 minutes.");
    expect(isRateLimitMessage(message)).toBe(true);
  });

  it('reads the auth code off ConvexError data when the message is scrubbed', () => {
    expect(
      extractErrorMessage(
        Object.assign(new Error('[Request ID: abc] Server Error'), {
          data: { code: 'not_authenticated', message: 'Not authenticated' },
        }),
      ),
    ).toBe('Your session expired. Please sign in again.');
  });
});

describe('isRateLimitMessage', () => {
  it('matches both rate-limit paths and nothing else', () => {
    expect(
      isRateLimitMessage(extractErrorMessage(new Error('RateLimited {"retryAfter":120000}'))),
    ).toBe(true);
    expect(
      isRateLimitMessage("You've reached the limit for reflections. Try again in 2 minutes."),
    ).toBe(true);
    expect(isRateLimitMessage(extractErrorMessage(new Error('boom')))).toBe(false);
  });
});
