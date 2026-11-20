import * as Sentry from "@sentry/react-native";
import { posthog } from "@/config/posthog";
import { type HoldReason, LAUNCH_TIMING } from "./launch-model";

export function useLaunchReports() {
	return {
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
