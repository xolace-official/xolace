import { api } from "@xolace/backend/api";
import { chatNotificationsAllowed } from "@xolace/backend/convex/lib/chatNotifications";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, Linking } from "react-native";
import { NOTIFY_COPY } from "@/features/settings/notifications/copy";
import type {
	Notifications,
	ReachMeOn,
} from "@/features/settings/notifications/notifications-data";
import {
	chatChoice,
	dailyQuoteChoice,
	dailyQuoteOf,
	gentleChoice,
	gentleRemindersOn,
	nextNotificationPrefs,
	QUIET_DEFAULT,
	quietWith,
	toQuiet,
} from "@/features/settings/notifications/notifications-model";
import type { ComposedSwitch } from "@/features/settings/settings-switch-row";
import { saveFailed } from "@/features/settings/use-save-failed";
import { deviceTimezone, preparePushDelivery } from "@/lib/push-delivery";
import { getGrantedPushToken, getPushPermissionState } from "@/lib/push-token";
import { usePreferenceMutation } from "@/lib/use-preference-mutation";

function useOsBlocked() {
	const [osBlocked, setOsBlocked] = useState(false);
	useEffect(() => {
		let cancelled = false;
		const check = async () => {
			const state = await getPushPermissionState();
			if (!cancelled) {
				setOsBlocked(state === "blocked");
			}
		};
		check().catch(() => undefined);
		const subscription = AppState.addEventListener("change", (status) => {
			if (status === "active") {
				check().catch(() => undefined);
			}
		});
		return () => {
			cancelled = true;
			subscription.remove();
		};
	}, []);
	return [osBlocked, setOsBlocked] as const;
}

export function useNotifications(
	reachMeOn: ReachMeOn | null,
	letters: ComposedSwitch
): Notifications {
	const preferences = useQuery(api.preferences.get);
	const updatePreferences = usePreferenceMutation();
	const registerToken = useMutation(api.notifications.registerToken);
	const removeToken = useMutation(api.notifications.removeToken);
	const [alertOpen, setAlertOpen] = useState(false);
	const [osBlocked, setOsBlocked] = useOsBlocked();

	const notifications = preferences?.notifications;

	const gentleReminders = !osBlocked && gentleRemindersOn(notifications);
	const chatNotifications =
		!osBlocked && chatNotificationsAllowed(notifications);
	const dailyQuote = dailyQuoteOf(notifications);
	const dailyQuoteOn = !osBlocked && dailyQuote.on;
	const delivering = gentleReminders || chatNotifications || dailyQuoteOn;

	const syncTimezone = async () => {
		const timezone = deviceTimezone();
		if (!timezone) {
			return;
		}
		try {
			await updatePreferences({ notificationTimezone: timezone });
		} catch {}
	};

	const readyToDeliver = async (autoEnable = true) => {
		const readiness = await preparePushDelivery(delivering, (pushToken) =>
			registerToken(autoEnable ? { pushToken } : { autoEnable, pushToken })
		);
		if (readiness === "blocked") {
			setOsBlocked(true);
			setAlertOpen(true);
			return false;
		}
		setOsBlocked(false);
		if (readiness === "registered") {
			await syncTimezone();
		}
		return readiness !== "unavailable";
	};

	const dropToken = async () => {
		try {
			const token = await getGrantedPushToken();
			if (token) {
				await removeToken({ pushToken: token });
			}
		} catch {}
	};

	const applyToggles = async (next: { gentle: boolean; chat: boolean }) => {
		const turningOn =
			(next.gentle && !gentleReminders) || (next.chat && !chatNotifications);
		if (turningOn && !(await readyToDeliver())) {
			return;
		}
		updatePreferences({
			notifications: nextNotificationPrefs(next),
		}).catch(saveFailed);
		if (!(next.gentle || next.chat || dailyQuoteChoice(notifications))) {
			await dropToken();
		}
	};

	const applyDailyQuote = async (on: boolean) => {
		if (on && !dailyQuoteOn && !(await readyToDeliver(false))) {
			return;
		}
		updatePreferences({
			notificationDailyQuote: { enabled: on, slot: dailyQuote.slot },
		}).catch(saveFailed);
		if (!(on || gentleReminders || chatNotifications)) {
			await dropToken();
		}
	};

	const window = notifications?.quietWindow ?? null;
	const loading = preferences === undefined;

	return {
		actions: {
			closeAlert: () => setAlertOpen(false),
			openReachMeOn: () => router.push("/settings/reach"),
			openSettings: () => {
				setAlertOpen(false);
				Linking.openSettings().catch(() => undefined);
			},
			setChat: (on) => {
				if (loading) {
					return;
				}
				applyToggles({ chat: on, gentle: gentleChoice(notifications) }).catch(
					() => undefined
				);
			},
			setDailyQuote: (on) => {
				if (loading) {
					return;
				}
				applyDailyQuote(on).catch(() => undefined);
			},
			setDailyQuoteSlot: (slot) => {
				updatePreferences({
					notificationDailyQuote: {
						enabled: dailyQuoteChoice(notifications),
						slot,
					},
				}).catch(saveFailed);
			},
			setLetters: (on) => {
				if (loading || letters === null) {
					return;
				}
				if (on && osBlocked) {
					setAlertOpen(true);
					return;
				}
				letters.set(on);
			},
			setQuiet: (on) => {
				if (loading) {
					return;
				}
				updatePreferences({
					notificationQuietWindow: on ? QUIET_DEFAULT : null,
				}).catch(saveFailed);
			},
			setQuietHour: (end, hour) => {
				updatePreferences({
					notificationQuietWindow: quietWith(window, end, hour),
				}).catch(saveFailed);
			},
			setReach: (reach) => {
				updatePreferences({ notificationReach: reach }).catch(saveFailed);
			},
			setReminders: (on) => {
				if (loading) {
					return;
				}
				applyToggles({ chat: chatChoice(notifications), gentle: on }).catch(
					() => undefined
				);
			},
		},
		state: {
			alertOpen,
			blocked: osBlocked,
			chat: chatNotifications,
			dailyQuote: { ...dailyQuote, on: dailyQuoteOn },
			letters: loading || letters === null ? null : !osBlocked && letters.on,
			loading,
			quiet: toQuiet(window),
			reach: notifications?.reach ?? "warm",
			reachMeOn,
			reminders: gentleReminders,
		},
	};
}
