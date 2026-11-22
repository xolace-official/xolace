import { useLettersPushSwitch } from "@/features/letters/settings/use-letters-settings";
import { useReachMeOnRow } from "@/features/reach-me-on/use-reach-me-on-row";
import { NotificationsData } from "@/features/settings/notifications/notifications-data";
import { NotificationsScreen } from "@/features/settings/notifications/notifications-screen";

export default function NotificationsRoute() {
	const reachMeOn = useReachMeOnRow();
	const letters = useLettersPushSwitch();
	return (
		<NotificationsData letters={letters} reachMeOn={reachMeOn}>
			<NotificationsScreen />
		</NotificationsData>
	);
}
