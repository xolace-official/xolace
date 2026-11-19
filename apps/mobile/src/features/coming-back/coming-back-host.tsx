import { NotificationBanner } from "./banner/notification-banner";
import { useComingBackHost } from "./use-coming-back";

/**
 * Today's side of coming back (composed by Today's route): the server check-ins on open, the
 * greeting once per return, and the "You were reached" banner while Today is in front.
 */
export function ComingBackHost() {
	const { banner, dismissBanner } = useComingBackHost();
	return banner ? (
		<NotificationBanner content={banner} onDismiss={dismissBanner} />
	) : null;
}
