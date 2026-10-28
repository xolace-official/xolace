/** Client-side suppression for the focused thread only; Stream sends push regardless of online
 * status, so the server can't. */
import { isChatNotificationType } from "@xolace/backend/convex/lib/chatNotifications";

/** A push payload as it actually arrives: an open bag, nothing guaranteed. */
type NotificationData = Record<string, unknown> | undefined | null;

/** A delivered notification, narrowed to what the tray sweep reads; keeps this module free of
 * `expo-notifications`. */
type PresentedNotification = {
	request: { identifier: string; content: { data?: NotificationData } };
};

let activeConversationId: string | null = null;

export function setActiveNotificationConversation(conversationId: string) {
	activeConversationId = conversationId;
}

export function clearActiveNotificationConversation(conversationId: string) {
	if (activeConversationId === conversationId) {
		activeConversationId = null;
	}
}

/** The open thread shows its own events; a different thread's foreground arrival still uses the
 * OS surfaces. */
export function suppressedInForeground(data: NotificationData): boolean {
	return (
		isChatNotificationType(data?.type) &&
		typeof data?.conversationId === "string" &&
		data.conversationId === activeConversationId
	);
}

/** Delivered notification ids for one conversation. Matched on type and id, so a nudge carrying
 * a conversation id survives. */
export function conversationNotificationIds(
	presented: PresentedNotification[],
	conversationId: string
): string[] {
	return presented
		.filter((n) => {
			const data = n.request.content.data;
			return (
				isChatNotificationType(data?.type) &&
				data?.conversationId === conversationId
			);
		})
		.map((n) => n.request.identifier);
}
