import { useEffect } from 'react';
import {
  chatLocalDataGeneration,
  chatLocalDataSettled,
  hydrateChannelsFromCache,
} from '@/src/features/xolacer-chat/offline-db';
import { useStreamConnection } from './providers/stream-chat-provider';
import type { ConversationList } from './components/chats-list';

/**
 * `queryChannels` caps at 30 per call. The rows are warmed most-recent-first so
 * the ones over the cap are the least likely to be opened.
 *
 * Known ceiling, not a defect: a conversation past this cap is never watched,
 * so `countUnread()` on it stays 0 and no events arrive for it — its row shows
 * no unread badge, ever. Accepted for the same reason the cap exists.
 *
 * ponytail: paginate only if someone actually accumulates 30+ live threads.
 */
const MAX_PREFETCH = 30;

/**
 * Removes the two round trips a thread open used to pay for.
 *
 * The connection is the first: opening it here means the WS handshake overlaps
 * with the user reading their conversation list, instead of running after they
 * tap a row.
 *
 * The channel state is the second. The offline database is read first — the
 * last known state of every listed conversation lands in
 * `client.activeChannels` in one local read, so a row tapped before the socket
 * is up (or with no network at all) opens onto messages. `queryChannels` then
 * replaces it with live state once the connection is there; both hand the same
 * cached instance back to the `client.channel(...)` call in `ThreadMessages`,
 * so `useLocalChannelState` short-circuits and messages paint on the first
 * frame with no `watch()` of its own.
 *
 * It also populates every watched channel's unread count, and *that* needs
 * announcing. Stream dispatches `channels.queried` from inside `queryChannels`
 * — but before `hydrateActiveChannels` runs, so a listener that re-reads
 * `countUnread()` on it still sees zero. Rows have already subscribed by then
 * and nothing tells them to look again, which is why every unread badge was
 * blank until some unrelated re-render happened along. Re-announcing the same
 * event once the counts are actually there lands the badges on the first
 * paint. Deliberately sent through the client's own bus rather than a React
 * state bump: the rows read Stream's state through `useSyncExternalStore`, and
 * the React Compiler caches the list subtree on props that a hydration flag
 * would not be part of — the re-render would never reach them.
 */
export function useChatWarmup(
  conversations: ConversationList | undefined,
  enabled: boolean,
) {
  const { client } = useStreamConnection(enabled);

  const channelIds = (conversations ?? [])
    .filter((conversation) => conversation.streamChannelId)
    .sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0))
    .slice(0, MAX_PREFETCH)
    .map((conversation) => conversation.streamChannelId as string)
    .join(',');

  useEffect(() => {
    if (!enabled || !client || !channelIds) return;
    const ids = channelIds.split(',');
    // Not cancellable, and deliberately not awaited: the only effect that
    // matters is the client-side cache it fills, which a later mount still
    // benefits from. Nothing here renders the result. `queryChannels` waits
    // on the socket internally and rejects if it never opens — offline, the
    // cache read above is all that happens, and that is the point.
    let inFlight = false;
    const warm = () => {
      if (inFlight) return;
      inFlight = true;
      // `queryChannels` writes straight into the offline database, so it
      // waits for any reset to finish and is skipped if one starts meanwhile
      // — the rows would belong to the signed-out account. See
      // `chatLocalDataSettled`.
      chatLocalDataSettled()
        .then(async (generation) => {
          await hydrateChannelsFromCache(client, ids).catch((error) =>
            console.error('[xolacer-chat] channel cache read failed', error),
          );
          if (generation !== chatLocalDataGeneration()) return;
          await client.queryChannels(
            { id: { $in: ids }, members: { $in: [client.userID as string] } },
            { last_message_at: -1 },
            { watch: true, presence: true, limit: MAX_PREFETCH },
          );
          if (generation !== chatLocalDataGeneration()) return;
          client.dispatchEvent({ type: 'channels.queried' });
        })
        .catch((error) => console.warn('[xolacer-chat] channel prefetch failed', error))
        .finally(() => {
          inFlight = false;
        });
    };
    warm();
    // Again every time the socket comes back. The SDK closes it in the
    // background and reopens it on foreground as a *fresh* connect — not the
    // JS client's `_reconnect`, so `connection.recovered` never fires and the
    // client's own re-query is off anyway (`recoverStateOnReconnect = false`;
    // the SDK does it inside `ChannelList`, which this app does not use).
    // Without this, everything received while backgrounded stays out of the
    // warmed channels: rows read a stale `countUnread()` and a thread mounts
    // over the old messages, since `initialized` is still true and nothing
    // re-watches. The in-flight guard covers the first connect, where the
    // mount-time call above is still waiting on the same socket.
    const { unsubscribe } = client.on('connection.changed', (event) => {
      if (event.online) warm();
    });
    return unsubscribe;
  }, [enabled, client, channelIds]);
}
