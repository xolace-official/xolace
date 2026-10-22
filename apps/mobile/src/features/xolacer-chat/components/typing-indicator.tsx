import { useTypingContext } from 'stream-chat-expo';
import { AppText } from '@/src/components/shared/app-text';
import { resolveMessageIdentity } from '@/src/features/xolacer-chat/utils';
import { useConversationIdentity } from '@/src/features/xolacer-chat/components/message-author';

/**
 * Replaces Stream's stock `TypingIndicator` (registered via `WithComponents`
 * in `thread-messages.tsx`). The stock one renders the other user's raw
 * Stream avatar/name (`UserAvatarStack`) with no override slot — see
 * `resolveMessageIdentity` for why that record can never be shown as-is.
 *
 * The name comes back *from* the resolver rather than being read off the
 * conversation separately, so there is exactly one rule deciding whether a
 * Stream sender is the counterpart. Asking it positively is the whole point:
 * "someone other than me is typing" attributes my own typing to the other
 * person for the moment my user id is unset during a reconnect, and dresses
 * any third party — a system notice, a safety intervention — in their name.
 * Unrecognised typers get no indicator at all.
 *
 * No self-filter here: Stream's own typing container filters the local user
 * out and returns null before this ever mounts, so a second copy of that rule
 * would be redundant as well as wrong.
 */
export function ConversationTypingIndicator() {
  const { typing } = useTypingContext();
  const identity = useConversationIdentity();
  if (!identity) return null;

  const counterpart = Object.values(typing)
    .map((event) => resolveMessageIdentity(event.user?.id, identity.conversation))
    .find((resolved) => resolved !== null);
  if (!counterpart) return null;

  return (
    <AppText className="text-xs text-muted">{counterpart.name} is typing…</AppText>
  );
}
