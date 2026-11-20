import { NotificationBanner } from "./banner/notification-banner";
import { useComingBackHost } from "./use-coming-back";

export function ComingBackHost() {
	const { banner, dismissBanner } = useComingBackHost();
	// Keyed by notification: a second tap starts a new banner and its own timer.
	return banner ? (
		<NotificationBanner
			content={banner.content}
			key={banner.key}
			onDismiss={dismissBanner}
		/>
	) : null;
}
