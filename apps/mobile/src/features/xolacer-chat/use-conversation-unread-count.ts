import { useCallback, useSyncExternalStore } from 'react';
import { useStreamStatus } from '@/src/features/xolacer-chat/providers/stream-chat-provider';

/**
 * Live unread count for a `ConversationRow`. Reads `channel.countUnread()`,
 * which is only meaningful once the channel has been watched — the Connect
 * tab's `useChatWarmup` watches the most recent conversations in bulk (up to
 * its prefetch cap, see there) before any row renders, and announces itself
 * when that lands so rows re-read. Passive: doesn't call
 * `useStreamConnection`, so a row never opens the socket itself.
 *
 * `countUnread()` reads mutable state Stream owns, not React state —
 * `useSyncExternalStore` re-derives it on every event instead of mirroring it
 * into `useState` via an effect, so there's no seed/reset call to keep in sync
 * by hand. Stream updates channel state *before* it notifies listeners, so the
 * value read here is never one event stale.
 *
 * Subscribed at the client, not the channel, and to everything rather than to
 * a hand-picked list. Three real paths never reach a channel listener at all:
 * a read on another device (the clearing event carries no channel id, so it is
 * dispatched to client listeners only), a truncated history, and a new message
 * in a channel this client isn't watching (which arrives in notification
 * form). The snapshot is a field read and React bails out when the number is
 * unchanged, so the breadth costs a comparison per event.
 */
export function useConversationUnreadCount(
  streamChannelId: string | undefined,
  channelType = 'messaging',
) {
  const { client, status } = useStreamStatus();
  const connectedClient = status === 'ready' ? client : null;
  const channel =
    connectedClient && streamChannelId
      ? connectedClient.channel(channelType, streamChannelId)
      : null;

  // Kept despite the React Compiler, for correctness rather than perf: a fresh
  // closure here makes React tear down and re-register the listener on every
  // render of the row. Keyed on the client and on whether there is a channel at
  // all, never on its id — the listener is client-wide, so it has nothing
  // channel-specific to re-key on; the channel only enters through the snapshot
  // below, which re-reads on every notification anyway. A row with no channel
  // (a request that can't hold unreads) always reads 0, so it stays unsubscribed
  // rather than waking on every event to re-derive that.
  const hasChannel = channel !== null;
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!connectedClient || !hasChannel) return () => {};
      const { unsubscribe } = connectedClient.on(onStoreChange);
      return unsubscribe;
    },
    [connectedClient, hasChannel],
  );

  return useSyncExternalStore(subscribe, () => channel?.countUnread() ?? 0);
}
