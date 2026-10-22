import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useState } from "react";

const TIME_MAP: Record<string, { hour: number; minute: number }> = {
	afternoon: { hour: 13, minute: 0 },
	evening: { hour: 19, minute: 0 },
	morning: { hour: 8, minute: 0 },
};

// weekday: 1=Sunday … 7=Saturday (Expo / iOS convention)
const WEEKLY_MESSAGES: { title: string; body: string }[] = [
	{
		body: "A reflection picked for today. Open when you're ready.",
		title: "Your quote is ready.",
	},
	{
		body: "Today's quote might be exactly what you need.",
		title: "Something's waiting.",
	},
	{
		body: "Your daily reflection is here. Take it slow.",
		title: "A moment for yourself.",
	},
	{
		body: "Open Xolace when you have a quiet moment.",
		title: "Today's reflection.",
	},
	{
		body: "A quote picked just for you is waiting.",
		title: "Something to sit with.",
	},
	{
		body: "Your quote is here whenever you need it.",
		title: "Words for today.",
	},
	{
		body: "Today's reflection. Open it when the time feels right.",
		title: "A thought is waiting.",
	},
];

export type NotifSetupState =
	| "idle"
	| "requesting"
	| "granted"
	| "denied"
	| "scheduled";

/**
 * Handles requesting permission and scheduling the daily quote notification.
 * Returns a setup function to call after preference setup completes.
 */
export function useQuoteNotifications() {
	const [state, setState] = useState<NotifSetupState>("idle");
	const updateQuotePrefs = useMutation(api.preferences.updateQuotePreferences);

	const scheduleNotification = async (
		themes: string[],
		notificationEnabled: boolean,
		notificationTime?: string
	) => {
		// Always save preferences first
		await updateQuotePrefs({ notificationEnabled, notificationTime, themes });

		if (
			!(notificationEnabled && notificationTime) ||
			notificationTime === "none"
		) {
			setState("scheduled");
			return { granted: false };
		}

		if (!Device.isDevice) {
			// Simulator — skip permission, just save
			setState("scheduled");
			return { granted: false };
		}

		setState("requesting");

		const { status: existingStatus } =
			await Notifications.getPermissionsAsync();

		let finalStatus = existingStatus;
		if (existingStatus !== "granted") {
			const { status } = await Notifications.requestPermissionsAsync();
			finalStatus = status;
		}

		if (finalStatus !== "granted") {
			setState("denied");
			// Preferences already saved with notificationEnabled=false effective
			await updateQuotePrefs({
				notificationEnabled: false,
				notificationTime,
				themes,
			});
			return { denied: true, granted: false };
		}

		setState("granted");

		// Cancel any previously scheduled daily quote notifications
		const scheduled = await Notifications.getAllScheduledNotificationsAsync();
		const existing = scheduled.filter((n) =>
			n.identifier.startsWith("daily-quote-")
		);
		for (const n of existing) {
			await Notifications.cancelScheduledNotificationAsync(n.identifier);
		}

		const timeConfig = TIME_MAP[notificationTime] ?? { hour: 8, minute: 0 };

		// Schedule one notification per weekday (1=Sun…7=Sat), each with distinct copy.
		await Promise.all(
			WEEKLY_MESSAGES.map((msg, i) =>
				Notifications.scheduleNotificationAsync({
					content: {
						body: msg.body,
						data: { screen: "quotes" },
						title: msg.title,
					},
					identifier: `daily-quote-${notificationTime}-${i + 1}`,
					trigger: {
						hour: timeConfig.hour,
						minute: timeConfig.minute,
						type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
						weekday: i + 1,
					},
				})
			)
		);

		setState("scheduled");
		return { granted: true };
	};

	return { scheduleNotification, state };
}
