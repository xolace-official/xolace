import { useMemo, useState } from 'react';
import { useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  Channel,
  MessageList,
  WithComponents,
  useChatContext,
  useOverlayContext,
} from 'stream-chat-expo';
import { XOLACE_BROADCAST_CHANNEL_TYPE, XOLACE_CHANNEL_ID } from '@/convex/lib/streamSetup';
import { AppText } from '@/src/components/shared/app-text';
import { useStreamConnection } from '../providers/stream-chat-provider';
import { OfflineStrip } from './offline-strip';
import { SafetyStrip } from './safety-strip';
import {
  CHANNEL_ROOT_PROPS,
  COMPONENT_OVERRIDES,
  SUPPORTED_REACTIONS,
  TEXT_ONLY_CAPABILITIES,
  minimalMessageActions,
} from './thread-channel-config';
import { MessagesUnavailable } from './thread-screen';
import { ThreadSkeleton } from './thread-skeleton';
import { useLocalChannelState } from './thread-messages';
import { XolacerAvatar } from './xolacer-avatar';
import {
  BroadcastComposerBar,
  BroadcastMessageAuthor,
  BroadcastMessageFooter,
} from './xolace-channel-overrides';

/**
 * The one fixed, no-lifecycle channel every camper is a member of (#372-#375).
 * Unlike a xolacer thread there is no `xolacer_conversations` row, no
 * request/accept/rest/close status, and no per-pair identity to resolve —
 * every author is Xolace, see `BroadcastMessageAuthor`. Composer visibility for
 * everyone else is entirely Stream's own doing — only the sender's channel
 * membership carries the `create-message` grant (see `DESIRED_XOLACE_BROADCAST`),
 * so `<MessageComposer>` renders its stock "can't send" state for anyone else
 * with no client-side check to maintain, and a send that somehow reaches the
 * server the same way any other rejected send does — the SDK's own error
 * handling, not a bespoke path.
 */

// Reactors here are every camper, not a resolved counterpart — showing the
// "who reacted" sheet with no identity override renders Stream's own
// (pseudonymous) reactor names instead of hiding every non-self row, which is
// what `ConversationReactionUser` does with no `ConversationIdentityProvider`
// mounted. Everything else in the map is a safe no-op without one.
const { MessageUserReactionsItem: _reactionIdentityOverride, ...BROADCAST_OVERRIDES_BASE } =
  COMPONENT_OVERRIDES;

/**
 * Same identity as the chats-list row (#377) — campfire mark, "Camp
 * announcements" subtitle — rendered into the native header's title slot
 * instead of a plain string, same pattern as `ThreadHeader`.
 */
function XolaceChannelHeader() {
  return (
    <View className="flex-row items-center gap-2.5">
      <XolacerAvatar name="Xolace" size="sm" campfire />
      <View className="min-w-0 shrink">
        <AppText className="text-sm font-semibold text-foreground" numberOfLines={1}>
          Xolace
        </AppText>
        <AppText className="text-[11px] text-muted mt-px" numberOfLines={1}>
          Camp announcements
        </AppText>
      </View>
    </View>
  );
}

const BROADCAST_OVERRIDES = {
  ...BROADCAST_OVERRIDES_BASE,
  MessageAuthor: BroadcastMessageAuthor,
  MessageFooter: BroadcastMessageFooter,
};

export function XolaceChannelScreen() {
  const { status: streamStatus, retry } = useStreamConnection();
  const { overlay } = useOverlayContext();

  return (
    <>
      <Stack.Screen
        options={{
          // eslint-disable-next-line react/no-unstable-nested-components -- navigation header render prop, not a mounted subtree
          headerTitle: () => <XolaceChannelHeader />,
          title: 'Xolace',
          gestureEnabled: overlay === 'none',
        }}
      />
      {streamStatus === 'ready' ? (
        <XolaceChannelMessages />
      ) : (
        <View className="flex-1 bg-background">
          <SafetyStrip />
          {streamStatus === 'connecting' ? (
            <ThreadSkeleton />
          ) : (
            <MessagesUnavailable onRetry={retry} />
          )}
        </View>
      )}
    </>
  );
}

function XolaceChannelMessages() {
  const { client } = useChatContext();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(0);

  // See `ThreadMessages` for why this offset is measured rather than assumed.
  const headerOffset = contentHeight ? windowHeight - contentHeight : 0;
  const onContentLayout = (event: LayoutChangeEvent) =>
    setContentHeight(event.nativeEvent.layout.height);

  const channel = useMemo(
    () => client.channel(XOLACE_BROADCAST_CHANNEL_TYPE, XOLACE_CHANNEL_ID),
    [client],
  );
  const hasLocalState = useLocalChannelState(channel);

  if (!hasLocalState) {
    return (
      <View className="flex-1 bg-background">
        <SafetyStrip />
        <ThreadSkeleton />
      </View>
    );
  }

  return (
    <View className="flex-1" onLayout={onContentLayout}>
      <WithComponents overrides={BROADCAST_OVERRIDES}>
        <Channel
          channel={channel}
          keyboardVerticalOffset={headerOffset}
          additionalKeyboardAvoidingViewProps={CHANNEL_ROOT_PROPS}
          topInset={insets.top}
          supportedReactions={SUPPORTED_REACTIONS}
          enforceUniqueReaction
          overrideOwnCapabilities={TEXT_ONLY_CAPABILITIES}
          hasImagePicker={false}
          hasFilePicker={false}
          hasCameraPicker={false}
          hasCommands={false}
          // No `useFlagMessage` here — that mutation is keyed on
          // `xolacer_conversations` and would throw for this channel.
          messageActions={(params) =>
            minimalMessageActions(params, () => {}).filter(
              (action) => action.actionType !== 'flagMessage',
            )
          }
        >
          <SafetyStrip />
          <MessageList />
          <OfflineStrip />
          <BroadcastComposerBar />
        </Channel>
      </WithComponents>
    </View>
  );
}
