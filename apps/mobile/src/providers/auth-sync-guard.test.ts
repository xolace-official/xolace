import { describe, expect, it, vi } from 'vitest';

import { desyncRecovery } from './auth-sync-guard';
import {
  getReauthEpoch,
  requestConvexReauth,
  sessionIdWithEpoch,
  subscribeEpoch,
} from './use-resilient-clerk-auth';

// The modules under test are pure, but they sit in files that import the Clerk
// and Sentry native SDKs at module scope.
vi.mock('@clerk/expo', () => ({ useAuth: () => ({}) }));
vi.mock('@sentry/react-native', () => ({ captureMessage: () => {} }));
vi.mock('convex/react', () => ({ useConvexAuth: () => ({}) }));

/**
 * The bug this replaced: a mintable token meant "keep the session and let Convex
 * re-authenticate", but Convex had already latched noAuth and never retries — so
 * the branch we most want to work silently hung forever.
 */
describe('desyncRecovery', () => {
  it('forces a re-auth while a token still mints', () => {
    expect(desyncRecovery({ token: 'jwt', threw: false, attempt: 0 }).action).toBe('reauth');
    expect(desyncRecovery({ token: 'jwt', threw: false, attempt: 1 }).action).toBe('reauth');
  });

  it('signs out once the forced re-auths are spent', () => {
    expect(desyncRecovery({ token: 'jwt', threw: false, attempt: 2 }).action).toBe('signout');
  });

  it('signs out when nothing can mint', () => {
    expect(desyncRecovery({ token: null, threw: false, attempt: 0 }).action).toBe('signout');
    expect(desyncRecovery({ token: null, threw: true, attempt: 0 }).action).toBe('signout');
  });
});

/**
 * The nonce is the only thing that moves Convex: `ConvexProviderWithClerk` keys
 * `fetchAccessToken` on `[orgId, orgRole, sessionId]`, so a changed sessionId is
 * what re-runs `setAuth`.
 */
describe('reauth nonce', () => {
  it('reports Clerk sessionId untouched before any recovery', () => {
    expect(sessionIdWithEpoch('sess_a', 0)).toBe('sess_a');
    expect(sessionIdWithEpoch(null, 0)).toBe(null);
  });

  it('changes the reported sessionId on every request', () => {
    const before = getReauthEpoch();
    const seen = new Set<unknown>();
    const listener = vi.fn();
    const unsubscribe = subscribeEpoch(listener);

    for (let i = 0; i < 2; i++) {
      requestConvexReauth();
      seen.add(sessionIdWithEpoch('sess_a', getReauthEpoch()));
    }
    unsubscribe();

    expect(getReauthEpoch()).toBe(before + 2);
    expect(seen.size).toBe(2);
    expect(listener).toHaveBeenCalledTimes(2);
    expect([...seen].every((id) => id !== 'sess_a')).toBe(true);
  });
});
