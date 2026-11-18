import { useReachMeOnRow } from "@/features/reach-me-on/use-reach-me-on-row";
import { NotificationsData } from "@/features/settings/notifications/notifications-data";
import { NotificationsScreen } from "@/features/settings/notifications/notifications-screen";

/** Notifications, with "Reach me on…" composed in here: features meet in routes. */
export default function NotificationsRoute() {
	const reachMeOn = useReachMeOnRow();
	return (
		<NotificationsData reachMeOn={reachMeOn}>
			<NotificationsScreen />
		</NotificationsData>
	);
}
