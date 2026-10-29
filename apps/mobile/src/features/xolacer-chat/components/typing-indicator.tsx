import { useTypingContext } from "stream-chat-expo";
import { AppText } from "@/components/shared/app-text";
import { useConversationIdentity } from "@/features/xolacer-chat/components/message-author";
import { resolveMessageIdentity } from "@/features/xolacer-chat/utils";

/** Replaces Stream's `TypingIndicator` (raw Stream avatar, no override slot). Identity comes
 * from `resolveMessageIdentity`; Stream already filters the local user out before this mounts. */
export function ConversationTypingIndicator() {
	const { typing } = useTypingContext();
	const identity = useConversationIdentity();
	if (!identity) {
		return null;
	}

	const counterpart = Object.values(typing)
		.map((event) =>
			resolveMessageIdentity(event.user?.id, identity.conversation)
		)
		.find((resolved) => resolved !== null);
	if (!counterpart) {
		return null;
	}

	return (
		<AppText className="text-muted text-xs">
			{counterpart.name} is typing…
		</AppText>
	);
}
