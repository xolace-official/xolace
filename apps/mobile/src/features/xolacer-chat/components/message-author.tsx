import { createContext, type ReactNode, use, useMemo } from "react";
import {
	MessageAuthor,
	type MessageAuthorProps,
	useMessageContext,
} from "stream-chat-expo";
import { resolveMessageIdentity } from "../utils";
import type { ThreadConversation } from "./thread-screen";

/** The conversation behind the mounted override tree. A context, because `WithComponents` never
 * re-reads its overrides, so a closure would freeze at the first render. */
const ConversationIdentityContext = createContext<{
	conversation: ThreadConversation;
} | null>(null);

/** The conversation behind the currently mounted `WithComponents` override tree. */
export function useConversationIdentity() {
	return use(ConversationIdentityContext);
}

export function ConversationIdentityProvider({
	conversation,
	children,
}: {
	conversation: ThreadConversation;
	children: ReactNode;
}) {
	// Kept despite the React Compiler: a new value object here re-renders every
	// message bubble in the list, and the compiler doesn't stabilize across a
	// context boundary.
	const value = useMemo(() => ({ conversation }), [conversation]);
	return (
		<ConversationIdentityContext.Provider value={value}>
			{children}
		</ConversationIdentityContext.Provider>
	);
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
