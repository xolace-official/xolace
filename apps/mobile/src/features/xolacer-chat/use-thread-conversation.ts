import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { ThreadConversation } from './components/thread-screen';

/**
 * The thread's conversation, seeded from the list the user tapped it in.
 *
 * Returns `undefined` when there is nothing to seed from — a push-notification
 * deep link, or a cold launch straight into this route — and the skeleton is
 * then telling the truth.
 */
export function useThreadConversation(
  conversationId: string,
): ThreadConversation | null | undefined {
  const conversation = useQuery(api.xolacerChat.getConversation, {
    conversationId: conversationId as Id<'xolacer_conversations'>,
  });

  const rows = useQuery(
    api.xolacerChat.myConversations,
    conversation === undefined ? {} : 'skip',
  );

  if (conversation !== undefined) return conversation;

  // Broadcast row never matches: it routes through `/xolace-channel`, not
  // this `/chat/[conversationId]` route, and carries no `xolacer_conversations`
  // id to seed a `ThreadConversation` from.
  const row = rows
    ?.filter((candidate) => candidate.kind === 'pair')
    .find((candidate) => candidate.id === conversationId);
  if (!row) return undefined;

  // `resumable`, `canRate` and `myRating` are per-conversation reads the list
  // doesn't make. Rather than gate the whole thread on them, the seed is
  // marked and the status bar alone waits — every resting or closed
  // conversation used to sit on the skeleton for the round trip, and the
  // messages never needed it (#342).
  return {
    ...row,
    // Not redundant with the spread: `...row` leaves `origin` optional, and
    // ThreadConversation requires the key to be present even when undefined.
    origin: row.origin,
    restingReason: row.restingReason,
    resumable: false,
    canRate: false,
    myRating: undefined,
    seeded: true,
  };
}
