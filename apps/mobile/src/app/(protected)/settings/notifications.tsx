import { useLettersPushSwitch } from "@/features/letters/settings/use-letters-settings";
import { useReachMeOnRow } from "@/features/reach-me-on/use-reach-me-on-row";
import { NotificationsData } from "@/features/settings/notifications/notifications-data";
import { NotificationsScreen } from "@/features/settings/notifications/notifications-screen";

/** Notifications, with "Reach me on…" and letters' push switch composed in here: features meet
 * in routes. */
export default function NotificationsRoute() {
	const reachMeOn = useReachMeOnRow();
	const letters = useLettersPushSwitch();
	return (
		<NotificationsData letters={letters} reachMeOn={reachMeOn}>
			<NotificationsScreen />
		</NotificationsData>
	);
}
