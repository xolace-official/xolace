import { useMutation } from 'convex/react';
import { useToast } from 'heroui-native';
import type { LocalMessage } from 'stream-chat';
import { useChatContext } from 'stream-chat-expo';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useFeedbackContext } from '@/src/features/feedback-tray/use-feedback-context';

/**
 * Flag one message — the long-press action that replaces the SDK's own. Two
 * writes, both places the maintainer looks: Stream's moderation queue (with
 * the user's own token, so the queue names the flagger) and the concern tray
 * (`productFeedback.flagMessage`, a `flag` row that carries the product-side
 * context the dashboard lacks). Unbudgeted, and the only feedback is a quiet
 * toast — pointing at evidence is not escalation theatre.
 */
export function useFlagMessage(conversationId: Id<'xolacer_conversations'>) {
  const { client } = useChatContext();
  const flag = useMutation(api.productFeedbackFlags.flagMessage);
  const { toast } = useToast();
  const context = useFeedbackContext();

  return (message: LocalMessage) => {
    if (!message.id) return;
    Promise.allSettled([
      client.flagMessage(message.id),
      flag({
        conversationId,
        messageId: message.id,
        context,
      }),
    ]).then((results) => {
      const landed = results.some((r) => r.status === 'fulfilled');
      for (const r of results) {
        if (r.status === 'rejected') console.warn('[xolacer-chat] flag failed', r.reason);
      }
      toast.show(
        landed
          ? { label: 'Flagged.', description: 'Someone will take a look.' }
          : { label: "Couldn't flag this message", description: 'Something went wrong. Try again.' },
      );
    });
  };
}
