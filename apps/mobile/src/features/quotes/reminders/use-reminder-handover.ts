import { useAuth } from "@clerk/expo";
import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { deviceTimezone } from "@/lib/push-delivery";
import { getGrantedPushToken, getPushPermissionState } from "@/lib/push-token";
import { zustandJSONStorage } from "@/lib/storage/unified-storage";
import { type HandoverMemory, handOver, readHandoverMemory } from "./handover";
import { legacyReminderIds } from "./legacy-reminders";

const useHandoverMemory = create<HandoverMemory>()(
	persist((): HandoverMemory => ({ handedOver: [] }), {
		merge: (stored, current) => ({ ...current, ...readHandoverMemory(stored) }),
		name: "xolace-daily-quote-handover",
		storage: createJSONStorage(() => zustandJSONStorage),
		version: 1,
	})
);

async function cancelLegacyReminders(): Promise<void> {
	const scheduled = await Notifications.getAllScheduledNotificationsAsync();
	for (const id of legacyReminderIds(scheduled)) {
		await Notifications.cancelScheduledNotificationAsync(id);
	}
}

export function useReminderHandover(): void {
	const { userId } = useAuth();
	const adopt = useMutation(api.dailyQuotes.pushSettings.adoptLegacyReminders);
	const registerToken = useMutation(api.notifications.registerToken);
	// Not `usePreferenceMutation`: no screen shows the zone, so there's nothing
	// to update optimistically, and the launch hook's zone sync does the same.
	// It also keeps this effect's dependencies plain mutation refs.
	const updatePreferences = useMutation(api.preferences.update);

	useEffect(() => {
		let cancelled = false;
		const run = async () => {
			await cancelLegacyReminders();
			if (cancelled || !userId) {
				return;
			}
			await handOver(userId, {
				adopt: () => adopt({}),
				handedOver: (id) =>
					useHandoverMemory.getState().handedOver.includes(id),
				markHandedOver: (id) =>
					useHandoverMemory.setState((memory) => ({
						handedOver: [...memory.handedOver, id],
					})),
				permitted: async () => (await getPushPermissionState()) === "granted",
				pushToken: getGrantedPushToken,
				register: (pushToken) =>
					registerToken({ autoEnable: false, pushToken }),
				saveTimezone: (timezone) =>
					updatePreferences({ notificationTimezone: timezone }),
				timezone: deviceTimezone,
			});
		};
		run().catch((e: unknown) =>
			console.error("[quotes] reminder handover failed", e)
		);
		return () => {
			cancelled = true;
		};
	}, [adopt, registerToken, updatePreferences, userId]);
}
