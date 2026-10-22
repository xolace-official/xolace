import { useCallback, useSyncExternalStore } from 'react';
import type { StreamChat } from 'stream-chat';
import { useStreamStatus } from '@/src/features/xolacer-chat/providers/stream-chat-provider';
import { badgeFromEvents } from '@/src/features/xolacer-chat/unread-badge';

/**
 * Held beside the client rather than read off `client.user`: the SDK only
 * writes `total_unread_count` there on the handshake, not on later events.
 * One entry per client instance, so every hook instance folds the same stream
 * once and reads one number. `null` until Stream has said one. The client is
 * an app-lifetime singleton, so the entry also remembers which user it was
 * folded for — a sign-out/sign-in reconnects the same instance as someone
 * else, whose count must not start from the previous user's total.
 */
const totals = new WeakMap<StreamChat, { userId: string | undefined; total: number | null }>();

function seed(client: StreamChat): number | null {
  const me = client.user;
  return me && 'total_unread_count' in me ? (me.total_unread_count ?? null) : null;
}

function totalFor(client: StreamChat): number | null {
  const entry = totals.get(client);
  if (entry && entry.userId === client.userID) return entry.total;
  const total = seed(client);
  totals.set(client, { userId: client.userID, total });
  return total;
}

/**
 * The one unread number, across every conversation. Feeds the Connect tab
 * badge and the app-icon badge so the two can never disagree. Passive: reads
 * whatever client the provider already holds and never opens the socket —
 * a user who has never used chat has nothing to count.
 *
 * `null` until Stream has said a number — no client, or a socket that hasn't
 * handshaken yet. Callers must treat that as "unknown", not zero: the icon
 * badge a push just set is right until Stream says otherwise.
 */
export function useUnreadBadge(): number | null {
  const { client, status } = useStreamStatus();
  const connected = status === 'ready' ? client : null;

  // Stable per client for the same reason as `useConversationUnreadCount`.
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!connected) return () => {};
      totalFor(connected);
      // Every subscriber writes the shared total and always notifies. Skipping
      // "unchanged" here is wrong: the first listener to run has already
      // updated the map, so every later one would see no change and never
      // re-render — the tab badge froze while the icon badge moved. React
      // bails out itself when the snapshot is equal.
      const { unsubscribe } = connected.on((event) => {
        totals.set(connected, {
          userId: connected.userID,
          total: badgeFromEvents(totalFor(connected) ?? 0, event),
        });
        onStoreChange();
      });
      return unsubscribe;
    },
    [connected],
  );

  return useSyncExternalStore(subscribe, () => (connected ? totalFor(connected) : null));
}
