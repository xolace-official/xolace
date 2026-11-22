import { createContext, type ReactNode, use, useMemo } from "react";
import {
	MessageAuthor,
	type MessageAuthorProps,
	useMessageContext,
} from "stream-chat-expo";
import { resolveMessageIdentity } from "../../chat-rules";
import type { ThreadConversation } from "../thread-model";

type ConversationIdentity = Pick<
	ThreadConversation,
	"role" | "counterpartProfileId" | "counterpartName" | "counterpartPhotoUrl"
>;

const ConversationIdentityContext = createContext<ConversationIdentity | null>(
	null
);

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
