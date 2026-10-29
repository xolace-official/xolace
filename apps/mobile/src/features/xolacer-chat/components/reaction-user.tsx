import { Pressable, View } from "react-native";
import {
	MessageUserReactionsAvatar,
	type MessageUserReactionsProps,
	useChatContext,
	useMessageContext,
} from "stream-chat-expo";
import { AppText } from "@/components/shared/app-text";
import { useConversationIdentity } from "@/features/xolacer-chat/components/message-author";
import { resolveMessageIdentity } from "@/features/xolacer-chat/utils";

type Reaction = NonNullable<MessageUserReactionsProps["reactions"]>[number];

/** One row of the "who reacted" sheet, rebuilt since the SDK does not export its row. Own
 * reactions read "You"; a sender who is neither self nor counterpart gets no row. */
export function ConversationReactionUser({
	reaction,
	supportedReactions,
}: {
	reaction: Reaction;
	supportedReactions: {
		type: string;
		Icon: React.ComponentType<{ size?: number }>;
	}[];
}) {
	const { client } = useChatContext();
	const { handleReaction } = useMessageContext();
	const identity = useConversationIdentity();

	const isOwn = reaction.id === client.userID;
	const counterpart =
		!isOwn && identity
			? resolveMessageIdentity(reaction.id, identity.conversation)
			: null;
	if (!(isOwn || counterpart)) {
		return null;
	}

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
				<AppText numberOfLines={1}>{isOwn ? "You" : shown.name}</AppText>
				{isOwn ? (
					<AppText className="text-muted text-xs">Tap to remove</AppText>
				) : null}
			</View>
			{Icon ? <Icon size={24} /> : null}
		</Pressable>
	);
}
