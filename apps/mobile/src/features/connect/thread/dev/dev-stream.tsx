import { type ReactNode, useEffect, useState } from "react";
import { type Channel, StreamChat } from "stream-chat";
import { Chat } from "stream-chat-expo";
import type { ConnectionModel, Reach } from "@/lib/connection/connection-model";
import { ConnectionContext } from "@/lib/connection/use-connection";
import { useStreamTheme } from "@/lib/stream-chat/stream-theme";
import { NOW, PEOPLE } from "../../dev/fixtures";
import { type DevMessage, ME, streamMessage } from "./dev-messages";

const SETTLE_MS = 400;
const MAYA = { id: PEOPLE.maya, name: "Maya", online: true };
const TYPING_TICK_MS = 1000;
const TYPING_ON = 4;
const TYPING_CYCLE = 7;

export type DevChannelKind = {
	type?: string;
	canSend?: boolean;
	author?: { id: string; name: string; online?: boolean; last_active?: string };
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
	channel.state.members = { [maya.id]: { user: maya, user_id: maya.id } };
	channel.state.addMessagesSorted(
		messages.map((m, i) => streamMessage(m, i, me, maya) as never)
	);
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

export function useDevChannel(
	messages: readonly DevMessage[],
	channelId: string,
	typing = false,
	kind: DevChannelKind = {}
) {
	const [dev] = useState(() => makeClient(messages, channelId, typing, kind));
	return dev;
}

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

const noop = () => undefined;

/** The connection flags held at one reading, so a dev state can show the device offline. */
function heldConnection(reach: Reach): ConnectionModel {
	const flags = {
		cantReachXolace: reach !== "reachable",
		offline: reach === "offline",
	};
	return { flags: () => flags, send: noop, stop: noop, subscribe: () => noop };
}

/** Stream's reading is `online`; `reach`, when given, stands in for the app's own. */
export function DevChat({
	client,
	online,
	reach,
	children,
}: {
	client: StreamChat;
	online: boolean;
	reach?: Reach;
	children: ReactNode;
}) {
	const [connection] = useState(() =>
		reach === undefined ? null : heldConnection(reach)
	);
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
			{connection === null ? (
				children
			) : (
				<ConnectionContext value={connection}>{children}</ConnectionContext>
			)}
		</Chat>
	);
}
