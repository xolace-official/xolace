import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, PressableFeedback, useToast } from 'heroui-native';
import { useAction, useMutation } from 'convex/react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/convex/_generated/api';
import { AppText } from '@/src/components/shared/app-text';
import { playSoftPress } from '@/src/lib/haptics';
import { acceptFailureLabel, chatLimitError } from '@/src/features/xolacer-chat/utils';
import type { ThreadConversation } from './thread-screen';

/**
 * The composer is the state indicator: when a conversation can take a message
 * there's a composer, otherwise this bar takes its place and says plainly
 * whether tapping will just work. History always renders identically above.
 */
export function ThreadStatusBar({ conversation }: { conversation: ThreadConversation }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const acceptRequest = useAction(api.xolacerChat.acceptRequest);
  const declineRequest = useMutation(api.xolacerChat.declineRequest);
  const resumeConversation = useMutation(api.xolacerChat.resumeConversation);

  const padBottom = Math.max(insets.bottom, 14);

  // Open and requested read nothing the list didn't already carry. The rest
  // hold an empty bar until the row lands — see `ThreadConversation.seeded`.
  if (conversation.seeded && conversation.status !== 'requested') {
    return <Bar padBottom={padBottom} />;
  }

  const handleAccept = () => {
    playSoftPress();
    acceptRequest({ conversationId: conversation.id }).catch((error: unknown) =>
      toast.show({ label: acceptFailureLabel(error) }),
    );
  };

  const handleDecline = () => {
    playSoftPress();
    declineRequest({ conversationId: conversation.id })
      .then(() => router.back())
      .catch(() => toast.show({ label: "Couldn't decline. Try again." }));
  };

  const handleResume = () => {
    playSoftPress();
    resumeConversation({ conversationId: conversation.id })
      .then((result) => {
        if (!result.resumed) {
          toast.show({ label: 'This one has gone quiet on their end too.' });
        }
      })
      .catch((error: unknown) => {
        const limit = chatLimitError(error);
        toast.show({
          label:
            limit?.code === 'open_conversation_limit'
              ? `You've got ${limit.max ?? 3} conversations open. Let one rest before picking this back up.`
              : "Couldn't pick this back up. Try again.",
        });
      });
  };

  const goToRoster = () => {
    playSoftPress();
    // Same pattern as the idle menu's Discovery entry — the tab surface is a
    // sibling stack entry, so replace rather than stacking another screen.
    router.replace('/connect');
  };

  if (conversation.status === 'requested') {
    return (
      <Bar padBottom={padBottom}>
        {conversation.role === 'xolacer' ? (
          <>
            <Copy>
              <Bold>{conversation.counterpartName}</Bold> asked to talk.{' '}
              {conversation.counterpartPresent ? (
                <>
                  <Bold>They&apos;re still in the app right now</Bold> — accepting opens a
                  conversation only the two of you can see.
                </>
              ) : (
                <>Accepting opens a conversation only the two of you can see.</>
              )}
            </Copy>
            <View className="flex-row gap-2">
              <Button className="flex-1" onPress={handleAccept}>
                Accept
              </Button>
              <Button variant="secondary" className="flex-1" onPress={handleDecline}>
                Not right now
              </Button>
            </View>
          </>
        ) : (
          // A wait with no shape is the thing this feature exists to fix. Present
          // says the answer could come in the next minute; away says why it
          // won't, and that the request will still reach them — otherwise
          // "stepped away" reads as the request having landed nowhere.
          <Copy>
            {conversation.counterpartPresent ? (
              <>
                Request sent. <Bold>{conversation.counterpartName} is here right now</Bold>{' '}
                — they can accept it whenever they see it.
              </>
            ) : (
              <>
                Request sent.{' '}
                <Bold>{conversation.counterpartName} has stepped away for now</Bold> — a
                notification will reach them, and they can accept when they have space.
              </>
            )}
          </Copy>
        )}
      </Bar>
    );
  }

  if (conversation.status === 'resting' && conversation.resumable) {
    // Wrapped up on purpose reads differently from drifted quiet — the door is
    // equally open either way, but "gone quiet" would misdescribe a deliberate
    // ending, and on the xolacer's own side it would misdescribe their own tap.
    const manual = conversation.restingReason === 'manual';
    return (
      <Bar padBottom={padBottom}>
        <Copy>
          {manual ? (
            conversation.role === 'xolacer' ? (
              <>
                You wrapped this one up.{' '}
                <Bold>Nothing was deleted</Bold> — picking it back up doesn&apos;t need
                a new request.
              </>
            ) : (
              <>
                <Bold>{conversation.counterpartName} wrapped this one up</Bold> — nothing
                to do with you. Everything you wrote is still here, and picking it back
                up doesn&apos;t need a new request.
              </>
            )
          ) : (
            <>
              This one&apos;s gone quiet.{' '}
              <Bold>{conversation.counterpartName} is still here</Bold> — picking it up
              doesn&apos;t need a new request.
            </>
          )}
        </Copy>
        <Button onPress={handleResume}>Pick this back up</Button>
        <RatePrompt conversation={conversation} />
      </Bar>
    );
  }

  // Resting-but-not-resumable and closed share one screen: inactive,
  // unpublished, at cap, declined, or blocked. Deliberately identical for every
  // one of those — a blocked person is never told they were blocked, and a
  // declined seeker is not told which of the two it was.
  //
  // Role-aware, because a xolacer reaches this too: they may have blocked the
  // seeker themselves, and offering them "find another Xolacer" would be
  // nonsense. No-guilt framing on the seeker side, and the promise that nothing
  // was deleted comes before the redirect — losing the conversation is the fear.
  //
  // That promise is only made where there is something to keep. A request that
  // was declined, blocked or left to expire never opened a channel, so "every-
  // thing you two wrote is still here" would be reassuring someone about a
  // history that was never written.
  const hasHistory = Boolean(conversation.streamChannelId);

  if (conversation.role === 'xolacer') {
    return (
      <Bar padBottom={padBottom}>
        <Copy>
          {hasHistory ? (
            <>
              This conversation is closed.{' '}
              <Bold>Everything you two wrote is still here</Bold>.
            </>
          ) : (
            <>This request is closed. Nothing was sent either way.</>
          )}
        </Copy>
      </Bar>
    );
  }

  return (
    <Bar padBottom={padBottom}>
      <Copy>
        {hasHistory ? (
          <>
            {conversation.counterpartName} has stepped back for now. Nothing to do with you
            — <Bold>everything you two wrote is still here</Bold>.
          </>
        ) : (
          <>
            {conversation.counterpartName} isn&apos;t able to pick this one up.{' '}
            <Bold>Nothing to do with you</Bold> — it happens, and there are others here.
          </>
        )}
      </Copy>
      <Button variant="secondary" onPress={goToRoster}>
        Find another Xolacer
      </Button>
      <RatePrompt conversation={conversation} />
    </Bar>
  );
}

