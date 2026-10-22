import type { MessageComposerState } from 'stream-chat';
import {
  Reply,
  useMessageComposer,
  useMessageContext,
  useStateStore,
  type ReplyProps,
} from 'stream-chat-expo';
import { resolveMessageIdentity } from '@/src/features/xolacer-chat/utils';
import { useConversationIdentity } from '@/src/features/xolacer-chat/components/message-author';

const quotedMessageSelector = (state: MessageComposerState) => ({
  quotedMessage: state.quotedMessage,
});

/**
 * The quoted-reply preview — both the composer header ("Reply to …") and the
 * quote embedded in a sent bubble — sourced from the conversation rather than
 * from Stream's globally-shared user record. See `resolveMessageIdentity` for
 * why that record is never the right thing to show.
 *
 * Reply is reachable even though `minimalMessageActions` drops `quotedReply`:
 * the SDK's swipe-to-reply gesture (`enableSwipeToReply`, on by default) is a
 * second entry point that never passes through the action list. So the seeker
 * swiping on their xolacer's message got the generic placeholder Stream holds
 * for everyone — "Reply to Camper" instead of the name in the header two
 * inches above it.
 *
 * The quoted message is resolved exactly as the SDK's own `Reply` does — prop
 * first (edit mode), then the message being rendered, then composer state —
 * and handed back as the `quotedMessage` prop, which is spread last inside
 * `Reply` and so wins over its own lookup. Delegating rather than
 * reimplementing keeps the layout, memoization, and the a11y announcement,
 * which reads the same patched message.
 */
export function ConversationReply(props: ReplyProps) {
  const { message } = useMessageContext();
  const messageComposer = useMessageComposer();
  const { quotedMessage } = useStateStore(messageComposer.state, quotedMessageSelector);
  const identity = useConversationIdentity();

  const quoted =
    props.quotedMessage ??
    ((message ? message.quoted_message : quotedMessage) as ReplyProps['quotedMessage']);

  const override =
    identity && quoted?.user
      ? resolveMessageIdentity(quoted.user.id, identity.conversation)
      : null;
  if (!override || !quoted?.user) return <Reply {...props} />;

  return (
    <Reply
      {...props}
      quotedMessage={{
        ...quoted,
        user: { ...quoted.user, name: override.name, image: override.image },
      }}
    />
  );
}
