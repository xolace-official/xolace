import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import { reachRowValue } from "@/features/reach-me-on/reach-view";
import { useReachMeOnFlag } from "@/features/reach-me-on/use-reach-channels";
import { NotificationsData } from "@/features/settings/notifications/notifications-data";
import { NotificationsScreen } from "@/features/settings/notifications/notifications-screen";

/**
 * Notifications, with "Reach me on…" composed in here: features meet in routes. The row shows as
 * production's did: behind the `reach-me-on` flag, and only where the deployment offers Telegram.
 * (Not `useReachChannels`: opening it counts as opening the sheet and refreshes the country.)
 */
export default function NotificationsRoute() {
	const enabled = useReachMeOnFlag() === true;
	const channels = useQuery(
		api.outreach.reachMe.listChannels,
		enabled ? {} : "skip"
	);
	const reachMeOn = channels?.some((c) => c.channel === "telegram")
		? { value: reachRowValue(channels) }
		: null;
	return (
		<NotificationsData reachMeOn={reachMeOn}>
			<NotificationsScreen />
		</NotificationsData>
	);
}
