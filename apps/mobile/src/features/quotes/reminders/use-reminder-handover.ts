import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandJSONStorage } from "@/lib/storage/unified-storage";
import { legacyReminderIds } from "./legacy-reminders";

/** This device has carried its old reminder setting over to the server. Device-only. */
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

/**
 * Once a launch: cancel the old on-device daily quote reminders, then (until it has worked once
 * on this device) ask the server to carry their setting over to the daily quote push. In that
 * order, so nobody gets the quote twice. Both are idempotent and cheap; a failure retries at the
 * next launch.
 */
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
