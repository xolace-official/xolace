import { useAuth } from "@clerk/expo";
import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { suppressedInForeground } from "@/lib/notification-suppression";
import {
	notificationTapPlan,
	subscribeToNotificationTaps,
} from "@/lib/notification-tap";
import { requestPushToken } from "@/lib/push-token";
import { useAppStore } from "@/store/store";

// Foreground-only handler. The focused thread handles its own events, but chat
// arrivals for other threads still need the OS banner, list entry and sound.
Notifications.setNotificationHandler({
	handleNotification: async (notification) => {
		const show = !suppressedInForeground(notification.request.content.data);
		return {
			shouldPlaySound: show,
			// Only a chat push carries `badge` (Stream's unread total); the rest
			// leave the icon alone whatever this says.
			shouldSetBadge: show,
			shouldShowBanner: show,
			shouldShowList: show,
		};
	},
});

/** Push permissions, token registration and tap handling. Must render inside an authenticated
 * Convex context. */
export function useNotifications() {
	const { isSignedIn } = useAuth();
	const registerToken = useMutation(api.notifications.registerToken);
	const markResultedInSession = useMutation(
		api.notifications.markResultedInSession
	);
	const updatePreferences = useMutation(api.preferences.update);
	const router = useRouter();
	const setLastNotification = useAppStore((s) => s.setLastNotification);
	const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
	const preferences = useQuery(api.preferences.get);
	const notificationsEnabled = preferences?.notifications.enabled;

	useEffect(() => {
		if (!isSignedIn) {
			return;
		}

		let cancelled = false;

		async function register() {
			// Token refresh for someone already opted in, never an opt-in. Without the switch
			// check the OS grant re-registers on relaunch and `registerToken` flips every
			// preference back on.
			if (notificationsEnabled !== true) {
				return;
			}

			const { status } = await Notifications.getPermissionsAsync();
			if (status !== "granted") {
				return;
			}

			const token = await requestPushToken();
			if (token && !cancelled) {
				setExpoPushToken(token);
				await registerToken({ pushToken: token });

				// Sync the device's IANA timezone so the server can compute Quiet Window gates.
				try {
					const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
					if (timezone) {
						await updatePreferences({ notificationTimezone: timezone });
					}
				} catch {
					// Non-blocking; timezone is best-effort
				}
			}
		}

		register();

		return () => {
			cancelled = true;
		};
	}, [isSignedIn, notificationsEnabled, registerToken, updatePreferences]);

	// Own effect: not torn down per preference resolve, not gated on `notificationsEnabled` (a
	// tap means the notification was delivered). `subscribeToNotificationTaps` covers cold
	// starts.
	useEffect(() => {
		if (!isSignedIn) {
			return;
		}

		// Web's emitter stub throws UnavailabilityError synchronously for these two, which
		// would take the whole protected layout down; it tolerates only the listener.
		const native = Platform.OS !== "web";

		return subscribeToNotificationTaps(
			{
				clear: native ? Notifications.clearLastNotificationResponse : () => {},
				getLast: native
					? Notifications.getLastNotificationResponse
					: () => null,
				subscribe: Notifications.addNotificationResponseReceivedListener,
			},
			(response) => {
				const { content } = response.notification.request;
				const plan = notificationTapPlan(
					content.data,
					content.body,
					Date.now()
				);

				if (plan.logId) {
					markResultedInSession({
						logId: plan.logId as Id<"notification_log">,
					});
				}
				if (plan.banner) {
					setLastNotification({
						content: plan.banner.content,
						notificationId: plan.banner
							.notificationId as Id<"notification_log">,
					});
				}
				if (plan.navigation?.action === "navigate") {
					router.navigate(plan.navigation.href);
				} else if (plan.navigation) {
					router.push(plan.navigation.href);
				}
			}
		);
	}, [isSignedIn, markResultedInSession, router, setLastNotification]);

	return { expoPushToken };
}
