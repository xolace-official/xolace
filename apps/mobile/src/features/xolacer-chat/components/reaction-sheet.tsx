import { useState } from 'react';
import { View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import {
  MessageUserReactionsSelectorItem,
  StreamBottomSheetModalFlatList,
  useComponentsContext,
  useFetchReactions,
  useMessagesContext,
  type MessageUserReactionsProps,
} from 'stream-chat-expo';
import { AppText } from '@/src/components/shared/app-text';

type Reaction = NonNullable<MessageUserReactionsProps['reactions']>[number];

/**
 * The "who reacted" sheet behind a reaction chip. A rebuild of Stream's
 * `MessageUserReactions` minus its "more emojis" button: that button opens the
 * full unicode picker, a second way past the curated seven (#345) — the pick
 * lands on the message as a type nothing here can render, so the chip shows
 * "?". The long-press row's "+" is hidden by theme; this one is an untitled
 * FlatList header with no theme key or prop, hence the rebuild.
 */
export function ConversationReactionSheet({
  message,
  reactions: propReactions,
  selectedReaction: initial,
}: MessageUserReactionsProps) {
  const { supportedReactions } = useMessagesContext();
  const { MessageUserReactionsItem } = useComponentsContext();
  const [selectedReaction, setSelectedReaction] = useState(initial);

  const counts = message?.reaction_counts ?? {};
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const selector = (supportedReactions ?? [])
    .filter((r) => counts[r.type])
    .map((r) => ({
      ...r,
      count: String(counts[r.type]),
      selectedReaction,
      onSelectReaction: (type: string) =>
        setSelectedReaction((current) => (current === type ? undefined : type)),
    }));

  const { loading, loadNextPage, reactions } = useFetchReactions({
    message,
    reactionType: selectedReaction,
    sort: { created_at: -1 },
  });
  // Caller-supplied rows win over the fetch, as in the SDK's own sheet. Same
  // shape and cast too: `Reaction.id` is typed as required though a reaction's
  // user is optional on the wire.
  const rows =
    propReactions ??
    (reactions.map((r) => ({
      id: r.user?.id,
      image: r.user?.image,
      name: r.user?.name,
      type: r.type,
    })) as Reaction[]);

  return (
    <View className="flex-1">
      <AppText className="py-2 text-center font-semibold">
        {total} {total === 1 ? 'Reaction' : 'Reactions'}
      </AppText>
      {/* Row wrapper keeps the horizontal list at its own height; bare in a
        column it takes the sheet's flex and drops the chips to the bottom. */}
      <View className="flex-row">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="flex-grow gap-2 px-4 py-3"
          data={selector}
          keyExtractor={(item) => item.type}
          renderItem={({ item }) => <MessageUserReactionsSelectorItem {...item} />}
        />
      </View>
      {loading ? null : (
        <StreamBottomSheetModalFlatList
          data={rows}
          keyExtractor={(item) => `${item.id}-${item.type}`}
          onEndReached={loadNextPage}
          renderItem={({ item }) => (
            <MessageUserReactionsItem
              reaction={item}
              supportedReactions={supportedReactions ?? []}
            />
          )}
        />
      )}
    </View>
  );
}
