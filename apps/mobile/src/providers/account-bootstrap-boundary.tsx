import { useAuth } from "@clerk/expo";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import * as Sentry from "@sentry/react-native";

import { FullRippleLoader } from "@/src/components/shared/loader/ripple/full-ripple-loader";
import { isBootstrapError } from "./bootstrap-error";
import { attemptsFor, MAX_RETRIES, RETRY_DELAY_MS } from "./bootstrap-retry";

/**
 * Loader while the row settles. Anything that is not a bootstrap error is
 * rethrown here — a throw from the fallback escapes its own boundary and lands
 * on the root ErrorBoundary, which reports it.
 */
function BootstrapFallback({ error }: FallbackProps) {
  if (!isBootstrapError(error)) throw error;
  return <FullRippleLoader />;
}

/**
 * Holds the auth-bootstrap window where Convex is authenticated but the user
 * row is not yet usable, so it renders a loader instead of the red-screen
 * fallback.
 *
 * Two production paths land here, both of which used to crash the app:
 *
 *  - Sign-in. `setActive` flips Convex to authenticated, which mounts every
 *    protected subscription *and* the app-wide ones in RootProvider
 *    (premium.getEntitlement) — all before the `getOrCreate` mutation that
 *    creates or reactivates the row has returned. They throw `user_not_found`
 *    (new account) or `account_inactive` (account being reactivated inside the
 *    deletion grace period).
 *  - Delete account. Patching `accountStatus` invalidates every subscription
 *    that read the users row; they all re-run and throw `account_inactive`
 *    within milliseconds — long before the follow-up `signOut` can tear the
 *    session down.
 *
 * Both resolve on their own: the row lands, or Clerk signs out and the queries
 * stop being issued. Resetting unmounts and remounts the subtree, which drops
 * the errored subscriptions so they re-issue against current server state
 * instead of replaying the cached failure. If it never resolves the account
 * really is dead, so we sign out and let the route guard fall through to
 * `(auth)`.
 *
 * Any other error is rethrown from the fallback, which lands it on the root
 * ErrorBoundary that reports it.
 */
export function AccountBootstrapBoundary({ children }: { children: ReactNode }) {
  const { signOut, sessionId } = useAuth();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tagged with the session id — not `isSignedIn`, which returns to `true` on
  // the next sign-in and would hand a fresh session the old one's spent budget.
  // Derived, so no effect has to sync it.
  const [budget, setBudget] = useState({ session: sessionId, attempt: 0 });
  const attempt = attemptsFor(budget, sessionId);

  // Also runs when the session changes, dropping a retry queued by the session
  // that just ended.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [sessionId],
  );

  const handleError = (error: unknown) => {
    if (!isBootstrapError(error)) return; // rethrown by the fallback below
    if (attempt >= MAX_RETRIES) {
      Sentry.captureMessage(
        "Account bootstrap never settled — signing out",
        "error",
      );
      void signOut().catch(() => {});
      return;
    }
    timer.current = setTimeout(
      () => setBudget({ session: sessionId, attempt: attempt + 1 }),
      RETRY_DELAY_MS,
    );
  };

  return (
    <ErrorBoundary
      // A landed sign-out is itself a resolution: the queries stop being
      // issued, so remount rather than sitting on the loader.
      resetKeys={[attempt, sessionId]}
      onError={handleError}
      FallbackComponent={BootstrapFallback}
    >
      {children}
    </ErrorBoundary>
  );
}
