import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import * as Sentry from "@sentry/react-native";

type ClerkGetToken = ReturnType<typeof useAuth>["getToken"];

/**
 * How long to keep retrying a token fetch while Clerk still claims a session,
 * and the delay between attempts. On a prod cold start Clerk reports
 * `isSignedIn: true` up to a few seconds before its client (`/v1/client`) has
 * rehydrated, during which `getToken` throws "You are signed out" / returns null.
 * 6s is a safe ceiling that still bails quickly for a genuinely signed-out user.
 */
const RETRY_WINDOW_MS = 6000;
const RETRY_DELAY_MS = 300;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Convex's `setAuth` is only re-run when `fetchAccessToken` changes identity, and
 * `ConvexProviderWithClerk` rebuilds that only when `orgId`/`orgRole`/`sessionId`
 * change. Once Convex has latched `noAuth` nothing else moves it, so a desync with
 * a perfectly mintable token hangs forever. {@link AuthSyncGuard} lives below the
 * provider (it needs `useConvexAuth`) and calls this to bump a nonce we fold into
 * the `sessionId` we report, which is a dep — that rebuilds `fetchAccessToken` and
 * re-runs `setAuth`. The value is only ever read as a memo dep, never sent anywhere.
 */
let reauthEpoch = 0;
const epochListeners = new Set<() => void>();
export const subscribeEpoch = (listener: () => void) => {
  epochListeners.add(listener);
  return () => {
    epochListeners.delete(listener);
  };
};
export const getReauthEpoch = () => reauthEpoch;

export function requestConvexReauth() {
  reauthEpoch++;
  epochListeners.forEach((listener) => listener());
}

/**
 * The reported `sessionId`, tagged with the re-auth nonce. Epoch 0 (the normal
 * case) reports Clerk's value untouched.
 */
export const sessionIdWithEpoch = (
  sessionId: string | null | undefined,
  epoch: number,
) => (epoch > 0 && sessionId ? `${sessionId}#${epoch}` : sessionId);

/**
 * Drop-in replacement for Clerk's `useAuth`, passed to `ConvexProviderWithClerk`
 * to fix the cold-start logout: on launch Clerk reports `isSignedIn: true` before
 * its client can mint a token, so Convex's single init token fetch fails and
 * Convex reports unauthenticated (it does NOT retry the initial fetch), dropping
 * the still-signed-in user to the auth screen. We retry `getToken` here while
 * Clerk still claims a session, so Convex's init fetch resolves to a real token.
 * While we retry, Convex stays `isLoading`, so the app shows the loader instead of
 * flashing auth.
 *
 * `getToken` keeps a stable identity via refs + a `useCallback([])` wrapper
 * (documented React Compiler exception). Note `ConvexProviderWithClerk` does NOT
 * key `fetchAccessToken` on `getToken` — its deps are `[orgId, orgRole, sessionId]`
 * ("Clerk's Expo useAuth hook is not memoized so we don't include getToken") — so
 * the stability is defensive, not load-bearing. `sessionId` being a dep is what
 * {@link requestConvexReauth} exploits.
 */
export function useResilientClerkAuth() {
  const auth = useAuth();
  const epoch = useSyncExternalStore(
    subscribeEpoch,
    getReauthEpoch,
    getReauthEpoch,
  );
  const getTokenRef = useRef(auth.getToken);
  const isSignedInRef = useRef(auth.isSignedIn);
  useEffect(() => {
    getTokenRef.current = auth.getToken;
    isSignedInRef.current = auth.isSignedIn;
  }, [auth.getToken, auth.isSignedIn]);

  const getToken = useCallback<ClerkGetToken>(async (options) => {
    const start = Date.now();
    let attempt = 0;
    let lastError: unknown = null;

    // Retry only while Clerk still claims a session — a failure then is the boot
    // race, not a real sign-out. The first iteration always runs.
    while (true) {
      attempt++;
      try {
        const token = await getTokenRef.current(options);
        if (token) return token;
        lastError = null;
      } catch (error) {
        lastError = error;
      }
      if (isSignedInRef.current !== true) break;
      if (Date.now() - start + RETRY_DELAY_MS >= RETRY_WINDOW_MS) break;
      await sleep(RETRY_DELAY_MS);
    }

    // Exhausted while still signed in: a token never minted in the window — a
    // genuine failure, not the transient boot race. Surface it; this is rare and
    // actionable (the only thing left that would still strand a user on auth).
    if (isSignedInRef.current === true) {
      const err =
        lastError instanceof Error
          ? `${lastError.name}: ${lastError.message}`
          : lastError != null
            ? String(lastError)
            : "null-token";
      Sentry.captureMessage(
        `Clerk getToken never minted after ${attempt} attempts in ${Date.now() - start}ms (skipCache:${options?.skipCache ?? false} err:${err})`,
        "error",
      );
    }
    // Match Clerk's native contract: null means unauthenticated.
    return null;
  }, []);

  return {
    ...auth,
    getToken,
    sessionId: sessionIdWithEpoch(auth.sessionId, epoch),
  };
}
