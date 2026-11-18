/** Notifications' fixture adapter: the real screen under a provider filled from fixtures. */
import { NOTIFY_ACTIONS } from "@/features/settings/notifications/dev/fixtures";
import {
	type Notifications,
	NotificationsProvider,
} from "@/features/settings/notifications/notifications-data";
import { NotificationsScreen } from "@/features/settings/notifications/notifications-screen";
import type { QuietEnd } from "@/features/settings/notifications/quiet/quiet-hours";

export function FixtureNotifications({
	state,
	open = null,
}: {
	state: Notifications["state"];
	open?: QuietEnd | null;
}) {
	return (
		<NotificationsProvider value={{ actions: NOTIFY_ACTIONS, state }}>
			<NotificationsScreen initialOpen={open} />
		</NotificationsProvider>
	);
}
