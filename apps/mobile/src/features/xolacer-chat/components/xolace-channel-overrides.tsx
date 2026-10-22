import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';
import { SymbolView } from 'expo-symbols';
import { useThemeColor } from 'heroui-native';
import {
  MessageAuthor,
  MessageComposer,
  MessageFooter,
  useMessageContext,
  useOwnCapabilitiesContext,
  type MessageAuthorProps,
  type MessageFooterProps,
} from 'stream-chat-expo';
import { AppText } from '@/src/components/shared/app-text';

const LOCK_ICON = { ios: 'lock.fill', android: 'lock', web: 'lock' } as const;

/**
 * Replaces the bare `<MessageComposer>` for anyone but the broadcast sender.
 * Left alone, Stream renders its own generic "You can't send messages in this
 * channel" for that case — technically correct, and reads like an error. This
 * says the same thing in the channel's own voice: reactions still work, this
 * seat just doesn't have a mic.
 */
export function BroadcastComposerBar() {
  const { sendMessage: canSendMessage } = useOwnCapabilitiesContext();
  const muted = useThemeColor('muted') as string;
  const insets = useSafeAreaInsets();

  if (canSendMessage) return <MessageComposer />;

  // The stock composer clears the home indicator itself; this bar has to.
  return (
    <View
      className="flex-row items-center gap-2.5 border-t border-border/40 bg-surface-secondary px-4 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <SymbolView name={LOCK_ICON} size={14} tintColor={muted} />
      <AppText className="flex-1 text-xs leading-4 text-muted">
        Xolace only talks to the whole camp, not back, drop a reaction instead
      </AppText>
    </View>
  );
}

/**
 * Every message here is Xolace's — only the broadcaster's membership carries
 * `create-message` — so the author is a constant, not read off the message.
 * It can't come from the Stream user record: the broadcaster is a real
 * account that also chats 1:1 as a pseudonymous "Camper", and `getStreamToken`
 * re-upserts that record (name + catalog avatar) on every connect, which is
 * what left "Camper" and a personal avatar under an announcement. Same
 * campfire mark as `XolacerAvatar campfire`, as a URI the SDK's avatar takes.
 *
 * Two SDK components read the author: `MessageAuthor` draws the avatar,
 * `MessageFooter` prints the name (only in channels with >2 members, which is
 * why the 1:1 `ConversationMessageAuthor` never needed the footer half).
 */
const CAMPFIRE_URI = Asset.fromModule(require('@/assets/images/flux/campfire-mini.jpeg')).uri;

function useXolaceAuthoredMessage() {
  const { message } = useMessageContext();
  if (!message.user) return message;
  return { ...message, user: { ...message.user, name: 'Xolace', image: CAMPFIRE_URI } };
}

export function BroadcastMessageAuthor(props: MessageAuthorProps) {
  return <MessageAuthor {...props} message={useXolaceAuthoredMessage()} />;
}

export function BroadcastMessageFooter(props: MessageFooterProps) {
  return <MessageFooter {...props} message={useXolaceAuthoredMessage()} />;
}
