import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandJSONStorage } from "@/lib/storage/unified-storage";
import { legacyReminderIds } from "./legacy-reminders";

const useHandoverMemory = create<{ adopted: boolean }>()(
	persist((): { adopted: boolean } => ({ adopted: false }), {
		merge: (stored, current) => ({
			...current,
			adopted:
				typeof stored === "object" &&
				stored !== null &&
				(stored as { adopted?: unknown }).adopted === true,
		}),
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
	const adopt = useMutation(api.dailyQuotes.pushSettings.adoptLegacyReminders);
	useEffect(() => {
		let cancelled = false;
		cancelLegacyReminders()
			.then(() => {
				if (cancelled || useHandoverMemory.getState().adopted) {
					return;
				}
				return adopt({}).then(() => {
					useHandoverMemory.setState({ adopted: true });
				});
			})
			.catch((e: unknown) =>
				console.error("[quotes] reminder handover failed", e)
			);
		return () => {
			cancelled = true;
		};
	}, [adopt]);
}