/**
 * The wind-down entry to the rating prompt: a conversation that goes quiet on
 * its own is still a natural moment to ask, so this stays exactly as it was.
 *
 * It is no longer the *only* entry, and no longer the prominent one — the
 * profile screen's rate card is, and it deliberately pushes until the seeker
 * has scored once. Here it stays a link, in keeping with the surface: this bar
 * is already delivering the news that the conversation ended. An unrated
 * conversation still just never enters anyone's denominator.
 */
function RatePrompt({ conversation }: { conversation: ThreadConversation }) {
  const router = useRouter();
  if (!conversation.canRate) return null;

  return (
    <PressableFeedback
      onPress={() => {
        playSoftPress();
        router.push({
          pathname: '/rate/[conversationId]',
          params: { conversationId: conversation.id },
        });
      }}
      accessibilityRole="button"
      accessibilityLabel="Rate this conversation"
    >
      <AppText className="pt-0.5 text-center text-xs text-muted underline">
        {conversation.myRating === undefined
          ? 'How was this conversation?'
          : 'Change how you rated this'}
      </AppText>
    </PressableFeedback>
  );
}

function Bar({ children, padBottom }: { children?: React.ReactNode; padBottom: number }) {
  return (
    <View
      className="gap-2.5 border-t border-border/40 bg-background px-4 pt-3"
      style={{ paddingBottom: padBottom }}
    >
      {children}
    </View>
  );
}

function Copy({ children }: { children: React.ReactNode }) {
  return (
    <AppText className="text-center text-xs leading-5 text-muted">{children}</AppText>
  );
}

function Bold({ children }: { children: React.ReactNode }) {
  return <AppText className="font-semibold text-foreground">{children}</AppText>;
}
