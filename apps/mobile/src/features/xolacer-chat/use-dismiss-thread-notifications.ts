import * as Notifications from "expo-notifications";
import { useIsFocused } from "expo-router/react-navigation";
import { useEffect } from "react";
import { AppState } from "react-native";
import {
	clearActiveNotificationConversation,
	conversationNotificationIds,
	setActiveNotificationConversation,
} from "@/lib/notification-suppression";

/** Clears the tray of this conversation's notifications once its thread is open; other threads'
 * entries stay. Best-effort. */
export function useDismissThreadNotifications(conversationId: string) {
	const isFocused = useIsFocused();

	useEffect(() => {
		if (!isFocused) {
			return;
		}

		setActiveNotificationConversation(conversationId);

		const dismissPresented = () => {
			Notifications.getPresentedNotificationsAsync()
				.then((presented) =>
					Promise.all(
						conversationNotificationIds(presented, conversationId).map((id) =>
							Notifications.dismissNotificationAsync(id)
						)
					)
				)
				.catch((error) =>
					console.log("[xolacer-chat] failed to clear conversation tray", error)
				);
		};

		dismissPresented();
		const subscription = AppState.addEventListener("change", (status) => {
			if (status === "active") {
				dismissPresented();
			}
		});

		return () => {
			subscription.remove();
			clearActiveNotificationConversation(conversationId);
		};
	}, [conversationId, isFocused]);
}
