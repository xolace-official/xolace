import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Button } from 'heroui-native';
import { useOverlayContext } from 'stream-chat-expo';
import type { FunctionReturnType } from 'convex/server';
import { api } from '@/convex/_generated/api';
import { AppText } from '@/src/components/shared/app-text';
import { useStreamConnection } from '../providers/stream-chat-provider';
import { useDismissThreadNotifications } from '../use-dismiss-thread-notifications';
import { useThreadConversation } from '../use-thread-conversation';
import { rateCtaState } from '../utils';
import { XolacerMenu } from './xolacer-menu';
import { ComposerPlaceholder } from './composer-placeholder';
import { SafetyStrip } from './safety-strip';
import { ThreadHeader } from './thread-header';
import { ThreadMessages } from './thread-messages';
import { ThreadSkeleton } from './thread-skeleton';
import { ThreadStatusBar } from './thread-status-bar';

/**
 * `myStreamUserId` is dropped: it is the profile id, which is also the id the
 * Stream socket connects as, so `client.userID` carries the same value without
 * the round trip — and that lets `useThreadConversation` seed this shape from
 * the conversation list, which has no per-user field of its own. The server
 * still returns it for clients shipped before this change.
 */
export type ThreadConversation = Omit<
  NonNullable<FunctionReturnType<typeof api.xolacerChat.getConversation>>,
  'myStreamUserId'
> & {
  /**
   * Set only by `useThreadConversation`'s list seed: the per-conversation
   * fields (`resumable`, `canRate`, `myRating`) are placeholders until the
   * real row lands, so the status bar — the one surface that reads them —
   * holds its space instead of committing to a CTA it may have to retract.
   */
  seeded?: true;
};

export function ThreadScreen({ conversationId }: { conversationId: string }) {
  const conversation = useThreadConversation(conversationId);

  // Above the loading branches on purpose: the tray should clear on the way in,
  // not once the conversation has finished loading.
  useDismissThreadNotifications(conversationId);

  if (conversation === undefined) return <ThreadSkeleton />;
  if (conversation === null) return <ThreadUnavailable />;
  return <ThreadBody conversation={conversation} />;
}

function ThreadBody({ conversation }: { conversation: ThreadConversation }) {
  // Usually a no-op — the Connect tab already opened the connection on the way
  // here. It matters on the paths that skip that tab: a push-notification deep
  // link, or a cold launch straight into this route.
  const { status: streamStatus, retry } = useStreamConnection();


  const { overlay } = useOverlayContext();

  // Identity lives in the native header's title slot; the back affordance,
  // safe area and glass background are the platform's. Rendered as a sibling of
  // every branch below rather than inside one, so the title is set on the first
  // frame and survives the connecting → ready swap without the header
  // re-mounting under it. The overflow menu is a sibling here for the same
  // reason, and is mounted unconditionally — never `hidden`, which would leave
  // a transparent touch-eating band across the top on Android.
  const header = (
    <>
      <Stack.Screen
        options={{
          // eslint-disable-next-line react/no-unstable-nested-components -- navigation header render prop, not a mounted subtree
          headerTitle: () => <ThreadHeader conversation={conversation} />,
          title: conversation.counterpartName,
          gestureEnabled: overlay === 'none',
        }}
      />
      <XolacerMenu
        origin="thread"
        profileId={conversation.counterpartProfileId}
        name={conversation.counterpartName}
        conversationId={conversation.id}
        hasHistory={Boolean(conversation.streamChannelId)}
        rateState={rateCtaState(conversation)}
      />
    </>
  );


  const body = () => {
    // A request that hasn't been accepted has no channel yet — there is nothing
    // to read, so the whole screen is header + waiting/accept bar. Independent
    // of Stream: this state never needs a connection.
    if (!conversation.streamChannelId) {
      return (
        <View className="flex-1 bg-background">
          <SafetyStrip />
          <View className="flex-1 items-center justify-center px-10">
            <AppText className="text-center text-[13px] leading-5 text-muted">

              {conversation.status === 'closed'
                ? 'Nothing was said here.'
                : conversation.role === 'xolacer'
                  ? 'Nothing has been said yet, the conversation opens once you accept.'
                  : 'Messages will appear here once your request is accepted.'}
            </AppText>
          </View>
          <ThreadStatusBar conversation={conversation} />
        </View>
      );
    }

    // Chrome is Convex-driven and already loaded, so it stays put while the
    // Stream client comes up underneath it. `ready` no longer waits on the
    // socket — only on the offline database opening, milliseconds — so this
    // skeleton is a flash, and `unavailable` is the one state that lingers.
    if (streamStatus !== 'ready') {
      return (
        <View className="flex-1 bg-background">
          <SafetyStrip />
          {streamStatus === 'connecting' ? <ThreadSkeleton /> : <MessagesUnavailable onRetry={retry} />}
          {conversation.status === 'open' ? (
            // Only while connecting. On the error path the messages never
            // arrive, so a composer stub would promise a send that cannot
            // happen.
            streamStatus === 'connecting' ? <ComposerPlaceholder /> : null
          ) : (
            <ThreadStatusBar conversation={conversation} />
          )}
        </View>
      );
    }

    return <ThreadMessages conversation={conversation} />;
  };

  return (
    <>
      {header}
      {body()}
    </>
  );
}

export function MessagesUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-10">
      <AppText className="text-center text-[13px] leading-5 text-muted">
        Messages couldn&apos;t load. Check your connection and try again.
      </AppText>
      <Button variant="secondary" size="sm" onPress={onRetry}>
        Try again
      </Button>
    </View>
  );
}

function ThreadUnavailable() {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-background px-10">
      <AppText className="text-[15px] font-semibold text-foreground">
        This conversation isn&apos;t here
      </AppText>
      <AppText className="text-center text-[13px] leading-5 text-muted">
        It may have been closed, or it isn&apos;t yours to open.
      </AppText>
    </View>
  );
}
