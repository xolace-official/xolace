/**
 * A Stream client that never connects, holding a channel filled from fixtures, so a dev state
 * shows the real list, bubbles, reactions and composer with no backend. Its `<Chat>` sits inside
 * the app's; offline it reports the socket down, which is the offline state.
 */
import { type ReactNode, useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import { Chat } from "stream-chat-expo";
import { useStreamTheme } from "@/lib/stream-chat/stream-theme";
import { NOW, PEOPLE } from "../../dev/fixtures";
import { MINUTE } from "./thread-fixtures";

const ME = "profile_me";
const SETTLE_MS = 400;

export type DevMessage = {
	mine: boolean;
	text: string;
	/** Minutes before now. */
	ago: number;
	failed?: boolean;
	reaction?: string;
};

function makeClient(
	messages: readonly DevMessage[],
	channelId: string,
	typing: boolean
) {
	const client = new StreamChat("dev-states-key");
	// `client.channel()` refuses without a user; nothing here ever opens a socket.
	client.userID = ME;
	client.user = { id: ME, name: "You" };
	const channel = client.channel("messaging", channelId, {
		members: [ME, PEOPLE.maya],
	});
	const me = { id: ME, name: "You" };
	const maya = { id: PEOPLE.maya, name: "Maya" };
	channel.state.addMessagesSorted(
		messages.map((m, i) => {
			const at = new Date(NOW - m.ago * MINUTE).toISOString();
			return {
				created_at: at,
				id: `dev-${i}`,
				latest_reactions: m.reaction
					? [{ created_at: at, type: m.reaction, user: maya, user_id: maya.id }]
					: [],
				reaction_groups: m.reaction
					? {
							[m.reaction]: {
								count: 1,
								first_reaction_at: at,
								last_reaction_at: at,
								sum_scores: 1,
							},
						}
					: {},
				status: m.failed ? "failed" : "received",
				text: m.text,
				type: m.failed ? "error" : "regular",
				updated_at: at,
				user: m.mine ? me : maya,
			} as never;
		})
	);
	// What a member of an open thread may do, so the composer is Stream's real one.
	channel.data = {
		...channel.data,
		own_capabilities: [
			"send-message",
			"send-reaction",
			"read-events",
			"typing-events",
			"update-own-message",
			"delete-own-message",
			"flag-message",
		],
	};
	if (typing) {
		channel.state.typing = {
			[maya.id]: {
				created_at: new Date(NOW).toISOString(),
				type: "typing.start",
				user: maya,
			},
		} as never;
	}
	channel.initialized = true;
	channel.offlineMode = true;
	// Nothing reaches Stream's servers: the calls a mounted list and Chat make resolve quietly.
	const quiet = () => Promise.resolve({} as never);
	client.getAppSettings = quiet;
	channel.markRead = quiet;
	channel.watch = quiet;
	channel.query = quiet;
	channel.keystroke = quiet;
	channel.stopTyping = quiet;
	return { channel, client };
}

/** Builds the client once per state and hands its channel to the screen. */
export function useDevChannel(
	messages: readonly DevMessage[],
	channelId: string,
	typing = false
) {
	const [dev] = useState(() => makeClient(messages, channelId, typing));
	return dev;
}

export function DevChat({
	client,
	online,
	children,
}: {
	client: StreamChat;
	online: boolean;
	children: ReactNode;
}) {
	// The socket never opens: say it did, or (the offline state) say it dropped and settled
	// offline. After Stream's own first NetInfo read, which would say online.
	useEffect(() => {
		const id = setTimeout(() => {
			client.dispatchEvent({ online, type: "connection.changed" });
			if (!online) {
				client.dispatchEvent({ type: "connection.recovered" });
			}
		}, SETTLE_MS);
		return () => clearTimeout(id);
	}, [client, online]);
	const style = useStreamTheme();
	return (
		<Chat client={client} style={style}>
			{children}
		</Chat>
	);
}
