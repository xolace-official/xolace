import { isChatNotificationType } from "@xolace/backend/convex/lib/chatNotifications";

type NotificationData = Record<string, unknown> | undefined | null;

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

export function suppressedInForeground(data: NotificationData): boolean {
	return (
		isChatNotificationType(data?.type) &&
		typeof data?.conversationId === "string" &&
		data.conversationId === activeConversationId
	);
}

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
