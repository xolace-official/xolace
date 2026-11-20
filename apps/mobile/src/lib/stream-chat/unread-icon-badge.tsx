import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { useUnreadBadge } from "@/lib/stream-chat/use-unread-badge";

export function UnreadIconBadge() {
	const count = useUnreadBadge();
	useEffect(() => {
		if (count === null) {
			return;
		}
		Notifications.setBadgeCountAsync(count).catch(warn);
	}, [count]);
	useEffect(
		() => () => void Notifications.setBadgeCountAsync(0).catch(warn),
		[]
	);
	return null;
}

const warn = (error: unknown) =>
	console.warn("[xolacer-chat] icon badge update failed", error);
