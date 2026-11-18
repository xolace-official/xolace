import { createContext, type ReactNode, use, useMemo } from "react";
import {
	MessageAuthor,
	type MessageAuthorProps,
	useMessageContext,
} from "stream-chat-expo";
import { resolveMessageIdentity } from "../../chat-rules";
import type { ThreadConversation } from "../thread-model";

/** Who's who in the thread: the only fields Stream's overrides read (the author avatar here, the
 * crisis card, the quoted reply, the reaction list and the typing indicator). */
type ConversationIdentity = Pick<
	ThreadConversation,
	"role" | "counterpartProfileId" | "counterpartName" | "counterpartPhotoUrl"
>;

/** A context, because `WithComponents` never re-reads its overrides, so a closure would freeze at
 * the first render. Its own context rather than `useThreadScreen`, and only these four fields
 * rather than the conversation: the conversation is a new object on every send
 * (`touchConversation` patches `lastMessageAt`) and on every render while it's seeded from the
 * list, and each new value would re-render every bubble that reads it. */
const ConversationIdentityContext = createContext<ConversationIdentity | null>(
	null
);

/** Who's who behind the currently mounted `WithComponents` override tree. */
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
	const { role, counterpartProfileId, counterpartName, counterpartPhotoUrl } =
		conversation;
	// Kept despite the React Compiler: the value must keep its identity until one of these four
	// fields changes, not the conversation object (see the context), and the compiler would key
	// it on `conversation`.
	const value = useMemo(
		() => ({
			counterpartName,
			counterpartPhotoUrl,
			counterpartProfileId,
			role,
		}),
		[counterpartName, counterpartPhotoUrl, counterpartProfileId, role]
	);
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
		? resolveMessageIdentity(message.user?.id, identity)
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
