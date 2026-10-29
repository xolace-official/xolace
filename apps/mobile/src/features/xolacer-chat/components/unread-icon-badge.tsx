import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { useUnreadBadge } from "@/features/xolacer-chat/use-unread-badge";

/** Mirrors Stream's unread total onto the app icon; mounted above the Stack. Skipped while
 * unknown, so a push-set badge (`chatNotifications.sendMessagePush`) survives a cold start
 * until Stream speaks. */
export function UnreadIconBadge() {
	const count = useUnreadBadge();
	useEffect(() => {
		if (count === null) {
			return;
		}
		Notifications.setBadgeCountAsync(count).catch(warn);
	}, [count]);
	// Unmount means sign-out: clearing after any in-flight write above keeps a
	// late count off the signed-out icon.
	useEffect(
		() => () => void Notifications.setBadgeCountAsync(0).catch(warn),
		[]
	);
	return null;
}

const warn = (error: unknown) =>
	console.warn("[xolacer-chat] icon badge update failed", error);
