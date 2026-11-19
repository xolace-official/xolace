import * as Sentry from "@sentry/react-native";
import { posthog } from "@/config/posthog";
import { type HoldReason, LAUNCH_TIMING } from "./launch-model";

/**
 * The launch cover's reports. The client itself, not `usePostHog`: the cover sits above every
 * provider, PostHog's included.
 */
export function useLaunchReports() {
	return {
		/** The cover left at `maxCoverMs` with these still loading: something was stuck. */
		coverTimedOut: (holds: readonly HoldReason[]) => {
			const data = {
				holds: [...holds],
				max_cover_ms: LAUNCH_TIMING.maxCoverMs,
			};
			posthog.capture("launch_cover_timeout", data);
			Sentry.addBreadcrumb({
				category: "launch.cover",
				data,
				level: "warning",
				message: "launch cover timed out",
			});
		},
	};
}
