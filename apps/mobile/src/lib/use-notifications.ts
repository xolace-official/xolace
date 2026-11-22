import { useAuth } from "@clerk/expo";
import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import * as Notifications from "expo-notifications";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { goHome } from "@/lib/landing";
import { markNotificationTap } from "@/lib/last-notification-tap";
import { suppressedInForeground } from "@/lib/notification-suppression";
import {
	notificationTapPlan,
	subscribeToNotificationTaps,
} from "@/lib/notification-tap";
import { requestPushToken } from "@/lib/push-token";
import { useAppStore } from "@/store/store";

Notifications.setNotificationHandler({
	handleNotification: async (notification) => {
		const show = !suppressedInForeground(notification.request.content.data);
		return {
			shouldPlaySound: show,
			shouldSetBadge: show,
			shouldShowBanner: show,
			shouldShowList: show,
		};
	},
});

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

				try {
					const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
					if (timezone) {
						await updatePreferences({ notificationTimezone: timezone });
					}
				} catch {}
			}
		}

		register();

		return () => {
			cancelled = true;
		};
	}, [isSignedIn, notificationsEnabled, registerToken, updatePreferences]);

	const pathname = usePathname();
	const where = useRef(pathname);
	useEffect(() => {
		where.current = pathname;
	}, [pathname]);

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
				markNotificationTap();
				const { content } = response.notification.request;
				const plan = notificationTapPlan(
					content.data,
					content.body,
					Date.now(),
					where.current
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
				const navigation = plan.navigation;
				if (navigation?.action === "navigate") {
					router.navigate(navigation.href);
				} else if (navigation?.action === "home") {
					goHome();
				} else if (navigation) {
					router.push(navigation.href);
				}
			}
		);
	}, [isSignedIn, markResultedInSession, router, setLastNotification]);

	return { expoPushToken };
}
