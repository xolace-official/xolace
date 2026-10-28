import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { router, useLocalSearchParams } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import { KindlingAnnouncementScreen } from "@/features/kindling/components/kindling-announcement-screen";
import {
	type SessionEndPath,
	sessionEndHref,
} from "@/features/kindling/use-session-end-href";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";

type Params = {
	variant: "plus" | "free";
	path: SessionEndPath;
	sessionId: string;
};

/** The beat between a finished path and session-end (#458). Reached only via
 * `useSessionEndHref`; the session is already completed. */
export default function KindlingAnnouncement() {
	const { variant, path, sessionId } = useLocalSearchParams<Params>();
	const { isPlus } = usePlusEntitlement();
	const openPaywall = usePaywall((s) => s.open);
	const posthog = usePostHog();
	const free = !isPlus && variant === "free";
	// Its own surface so the funnel tells this beat from session-end's slot.
	useEffect(() => {
		if (free) {
			posthog.capture("plus_upsell_shown", {
				surface: "kindling_announcement",
			});
		}
	}, [free, posthog]);
	const toSessionEnd = () =>
		router.replace(sessionEndHref(path ?? "exit", sessionId));

	return (
		<KindlingAnnouncementScreen
			onContinue={toSessionEnd}
			onPaywall={() => {
				posthog.capture("plus_upsell_tapped", {
					surface: "kindling_announcement",
				});
				openPaywall("kindling", { sessionId: sessionId as Id<"sessions"> });
			}}
			onSkip={toSessionEnd}
			// A purchase from the paywall CTA returns here as Plus.
			variant={free ? "free" : "plus"}
		/>
	);
}
