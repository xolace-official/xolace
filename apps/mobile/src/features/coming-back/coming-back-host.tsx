import { NotificationBanner } from "./banner/notification-banner";
import { useComingBackHost } from "./use-coming-back";

export function ComingBackHost() {
	const { banner, dismissBanner } = useComingBackHost();
	return banner ? (
		<NotificationBanner content={banner} onDismiss={dismissBanner} />
	) : null;
}
