import { useAuth } from "@clerk/expo";
import { useConvexAuth } from "convex/react";
import { useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/react-native";
import { requestConvexReauth } from "./use-resilient-clerk-auth";

/**
 * How long to tolerate a Clerk⇄Convex auth desync before recovering. Convex
 * normally validates a token within a second or two of Clerk reporting a session,
 * so anything past this window is a genuine failure, not settling.
 */
const DESYNC_GRACE_MS = 4000;

/** How many forced re-auths to try before concluding the session is unusable. */
const MAX_REAUTH_ATTEMPTS = 2;

/**
 * What to do once the grace window expires, given the token probe's outcome.
 * Pure so the policy is testable without a renderer.
 */
export function desyncRecovery(probe: {
  token: string | null;
  threw: boolean;
  attempt: number;
}): { action: "reauth" | "signout"; reason: string } {
  if (probe.token && probe.attempt < MAX_REAUTH_ATTEMPTS) {
    return {
      action: "reauth",
      reason: `Auth desync — token mintable past grace; forcing Convex re-auth (attempt ${probe.attempt + 1}/${MAX_REAUTH_ATTEMPTS})`,
    };
  }
  if (probe.token) {
    return {
      action: "signout",
      reason: `Auth desync — still desynced after ${MAX_REAUTH_ATTEMPTS} forced re-auths; signing out`,
    };
  }
  return {
    action: "signout",
    reason: probe.threw
      ? "Auth desync — getToken threw past grace; signing out"
      : "Auth desync — token unmintable past grace; signing out",
  };
}

/**
 * Safety net for a Clerk⇄Convex auth desync.
 *
 * The cold-start desync that dropped users to auth is fixed upstream in
 * {@link useResilientClerkAuth} (it retries getToken so Convex's init fetch
 * succeeds). This guard only matters for the rare case that still gets through:
 * Clerk reports a session (`isSignedIn`) but Convex never validates a token past
 * {@link DESYNC_GRACE_MS}. We then check whether a token is actually mintable:
 *   - mintable → force Convex to re-authenticate via {@link requestConvexReauth}.
 *     Convex has latched `noAuth` and will never retry on its own, so merely
 *     keeping the session (what this branch used to do) hung forever.
 *   - not mintable, or still desynced after {@link MAX_REAUTH_ATTEMPTS} → sign out
 *     so the user can cleanly re-authenticate instead of being trapped on
 *     "you're already signed in".
 *
 * Renders nothing — mount once inside the Clerk + Convex provider tree.
 */
export function AuthSyncGuard() {
  const { isSignedIn, getToken, signOut } = useAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();

  // Hold the Clerk callbacks in refs so the recovery timer is driven only by the
  // (stable) auth-state booleans, not callback identity churn that would reset
  // the grace window every render.
  const getTokenRef = useRef(getToken);
  const signOutRef = useRef(signOut);
  useEffect(() => {
    getTokenRef.current = getToken;
    signOutRef.current = signOut;
  }, [getToken, signOut]);

  // Caps the episode. A ref, not state: the healthy-path reset below runs in the
  // effect body, and a synchronous setState there cascades renders.
  const attemptRef = useRef(0);
  // Bumped after each forced re-auth purely to re-arm the grace timer.
  const [reauthTick, setReauthTick] = useState(0);

  useEffect(() => {
    // Healthy or signed out — nothing to recover; end the episode.
    if (!isSignedIn || isAuthenticated) {
      attemptRef.current = 0;
      return;
    }
    // Settling (including the reload our own re-auth triggers). Wait it out, but
    // do NOT reset `attempt` — that would make the recovery loop unbounded.
    if (isLoading) return;

    const timer = setTimeout(async () => {
      let token: string | null = null;
      let threw = false;
      try {
        token = await getTokenRef.current();
      } catch {
        threw = true;
      }

      const { action, reason } = desyncRecovery({
        token,
        threw,
        attempt: attemptRef.current,
      });
      if (action === "reauth") {
        Sentry.captureMessage(reason, "warning");
        requestConvexReauth();
        attemptRef.current += 1;
        setReauthTick((t) => t + 1);
        return;
      }
      Sentry.captureMessage(reason, "error");
      signOutRef.current().catch(() => {});
    }, DESYNC_GRACE_MS);

    return () => clearTimeout(timer);
  }, [isLoading, isSignedIn, isAuthenticated, reauthTick]);

  return null;
}
