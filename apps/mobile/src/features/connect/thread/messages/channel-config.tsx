import type { LocalMessage } from "stream-chat";
import type {
	MessageActionsParams,
	MessageActionType,
	ReactionData,
} from "stream-chat-expo";
import { messageActions as defaultMessageActions } from "stream-chat-expo";
import { AppText } from "@/components/shared/app-text";
import { REACTIONS } from "../../reactions";
import { ChannelErrorIndicator } from "./connection-strip";
import { ConversationMessageSystem } from "./crisis-card";
import { ConversationMessageAuthor } from "./message-identity";
import { ConversationReply } from "./quoted-reply";
import { ConversationReactionSheet } from "./reaction-sheet";
import { ConversationReactionUser } from "./reaction-user";
import { ConversationTypingIndicator } from "./typing-indicator";

export const SUPPORTED_REACTIONS: ReactionData[] = REACTIONS.map(
	([type, emoji]) => ({
		Icon: ({ size = 24 }) => (
			<AppText style={{ fontSize: size * 0.8, lineHeight: size }}>
				{emoji}
			</AppText>
		),
		isMain: true,
		type,
	})
);

export const TEXT_ONLY_CAPABILITIES = { uploadFile: false };

export const CHANNEL_ROOT_PROPS = { style: { flex: 1 } };

export const COMPONENT_OVERRIDES = {
	MessageAuthor: ConversationMessageAuthor,
	MessageSystem: ConversationMessageSystem,
	MessageUserReactions: ConversationReactionSheet,
	MessageUserReactionsItem: ConversationReactionUser,
	NetworkDownIndicator: ChannelErrorIndicator,
	Reply: ConversationReply,
	TypingIndicator: ConversationTypingIndicator,
};

const ALLOWED_ACTIONS = new Set([
	"copyMessage",
	"editMessage",
	"deleteMessage",
	"flagMessage",
	"retry",
]);

export function minimalMessageActions(
	params: MessageActionsParams,
	onFlag: (message: LocalMessage) => void
): MessageActionType[] {
	return defaultMessageActions(params)
		.filter((action) => ALLOWED_ACTIONS.has(action.actionType))
		.map((action) =>
			action.actionType === "flagMessage"
				? {
						...action,
						action: () => {
							params.dismissOverlay();
							onFlag(params.message);
						},
						title: "Flag message",
					}
				: action
		);
}
