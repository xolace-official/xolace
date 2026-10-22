import { useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Button, PressableFeedback, Skeleton, useToast } from 'heroui-native';
import { useMutation, useQuery } from 'convex/react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { AppText } from '@/src/components/shared/app-text';
import { playSoftPress } from '@/src/lib/haptics';
import { XolacerAvatar } from '@/src/features/xolacer-chat/components/xolacer-avatar';
import { RatingPicker } from './rating-stars';

const HEADER_OPTIONS = {
  headerShown: true,
  headerTransparent: true,
  headerTitle: '',
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
} as const;

/**
 * Where a rating is actually given, whatever pointed here: the profile's rate
 * card (the prominent one), the thread overflow menu, or the post-quiet prompt
 * in the status bar.
 *
 * No longer gated on the conversation having wound down — a real back-and-forth
 * is rateable while it is still live (see `canRate`). What has not changed is
 * the promise this screen makes before any star is picked: only the seeker and
 * Xolace ever see the number, and the xolacer sees an aggregate that names no
 * conversation.
 */
export function RateConversationScreen({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const conversation = useQuery(api.xolacerChat.getConversation, {
    conversationId: conversationId as Id<'xolacer_conversations'>,
  });
  const rateConversation = useMutation(api.xolacerChat.rateConversation);
  const [choice, setChoice] = useState<number | undefined>(undefined);

  if (conversation === undefined) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-10">
        <Stack.Screen options={HEADER_OPTIONS} />
        <Skeleton className="h-14.5 w-14.5 rounded-full" />
        <Skeleton className="h-6 w-56 rounded-lg" />
        <Skeleton className="h-10 w-48 rounded-lg" />
      </View>
    );
  }

  // Either the conversation vanished, or there is not enough of it to judge —
  // no honest thing to ask about, so say so rather than show an empty prompt.
  if (conversation === null || !conversation.canRate) {
    return (
      <View className="flex-1 items-center justify-center gap-2 bg-background px-10">
        <Stack.Screen options={HEADER_OPTIONS} />
        <AppText className="text-[15px] font-semibold text-foreground">
          Nothing to rate here
        </AppText>
        <AppText className="text-center text-[13px] leading-5 text-muted">
          Ratings only come from conversations where messages were actually exchanged.
        </AppText>
      </View>
    );
  }

  const rating = choice ?? conversation.myRating;

  const handleSend = () => {
    if (rating === undefined) return;
    playSoftPress();
    rateConversation({ conversationId: conversation.id, rating })
      .then(() => {
        toast.show({ label: 'Thanks — that stays between you and Xolace.' });
        router.back();
      })
      .catch(() => toast.show({ label: "Couldn't send that. Try again." }));
  };

  return (
    <View
      className="flex-1 items-center justify-center gap-4 bg-background px-8"
      style={{ paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 24) }}
    >
      <Stack.Screen options={HEADER_OPTIONS} />

      <XolacerAvatar
        name={conversation.counterpartName}
        photoUrl={conversation.counterpartPhotoUrl}
        size="lg"
      />

      <AppText className="text-center font-serif text-[21px] leading-7 text-foreground">
        How was this conversation?
      </AppText>

      {/* The privacy rule is stated before the stars, not after, so nobody
          answers without knowing what the xolacer will see. */}
      <AppText className="max-w-65 text-center text-[13px] leading-5 text-muted">
        Only you and Xolace see this. {conversation.counterpartName} sees an overall score,
        never which conversation it came from.
      </AppText>

      <View className="py-2">
        <RatingPicker value={rating} onSelect={setChoice} />
      </View>

      <View className="w-full gap-3 pt-2">
        <Button onPress={handleSend} isDisabled={rating === undefined}>
          {conversation.myRating === undefined ? 'Send' : 'Update'}
        </Button>
        <PressableFeedback
          onPress={() => {
            playSoftPress();
            router.back();
          }}
          accessibilityRole="button"
          accessibilityLabel="Skip rating"
        >
          <AppText className="text-center text-[13px] text-muted underline">Skip</AppText>
        </PressableFeedback>
      </View>
    </View>
  );
}
