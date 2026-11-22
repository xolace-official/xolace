import { useConvexAuth } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { useFullContext } from "@/lib/convex/use-full-context";
import { intakePersonProperties } from "@/lib/intake-analytics";
import { useAppStore } from "@/store/store";

export function usePostHogIdentity() {
	const posthog = usePostHog();
	const { isAuthenticated } = useConvexAuth();
	const accountPending = useAppStore((s) => s.accountPending);
	const context = useFullContext(!isAuthenticated || accountPending);
	const identified = useRef<string | null>(null);

	useEffect(() => {
		if (!isAuthenticated) {
			identified.current = null;
			return;
		}
		const profileId = context?.profile?._id;
		if (!profileId || identified.current === profileId) {
			return;
		}
		identified.current = profileId;

		if (__DEV__) {
			console.log("[posthog] identify", profileId);
		}

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
