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

/** Re-reads the OS permission on every foreground, so returning from Settings settles the
 * switches: it can be revoked there without any preference knowing. */
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

/** Settings › Notifications on Convex, the push token and the OS permission (production's
 * `useNotificationSettings`, same calls in the same order). */
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

	// A blocked OS makes every switch read off, so flipping one runs the enable path.
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
		} catch {
			// Non-blocking
		}
	};

	/** Turning a kind on from a non-delivering state consults the OS first. False: write nothing
	 * (the phone blocks it, which opens the alert, or no token came). `autoEnable: false` registers
	 * the device for the daily quote alone, without the server's first-grant switch-everything-on. */
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

	/** Nothing wants delivery any more: drop this installation's token (another device's stays). */
	const dropToken = async () => {
		try {
			const token = await getGrantedPushToken();
			if (token) {
				await removeToken({ pushToken: token });
			}
		} catch {
			// Best-effort
		}
	};

	/** Moves gentle reminders and chat at once; the daily quote keeps its stored choice. */
	const applyToggles = async (next: { gentle: boolean; chat: boolean }) => {
		const turningOn =
			(next.gentle && !gentleReminders) || (next.chat && !chatNotifications);
		if (turningOn && !(await readyToDeliver())) {
			return;
		}
		// Lands after registerToken, whose first-grant auto-enable would otherwise
		// switch on a family the user didn't ask for.
		updatePreferences({
			notifications: nextNotificationPrefs(next),
		}).catch(saveFailed);
		// The daily quote still needs this device's token.
		if (!(next.gentle || next.chat || dailyQuoteChoice(notifications))) {
			await dropToken();
		}
	};

	/** The daily quote: its own switch, so it touches no other kind or the master. */
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
	// Until preferences load, a switch would write its default over the saved choice (Gentle
	// reminders carrying `chat: true` over a saved chat-off), so taps wait. Production didn't.
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
				// Each setter carries the other family's stored choice, never its displayed
				// value, which reads off whenever the master or the OS blocks delivery.
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
				// A blocked phone can't deliver it: the same alert as the other switches. It sets only
				// letters' flag (`letters.settings.setPush`); the pushes still need notifications on.
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
