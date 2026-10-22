import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { PressableFeedback } from 'heroui-native';
import { AppText } from '@/src/components/shared/app-text';
import { playSoftPress } from '@/src/lib/haptics';
import { formatLongAgo } from '../format-time';
import { XolacerAvatar } from '@/src/features/xolacer-chat/components/xolacer-avatar';
import { useCounterpartActivity, type CounterpartPresence } from './use-counterpart-activity';
import type { ThreadConversation } from './thread-screen';

/**
 * Once a thread is `open` the chat socket is already live, so a real dot
 * replaces the response-norm copy that used to stand in for it — that norm
 * was written against a promise six volunteers couldn't honour, and a live
 * socket signal is a fact, not a promise. Every other status keeps its own
 * copy; Stream has nothing to say about a request that hasn't been accepted.
 */
function openSubtitle(role: ThreadConversation['role'], activity: {
  typing: boolean;
  presence: CounterpartPresence | null;
}): string {
  const who = role === 'user' ? 'Xolacer' : null;
  if (activity.typing) return who ? `${who} · typing…` : 'typing…';
  if (!activity.presence) return who ? `${who} · usually replies within a day` : 'Usually replies within a day';
  if (activity.presence.online) return who ? `${who} · online` : 'Online';
  const lastActive = activity.presence.lastActive;
  const suffix = lastActive ? `last here ${formatLongAgo(lastActive)}` : 'offline';
  return who ? `${who} · ${suffix}` : suffix;
}

function subtitleFor(conversation: ThreadConversation): string {
  if (conversation.status === 'requested') {
    if (conversation.role !== 'xolacer') return 'Request sent, no reply yet';

    return conversation.origin === 'suggestion'
      ? 'Waiting on you · just after a session'
      : 'Waiting on you';
  }
  if (conversation.status === 'resting') {
    return conversation.lastMessageAt
      ? `Resting · last spoke ${formatLongAgo(conversation.lastMessageAt)}`
      : 'Resting';
  }
  if (conversation.status === 'closed') {
    return conversation.role === 'xolacer'
      ? 'This request is closed'
      : 'Not taking conversations right now';
  }
  return '';
}

/**
 * Rendered into the native stack header's title slot, so it carries identity
 * only — the back affordance, safe area and background are the platform's.
 *
 * Also a sibling of `<Channel>`, not a descendant of it (see thread-screen.tsx)
 * — `useCounterpartActivity` reads the channel directly rather than through
 * Channel-scoped context for that reason.
 */
export function ThreadHeader({ conversation }: { conversation: ThreadConversation }) {
  const router = useRouter();
  const activity = useCounterpartActivity(
    conversation.status === 'open' ? conversation.streamChannelId : undefined,
    conversation.counterpartProfileId,
  );
  const dim = conversation.status !== 'open';
  const subtitle =
    conversation.status === 'open' ? openSubtitle(conversation.role, activity) : subtitleFor(conversation);

  const identity = (
    <View className="flex-row items-center gap-2.5">
      <XolacerAvatar
        name={conversation.counterpartName}
        photoUrl={conversation.counterpartPhotoUrl}
        size="sm"
        muted={dim}
      />
      <View className="min-w-0 shrink">
        <AppText className="text-sm font-semibold text-foreground" numberOfLines={1}>
          {conversation.counterpartName}
        </AppText>
        <AppText className="text-[11px] text-muted mt-px" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
    </View>
  );

  // Only the seeker's side is tappable: the counterpart there is a Xolacer with
  // a public profile. A Xolacer looking at a seeker has nowhere to go.
  if (conversation.role !== 'user') return identity;

  return (
    <PressableFeedback
      onPress={() => {
        playSoftPress();
        router.push({
          pathname: '/xolacer/[profileId]',
          params: { profileId: conversation.counterpartProfileId },
        });
      }}
      accessibilityRole="button"
      accessibilityLabel={`View ${conversation.counterpartName}'s profile`}
    >
      {identity}
    </PressableFeedback>
  );
}
