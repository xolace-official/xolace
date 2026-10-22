import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useIsFocused } from 'expo-router/react-navigation';
import {
  clearActiveNotificationConversation,
  conversationNotificationIds,
  setActiveNotificationConversation,
} from '@/src/lib/notification-suppression';

/**
 * Clears the tray of anything still sitting there for a conversation the user
 * has just opened — the thread itself has now said everything the banner was
 * for. Only that conversation's entries go: someone else waiting on you in
 * another thread is not answered by this one being read.
 *
 * Best-effort. A failure leaves a stale banner, which is not worth an error
 * surface of its own.
 */
export function useDismissThreadNotifications(conversationId: string) {
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) return;

    setActiveNotificationConversation(conversationId);

    const dismissPresented = () => {
      Notifications.getPresentedNotificationsAsync()
        .then((presented) =>
          Promise.all(
            conversationNotificationIds(presented, conversationId).map((id) =>
              Notifications.dismissNotificationAsync(id),
            ),
          ),
        )
        .catch((error) =>
          console.log('[xolacer-chat] failed to clear conversation tray', error),
        );
    };

    dismissPresented();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') dismissPresented();
    });

    return () => {
      subscription.remove();
      clearActiveNotificationConversation(conversationId);
    };
  }, [conversationId, isFocused]);
}
