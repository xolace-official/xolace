import type { MessageComposerState } from "stream-chat";
import {
	Reply,
	type ReplyProps,
	useMessageComposer,
	useMessageContext,
	useStateStore,
} from "stream-chat-expo";
import { useConversationIdentity } from "@/features/xolacer-chat/components/message-author";
import { resolveMessageIdentity } from "@/features/xolacer-chat/utils";

const quotedMessageSelector = (state: MessageComposerState) => ({
	quotedMessage: state.quotedMessage,
});

/** Quoted-reply preview with conversation-sourced identity (swipe-to-reply bypasses the action
 * list). Passed as `quotedMessage`, which `Reply` spreads last, so it wins over its own
 * lookup. */
export function ConversationReply(props: ReplyProps) {
	const { message } = useMessageContext();
	const messageComposer = useMessageComposer();
	const { quotedMessage } = useStateStore(
		messageComposer.state,
		quotedMessageSelector
	);
	const identity = useConversationIdentity();

	const quoted =
		props.quotedMessage ??
		((message
			? message.quoted_message
			: quotedMessage) as ReplyProps["quotedMessage"]);

	const override =
		identity && quoted?.user
			? resolveMessageIdentity(quoted.user.id, identity.conversation)
			: null;
	if (!(override && quoted?.user)) {
		return <Reply {...props} />;
	}

	return (
		<Reply
			{...props}
			quotedMessage={{
				...quoted,
				user: { ...quoted.user, image: override.image, name: override.name },
			}}
		/>
	);
}
