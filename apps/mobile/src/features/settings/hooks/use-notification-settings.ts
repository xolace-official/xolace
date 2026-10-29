import { api } from "@xolace/backend/convex/_generated/api";
import { chatNotificationsAllowed } from "@xolace/backend/convex/lib/chatNotifications";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import {
	chatChoice,
	gentleChoice,
	gentleRemindersOn,
	nextNotificationPrefs,
} from "@/features/settings/notification-prefs";
import {
	getGrantedPushToken,
	getPushPermissionState,
	requestPushToken,
} from "@/lib/push-token";
import { usePreferenceMutation } from "@/lib/use-preference-mutation";

export type NotificationReach = "warm" | "direct" | "quiet";
export type QuietWindow = { dontReachBefore: number; dontReachAfter: number };

export const useNotificationSettings = () => {
	const preferences = useQuery(api.preferences.get);
	const updatePreferences = usePreferenceMutation();
	const registerToken = useMutation(api.notifications.registerToken);
	const removeToken = useMutation(api.notifications.removeToken);
	const [permissionBlocked, setPermissionBlocked] = useState(false);
	const [osBlocked, setOsBlocked] = useState(false);

	// Permission can be revoked in device settings without any preference knowing.
	// Re-checked on every foreground so returning from Settings settles the toggles.
	useEffect(() => {
		let cancelled = false;

		const check = async () => {
			const state = await getPushPermissionState();
			if (!cancelled) {
				setOsBlocked(state === "blocked");
			}
		};

		check();
		const subscription = AppState.addEventListener("change", (status) => {
			if (status === "active") {
				check();
			}
		});

		return () => {
			cancelled = true;
			subscription.remove();
		};
	}, []);

	const notifications = preferences?.notifications;

	// A blocked OS makes both toggles read off, so flipping one runs the enable path.
	const gentleReminders = !osBlocked && gentleRemindersOn(notifications);
	const chatNotifications =
		!osBlocked && chatNotificationsAllowed(notifications);

	const reach = (notifications?.reach ?? "warm") as NotificationReach;
	const quietWindow = notifications?.quietWindow ?? null;

	const setReach = (next: NotificationReach) => {
		updatePreferences({ notificationReach: next });
	};

	const setQuietWindow = (window: QuietWindow | null) => {
		updatePreferences({ notificationQuietWindow: window });
	};

	const syncTimezone = async () => {
		try {
			const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			if (timezone) {
				await updatePreferences({ notificationTimezone: timezone });
			}
		} catch {
			// Non-blocking
		}
	};

	/** Moves both toggles at once. Only turning on from a non-delivering state
	 * consults the OS; nothing is written when the permission route runs out. */
	const applyToggles = async (next: { gentle: boolean; chat: boolean }) => {
		const turningOn =
			(next.gentle && !gentleReminders) || (next.chat && !chatNotifications);
		const alreadyDelivering = gentleReminders || chatNotifications;

		if (turningOn) {
			const permission = await getPushPermissionState();
			if (permission === "blocked") {
				setOsBlocked(true);
				setPermissionBlocked(true);
				return;
			}
			setOsBlocked(false);

			// The token is dropped when both families go quiet, so re-register here.
			if (permission === "undetermined" || !alreadyDelivering) {
				const token = await requestPushToken();
				if (!token) {
					return;
				}
				try {
					await registerToken({ pushToken: token });
				} catch {
					// Nothing is written, so the toggle stays where it was.
					return;
				}
				await syncTimezone();
			}
		}

		// Lands after registerToken, whose first-grant auto-enable would otherwise
		// switch on a family the user didn't ask for.
		updatePreferences({ notifications: nextNotificationPrefs(next) });

		if (!(next.gentle || next.chat)) {
			try {
				// Scoped to this installation; another device's token must stay.
				const token = await getGrantedPushToken();
				if (token) {
					await removeToken({ pushToken: token });
				}
			} catch {
				// Best-effort
			}
		}
	};

	// Each setter carries the other family's stored choice, never its displayed
	// value, which reads off whenever the master or the OS blocks delivery.
	const setGentleReminders = (enabled: boolean) =>
		applyToggles({ chat: chatChoice(notifications), gentle: enabled });

	const setChatNotifications = (enabled: boolean) =>
		applyToggles({ chat: enabled, gentle: gentleChoice(notifications) });

	const reachDisplay =
		reach === "warm" ? "Warm" : reach === "direct" ? "Direct" : "Quiet";

	const quietWindowDisplay = quietWindow
		? `${quietWindow.dontReachBefore}–${quietWindow.dontReachAfter}h`
		: "Off";

	return {
		chatNotifications,
		dismissPermissionBlocked: () => setPermissionBlocked(false),
		gentleReminders,
		permissionBlocked,
		quietWindow,
		quietWindowDisplay,
		reach,
		reachDisplay,
		setChatNotifications,
		setGentleReminders,
		setQuietWindow,
		setReach,
	};
};
