import { useEffect, useMemo, useState } from 'react';
import { useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from 'convex/react';
import type { Channel as StreamChannel } from 'stream-chat';
import {
  Channel,
  MessageComposer,
  MessageList,
  WithComponents,
  useChatContext,
} from 'stream-chat-expo';
import { api } from '@/convex/_generated/api';
import { ComposerPlaceholder } from '@/src/features/xolacer-chat/components/composer-placeholder';
import { ConversationIdentityProvider } from '@/src/features/xolacer-chat/components/message-author';
import { OfflineStrip } from '@/src/features/xolacer-chat/components/offline-strip';
import { SafetyStrip } from '@/src/features/xolacer-chat/components/safety-strip';
import {
  CHANNEL_ROOT_PROPS,
  COMPONENT_OVERRIDES,
  SUPPORTED_REACTIONS,
  TEXT_ONLY_CAPABILITIES,
  minimalMessageActions,
} from '@/src/features/xolacer-chat/components/thread-channel-config';
import { ThreadSkeleton } from '@/src/features/xolacer-chat/components/thread-skeleton';
import { hydrateChannelsFromCache } from '@/src/features/xolacer-chat/offline-db';
import { ThreadStatusBar } from '@/src/features/xolacer-chat/components/thread-status-bar';
import type { ThreadConversation } from '@/src/features/xolacer-chat/components/thread-screen';
import { useFlagMessage } from '@/src/features/xolacer-chat/use-flag-message';

/**
 * The message surface, mounted once `Chat` holds a usable client — one with a
 * user and an open offline database, online or not.
 *
 * Split out from the thread screen so the screen's Convex-driven chrome —
 * header, safety strip, status bar — can render before that. Everything here
 * needs `ChatContext`.
 */
export function ThreadMessages({ conversation }: { conversation: ThreadConversation }) {
  const { client } = useChatContext();
  const { streamChannelId } = conversation;
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(0);

  // Stream's KeyboardCompatibleView compares its own layout height — which
  // starts below the native header — against the keyboard's absolute screen Y,
  // so the shift under-shoots by exactly the header height and the composer
  // ends up behind the keyboard. Handing that height back as the offset closes
  // the gap. Measured rather than assumed: the header grows with the subtitle,
  // the notch and Dynamic Island, and no constant survives all three.
  const headerOffset = contentHeight ? windowHeight - contentHeight : 0;
  const onContentLayout = (event: LayoutChangeEvent) =>
    setContentHeight(event.nativeEvent.layout.height);

  // Channel identity must stay stable across renders — `<Channel>` treats a new
  // instance as a new conversation. This memo is for correctness, not perf, so
  // it stays despite the React Compiler being enabled.
  const channel = useMemo(
    () => client.channel('messaging', streamChannelId as string),
    [client, streamChannelId],
  );

  const hasLocalState = useLocalChannelState(channel);
  useTouchOnSend(channel, conversation, client.userID);
  const flagMessage = useFlagMessage(conversation.id);

  // `client.channel()` returns an *empty* handle: no messages, and no
  // `own_capabilities`. `<Channel>` renders its children immediately and only
  // watches inside an effect, so mounting it now guarantees one paint of
  // "No chats here yet" over "You can't send messages in this channel" before
  // the real state arrives. The skeleton holds until the channel has state
  // from somewhere — the warmup, the device, or a first-ever watch.
  if (!hasLocalState) {
    return (
      <View className="flex-1 bg-background">
        <SafetyStrip />
        <ThreadSkeleton />
        {conversation.status === 'open' ? <ComposerPlaceholder /> : null}
      </View>
    );
  }

  return (
    // Wrapper exists to measure the content box; Channel's own root is the
    // view whose height Stream mis-compares against the keyboard frame.
    <View className="flex-1" onLayout={onContentLayout}>
      {/* Component overrides arrive through this, not through Channel props.
        Module-level constant because WithComponents reads `overrides` once at
        mount and never again — a fresh object each render would be silently
        ignored, which is worse than a crash — and why the message-avatar
        override reads its conversation from the context below rather than
        from a closure. */}
      <WithComponents overrides={COMPONENT_OVERRIDES}>
        <ConversationIdentityProvider conversation={conversation}>
          <Channel
            channel={channel}
            // Must be explicit: Channel destructures both with no default, so
            // omitting them passes `undefined`, not 0.
            keyboardVerticalOffset={headerOffset}
            additionalKeyboardAvoidingViewProps={CHANNEL_ROOT_PROPS}
            topInset={insets.top}
            supportedReactions={SUPPORTED_REACTIONS}
            // One reaction per person per message; picking another swaps it.
            enforceUniqueReaction
            overrideOwnCapabilities={TEXT_ONLY_CAPABILITIES}
            hasImagePicker={false}
            hasFilePicker={false}
            hasCameraPicker={false}
            // And the button survives on slash commands alone — a messaging
            // channel ships with giphy enabled by default.
            hasCommands={false}
            messageActions={(params) => minimalMessageActions(params, flagMessage)}
          >
            <SafetyStrip />
            <MessageList />
            {conversation.status === 'open' ? (
              <>
                <OfflineStrip />
                <MessageComposer />
              </>
            ) : (
              <ThreadStatusBar conversation={conversation} />
            )}
          </Channel>
        </ConversationIdentityProvider>
      </WithComponents>
    </View>
  );
}

/**
 * Resolves once the channel holds state, so `<Channel>` never mounts over an
 * empty one. Sources, in order of what's cheapest: already live (the warmup
 * watched it), the offline database (the thread paints its last known
 * messages instantly, offline included — `<Channel>` then reconciles with its
 * own `watch()`), and finally a network watch for a conversation this device
 * has never held. Failure resolves too: Stream's own `LoadingErrorIndicator`
 * is a better place to land than a skeleton that never ends.
 */
export function useLocalChannelState(channel: StreamChannel) {
  // Records only the settled cid. Success needs no state of its own —
  // `channel.initialized` / `offlineMode` already carry it — but it does need
  // a re-render, which is the whole reason this lands in state at all. Stored
  // with the cid so a channel swap re-gates instead of inheriting the verdict.
  const [settledCid, setSettledCid] = useState<string | null>(null);

  useEffect(() => {
    if (channel.initialized || channel.offlineMode) return;
    let alive = true;
    const client = channel.getClient();
    hydrateChannelsFromCache(client, [channel.id as string])
      .then(() => {
        if (channel.offlineMode) return;
        return channel.watch({ presence: true });
      })
      .catch((error) => console.error('[xolacer-chat] channel load failed', error))
      .finally(() => {
        if (alive) setSettledCid(channel.cid);
      });
    return () => {
      alive = false;
    };
  }, [channel]);

  return channel.initialized || channel.offlineMode || settledCid === channel.cid;
}

/**
 * Keeps `lastMessageAt` current so the resting sweep measures real silence.
 * Each client touches on its own sends, so both sides stay covered.
 *
 * The Stream `message.new` webhook added since does not replace this: it fires
 * on the notification path and stamps the recipient's own notified-at, which is
 * suppressed for two minutes at a time and so cannot stand in for a sweep that
 * has to measure every message. (ponytail: fold the touch into the webhook only
 * if client drift shows up.)
 */
function useTouchOnSend(
  channel: StreamChannel,
  conversation: ThreadConversation,
  // The connected user's id, from the socket rather than from Convex — same
  // value (the profile id signs the token), one less field the screen has to
  // have loaded before it can mount this.
  myUserId: string | undefined,
) {
  const touchConversation = useMutation(api.xolacerChat.touchConversation);
  const { id, status } = conversation;

  useEffect(() => {
    if (status !== 'open') return;
    const { unsubscribe } = channel.on('message.new', (event) => {
      // The `!myUserId` half matters: without it an id-less event would match
      // an id-less user and touch on the counterpart's message.
      if (!myUserId || event.user?.id !== myUserId) return;
      touchConversation({ conversationId: id }).catch((error) =>
        console.error('[xolacer-chat] touch failed', error),
      );
    });
    return unsubscribe;
  }, [channel, id, status, myUserId, touchConversation]);
}
