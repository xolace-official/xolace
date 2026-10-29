import { useConvexAuth } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { intakePersonProperties } from "@/features/intake/analytics";
import { useFullContext } from "@/lib/convex/use-full-context";

/** Identifies on `emotional_profiles._id`, the distinctId server captures and RevenueCat use;
 * `users._id` split funnels. Runs on app open. */
export function usePostHogIdentity() {
	const posthog = usePostHog();
	// Skips while signed out: this now mounts at the root (so it also runs
	// during intake), where a signed-out user would otherwise hit requireAuth.
	const { isAuthenticated } = useConvexAuth();
	const context = useFullContext(!isAuthenticated);
	const identified = useRef<string | null>(null);

	useEffect(() => {
		// Mounted at the root, so it outlives a sign-out; clear the ref so the next sign-in
		// re-identifies.
		if (!isAuthenticated) {
			identified.current = null;
			return;
		}
		const profileId = context?.profile?._id;
		if (!profileId || identified.current === profileId) {
			return;
		}
		identified.current = profileId;

		// PostHog is disabled in dev, so this log is the only way to confirm the call on a dev
		// build.
		if (__DEV__) {
			console.log("[posthog] identify", profileId);
		}

		// Intake answers as person properties (T7, #267): the backfill for installs that ran
		// intake before it shipped.
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
