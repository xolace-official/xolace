import { Pressable, View } from 'react-native';
import {
  MessageUserReactionsAvatar,
  useChatContext,
  useMessageContext,
  type MessageUserReactionsProps,
} from 'stream-chat-expo';
import { AppText } from '@/src/components/shared/app-text';
import { useConversationIdentity } from '@/src/features/xolacer-chat/components/message-author';
import { resolveMessageIdentity } from '@/src/features/xolacer-chat/utils';

type Reaction = NonNullable<MessageUserReactionsProps['reactions']>[number];

/**
 * One row of the "who reacted" sheet (tap a reaction chip). Stream's row reads
 * `reaction.name` / `reaction.image` straight off the shared user record — see
 * `resolveMessageIdentity` for why that can't be shown — and the SDK doesn't
 * export it, so this is a rebuild rather than a patched delegate like
 * `ConversationMessageAuthor`. Own reactions render as "You"; anyone who is
 * neither self nor the counterpart gets no row rather than a guessed name.
 */
export function ConversationReactionUser({
  reaction,
  supportedReactions,
}: {
  reaction: Reaction;
  supportedReactions: { type: string; Icon: React.ComponentType<{ size?: number }> }[];
}) {
  const { client } = useChatContext();
  const { handleReaction } = useMessageContext();
  const identity = useConversationIdentity();

  const isOwn = reaction.id === client.userID;
  const counterpart =
    !isOwn && identity ? resolveMessageIdentity(reaction.id, identity.conversation) : null;
  if (!isOwn && !counterpart) return null;

  const shown = counterpart ? { ...reaction, ...counterpart } : reaction;
  const Icon = supportedReactions.find((r) => r.type === reaction.type)?.Icon;

  return (
    <Pressable
      accessibilityRole="button"
      className="flex-row items-center gap-3 px-4 py-2"
      disabled={!isOwn}
      onPress={() => handleReaction?.(reaction.type)}
    >
      <MessageUserReactionsAvatar reaction={shown} size="md" />
      <View className="flex-1">
        <AppText numberOfLines={1}>{isOwn ? 'You' : shown.name}</AppText>
        {isOwn ? <AppText className="text-xs text-muted">Tap to remove</AppText> : null}
      </View>
      {Icon ? <Icon size={24} /> : null}
    </Pressable>
  );
}
