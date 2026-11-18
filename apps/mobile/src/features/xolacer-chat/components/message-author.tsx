import { createContext, type ReactNode, use, useMemo } from "react";
import {
	MessageAuthor,
	type MessageAuthorProps,
	useMessageContext,
} from "stream-chat-expo";
import { resolveMessageIdentity } from "../utils";

/** The parts of a conversation the overrides read. */
type ThreadConversation = {
	counterpartProfileId: string;
	counterpartName: string;
	counterpartPhotoUrl?: string;
	role: "user" | "xolacer";
};

/** The conversation behind the mounted override tree. A context, because `WithComponents` never
 * re-reads its overrides, so a closure would freeze at the first render. */
const ConversationIdentityContext = createContext<{
	conversation: ThreadConversation;
} | null>(null);

/** The conversation behind the currently mounted `WithComponents` override tree. */
export function useConversationIdentity() {
	return use(ConversationIdentityContext);
}

/** Per-message avatar sourced from the conversation (see `resolveMessageIdentity`), via the
 * SDK's `MessageAuthor` with a patched `message`; the explicit prop wins over context. */
export function ConversationMessageAuthor(props: MessageAuthorProps) {
	const { message } = useMessageContext();
	const identity = useConversationIdentity();

	const override = identity
		? resolveMessageIdentity(message.user?.id, identity.conversation)
		: null;
	if (!(override && message.user)) {
		return <MessageAuthor {...props} />;
	}

	return (
		<MessageAuthor
			{...props}
			message={{
				...message,
				user: { ...message.user, image: override.image, name: override.name },
			}}
		/>
	);
}
