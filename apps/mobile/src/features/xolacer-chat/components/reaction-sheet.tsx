import { useState } from "react";
import { View } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import {
	type MessageUserReactionsProps,
	MessageUserReactionsSelectorItem,
	StreamBottomSheetModalFlatList,
	useComponentsContext,
	useFetchReactions,
	useMessagesContext,
} from "stream-chat-expo";
import { AppText } from "@/components/shared/app-text";

type Reaction = NonNullable<MessageUserReactionsProps["reactions"]>[number];

/** Stream's `MessageUserReactions` rebuilt without its "more emojis" button, a second way past
 * the curated seven (#345) that no theme key or prop hides. */
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
			onSelectReaction: (type: string) =>
				setSelectedReaction((current) => (current === type ? undefined : type)),
			selectedReaction,
		}));

	const { loading, loadNextPage, reactions } = useFetchReactions({
		message,
		reactionType: selectedReaction,
		sort: { created_at: -1 },
	});
	// Caller-supplied rows win over the fetch, as in the SDK's sheet. The cast:
	// `Reaction.id` is typed required though a reaction's user is optional on the wire.
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
				{total} {total === 1 ? "Reaction" : "Reactions"}
			</AppText>
			{/* Row wrapper keeps the horizontal list at its own height; bare in a
        column it takes the sheet's flex and drops the chips to the bottom. */}
			<View className="flex-row">
				<FlatList
					contentContainerClassName="flex-grow gap-2 px-4 py-3"
					data={selector}
					horizontal
					keyExtractor={(item) => item.type}
					renderItem={({ item }) => (
						<MessageUserReactionsSelectorItem {...item} />
					)}
					showsHorizontalScrollIndicator={false}
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
