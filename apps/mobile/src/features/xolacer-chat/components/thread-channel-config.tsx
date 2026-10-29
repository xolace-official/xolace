import type { LocalMessage } from "stream-chat";
import type {
	MessageActionsParams,
	MessageActionType,
	ReactionData,
} from "stream-chat-expo";
import { messageActions as defaultMessageActions } from "stream-chat-expo";
import { AppText } from "@/components/shared/app-text";
import { ConversationMessageSystem } from "./crisis-resources-card";
import { ConversationMessageAuthor } from "./message-author";
import { ChannelErrorIndicator } from "./offline-strip";
import { ConversationReply } from "./quoted-reply";
import { ConversationReactionSheet } from "./reaction-sheet";
import { ConversationReactionUser } from "./reaction-user";
import { ConversationTypingIndicator } from "./typing-indicator";

// Configures the Stream `<Channel>` in thread-messages.tsx. Text plus a curated
// reaction set, no thread replies, no attachments: a deliberate small surface,
// not a capability gap.

/** The seven reactions (#345), in picker order. `isMain` puts each in the long-press row; the
 * SDK's "+" for more is hidden in `useStreamTheme`. */
export const SUPPORTED_REACTIONS: ReactionData[] = (
	[
		["hug", "🫂"],
		["love", "❤️"],
		["thanks", "🙏"],
		["growth", "🌱"],
		["fire", "🔥"],
		["smile", "😊"],
		["laugh", "😂"],
	] as const
).map(([type, emoji]) => ({
	Icon: ({ size = 24 }) => (
		<AppText style={{ fontSize: size * 0.8, lineHeight: size }}>
			{emoji}
		</AppText>
	),
	isMain: true,
	type,
}));

/** Denying `uploadFile` removes the composer's attachment "+"; capabilities merge per key, so
 * the rest stay intact. */
export const TEXT_ONLY_CAPABILITIES = { uploadFile: false };

/** `Channel`'s root has no height of its own and its child uses `height: '100%'`, which
 * resolves to `auto`; without `flex: 1` here a long thread pushes the composer off screen. */
export const CHANNEL_ROOT_PROPS = { style: { flex: 1 } };

/** Rule: any Stream component that renders a user's name or image must be overridden here and
 * source identity from `resolveMessageIdentity`; the Stream user record is pseudonymous and
 * shared, so it leaks by default. */
export const COMPONENT_OVERRIDES = {
	MessageAuthor: ConversationMessageAuthor,
	// The resources card (#344), rendered by kind. Not an identity override.
	MessageSystem: ConversationMessageSystem,
	// Rebuilt without the SDK's "more emojis" button, which no theme key hides.
	MessageUserReactions: ConversationReactionSheet,
	// The "who reacted" row behind a reaction chip (#345): an identity override.
	MessageUserReactionsItem: ConversationReactionUser,
	NetworkDownIndicator: ChannelErrorIndicator,
	Reply: ConversationReply,
	TypingIndicator: ConversationTypingIndicator,
};

// Subtractive on purpose: building the array by hand skips Stream's gating.
// Dropping `quotedReply` does not remove quoted replies; swipe-to-reply
// bypasses this list and `ConversationReply` corrects its identity.
const ALLOWED_ACTIONS = new Set([
	"copyMessage",
	"editMessage",
	"deleteMessage",
	"flagMessage",
	"retry",
]);

/** Stream's actions filtered to `ALLOWED_ACTIONS`. `flagMessage` keeps the SDK's gating but
 * routes to `useFlagMessage`, which also writes the concern tray (docs/bug-log.md 2026-08-17
 * for the iOS Edit history). */
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
