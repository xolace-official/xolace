/**
 * A Stream client that never connects, holding a channel filled from fixtures, so a dev state
 * shows the real list, bubbles, reactions and composer with no backend. Its `<Chat>` sits inside
 * the app's; offline it reports the socket down, which is the offline state.
 */
import { type ReactNode, useEffect, useState } from "react";
import { type Channel, StreamChat } from "stream-chat";
import { Chat } from "stream-chat-expo";
import { useStreamTheme } from "@/lib/stream-chat/stream-theme";
import { NOW, PEOPLE } from "../../dev/fixtures";
import { type DevMessage, ME, streamMessage } from "./dev-messages";

const SETTLE_MS = 400;
const MAYA = { id: PEOPLE.maya, name: "Maya", online: true };
/** Live typing: Stream relays the other side's `typing.start` about every second while they
 * type, then one `typing.stop`. Seconds typing, then seconds quiet. */
const TYPING_TICK_MS = 1000;
const TYPING_ON = 4;
const TYPING_CYCLE = 7;

/** The channel the client holds: the thread's messaging channel by default. `canSend: false` is
 * a camper in the Xolace channel; `author` names whoever wrote the messages that aren't yours. */
export type DevChannelKind = {
	type?: string;
	canSend?: boolean;
	author?: { id: string; name: string };
};

function makeClient(
	messages: readonly DevMessage[],
	channelId: string,
	typing: boolean,
	kind: DevChannelKind
) {
	const client = new StreamChat("dev-states-key");
	// `client.channel()` refuses without a user; nothing here ever opens a socket.
	client.userID = ME;
	client.user = { id: ME, name: "You" };
	const maya = kind.author ?? MAYA;
	const channel = client.channel(kind.type ?? "messaging", channelId, {
		members: [ME, maya.id],
	});
	const me = { id: ME, name: "You" };
	// The other side is here: the thread's header reads presence off the channel's members.
	channel.state.members = { [maya.id]: { user: maya, user_id: maya.id } };
	channel.state.addMessagesSorted(
		messages.map((m, i) => streamMessage(m, i, me, maya) as never)
	);
	// What a member of an open thread may do, so the composer is Stream's real one.
	channel.data = {
		...channel.data,
		own_capabilities: [
			...(kind.canSend === false ? [] : ["send-message"]),
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
	channel.sendReaction = quiet;
	channel.deleteReaction = quiet;
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
	typing = false,
	kind: DevChannelKind = {}
) {
	const [dev] = useState(() => makeClient(messages, channelId, typing, kind));
	return dev;
}

/** Maya typing on and off for as long as the state is open, through the client like a socket
 * event, so the header's subscription and Stream's own indicator both hear it. */
export function useDevTyping(
	client: StreamChat,
	channel: Channel,
	live: boolean
) {
	useEffect(() => {
		if (!live) {
			return;
		}
		let tick = 0;
		const id = setInterval(() => {
			const step = tick % TYPING_CYCLE;
			tick += 1;
			if (step <= TYPING_ON) {
				client.dispatchEvent({
					channel_id: channel.id,
					channel_type: channel.type,
					cid: channel.cid,
					type: step < TYPING_ON ? "typing.start" : "typing.stop",
					user: MAYA,
				});
			}
		}, TYPING_TICK_MS);
		return () => clearInterval(id);
	}, [client, channel, live]);
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
