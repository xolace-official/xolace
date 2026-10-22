/**
 * Keeping the app from talking over itself.
 *
 * Suppression is client-side and lives here rather than in the sender, because
 * the notification handler only runs while the app is foregrounded. It stays
 * quiet only when the matching thread is focused; conversation events from any
 * other thread still need to reach the user. Stream sends push irrespective of
 * online status, so server-side eligibility cannot make that distinction.
 */
import { isChatNotificationType } from '@/convex/lib/chatNotifications';

/** A push payload as it actually arrives: an open bag, nothing guaranteed. */
type NotificationData = Record<string, unknown> | undefined | null;

/**
 * Shape of a delivered notification, narrowed to what the tray sweep reads —
 * which is also what keeps this module free of `expo-notifications`, and so
 * runnable under Vitest.
 */
type PresentedNotification = {
  request: { identifier: string; content: { data?: NotificationData } };
};

let activeConversationId: string | null = null;

export function setActiveNotificationConversation(conversationId: string) {
  activeConversationId = conversationId;
}

export function clearActiveNotificationConversation(conversationId: string) {
  if (activeConversationId === conversationId) activeConversationId = null;
}

/**
 * The open thread already shows its own events. A different thread does not,
 * so its foreground arrival must still use the OS notification surfaces.
 */
export function suppressedInForeground(data: NotificationData): boolean {
  return (
    isChatNotificationType(data?.type) &&
    typeof data?.conversationId === 'string' &&
    data.conversationId === activeConversationId
  );
}

/**
 * Which already-delivered notifications belong to one conversation. Matched on
 * both type and id so a nudge that happens to carry a conversation id is never
 * swept out of the tray with them.
 */
export function conversationNotificationIds(
  presented: PresentedNotification[],
  conversationId: string,
): string[] {
  return presented
    .filter((n) => {
      const data = n.request.content.data;
      return (
        isChatNotificationType(data?.type) && data?.conversationId === conversationId
      );
    })
    .map((n) => n.request.identifier);
}
