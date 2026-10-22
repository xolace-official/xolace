import { useEffect, useRef } from 'react';
import { useConvexAuth } from 'convex/react';
import { useFullContext } from '@/src/lib/convex/use-full-context';
import { usePostHog } from 'posthog-react-native';
import { intakePersonProperties } from '@/src/features/intake/analytics';

/**
 * Identify the client on the pseudonymous `emotional_profiles._id`.
 *
 * Every server capture uses that id as its distinctId (RevenueCat's
 * `appUserId` is the same id — see premium.ts), so identifying on `users._id`
 * put client and server events on two different persons and silently split
 * every funnel that crossed the boundary.
 *
 * Runs on app open rather than at sign-in: existing installs never call
 * `users.getOrCreate` again, so a sign-in-only fix would never reach them.
 * Sign-out already calls `posthog.reset()`, so the anonymous → identified
 * merge is clean on the next sign-in.
 */
export function usePostHogIdentity() {

  const posthog = usePostHog();
  // Skips while signed out: this now mounts at the root (so it also runs
  // during intake), where a signed-out user would otherwise hit requireAuth.
  const { isAuthenticated } = useConvexAuth();
  const context = useFullContext(!isAuthenticated);
  const identified = useRef<string | null>(null);

  useEffect(() => {
    // This hook mounts at the root now, so it outlives a sign-out — without
    // this the ref would still name the old profile and a sign-in as the same
    // user in the same run would skip identify, stranding every later event on
    // the anonymous id that `posthog.reset()` just handed out.
    if (!isAuthenticated) {
      identified.current = null;
      return;
    }
    const profileId = context?.profile?._id;
    if (!profileId || identified.current === profileId) return;
    identified.current = profileId;

    // PostHog is disabled in dev (src/config/posthog.ts), so identify is a
    // no-op there and the distinct id never visibly changes — this log is the
    // only way to confirm the call on a dev build.
    if (__DEV__) console.log('[posthog] identify', profileId);

    // Intake answers as person properties (T7, issue #267). The dual-write
    // proper happens at questionnaire submit; this is the backfill, and it is
    // the only path for an install that ran intake before it shipped — intake
    // never runs twice.
    const intake = context.intake
      ? intakePersonProperties(context.intake, context.intake.intakeVersion)
      : null;

    posthog.identify(profileId, {
      $set: { auth_provider: context.user.authProvider, ...intake?.$set },
      $set_once: {
        first_sign_in_date: new Date(context.user.createdAt).toISOString(),
        ...intake?.$set_once,
      },
    });
  }, [context, posthog, isAuthenticated]);
}
