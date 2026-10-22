import { useEffect, useState } from 'react';
import type { StreamChat } from 'stream-chat';
import { useStreamStatus } from '../providers/stream-chat-provider';

export type CounterpartPresence =
  | { online: true }
  | { online: false; lastActive: number | null };

type CounterpartActivity = {
  typing: boolean;
  presence: CounterpartPresence | null;
};

const IDLE: CounterpartActivity = { typing: false, presence: null };

/**
 * The Stream side of presence, read straight off the channel's cached state
 * rather than through `<Channel>` context — the thread header renders in
 * React Navigation's header slot, a sibling of `<Channel>` in the tree, not a
 * descendant, so `useChannelStateContext`/`useTypingContext` aren't reachable
 * there. `client.channel(type, id)` returns the same cached instance
 * `<Channel>` watches, and `useChatWarmup` already opens it with
 * `presence: true` before a thread is ever tapped open, so member data is
 * normally populated on first render.
 *
 * Convex's `presentProfileIds` (convex/presence.ts) is "the accessor" for
 * every other surface; this is its Stream-routed counterpart for the one
 * surface where the chat socket already knows the answer first-hand.
 *
 * Typing takes the same treatment so the header can prefer it over the
 * online dot — the stronger signal wins.
 *
 * The client comes from `useStreamStatus`, which hands it out only once it
 * has a user: the header is mounted from the thread's first frame, before
 * that on a cold-start deep link, and `client.channel()` throws on a client
 * with no user set.
 */
export function useCounterpartActivity(
  streamChannelId: string | undefined,
  counterpartUserId: string,
): CounterpartActivity {
  const [activity, setActivity] = useState<CounterpartActivity>(IDLE);
  const { client } = useStreamStatus();

  useEffect(() => {
    if (!client || !streamChannelId) return;
    const channel = client.channel('messaging', streamChannelId);

    const read = () =>
      setActivity({
        typing: counterpartUserId in channel.state.typing,
        presence: readPresence(channel, counterpartUserId),
      });
    read();

    const subs = [
      channel.on('typing.start', read),
      channel.on('typing.stop', read),
      client.on('user.presence.changed', (event) => {
        if (event.user?.id === counterpartUserId) read();
      }),
    ];
    return () => subs.forEach((sub) => sub.unsubscribe());
  }, [client, streamChannelId, counterpartUserId]);

  // Derived, not synced: no client/channel means IDLE regardless of what the
  // last subscription left behind.
  return client && streamChannelId ? activity : IDLE;
}

function readPresence(
  channel: ReturnType<StreamChat['channel']>,
  counterpartUserId: string,
): CounterpartPresence | null {
  const user = channel.state.members[counterpartUserId]?.user;
  if (!user) return null;
  if (user.online) return { online: true };
  return { online: false, lastActive: user.last_active ? new Date(user.last_active).getTime() : null };
}
