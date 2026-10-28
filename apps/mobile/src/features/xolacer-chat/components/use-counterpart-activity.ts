import { useEffect, useState } from "react";
import type { StreamChat } from "stream-chat";
import { useStreamStatus } from "../providers/stream-chat-provider";

export type CounterpartPresence =
	| { online: true }
	| { online: false; lastActive: number | null };

type CounterpartActivity = {
	typing: boolean;
	presence: CounterpartPresence | null;
};

const IDLE: CounterpartActivity = { presence: null, typing: false };

/** Presence and typing read off the cached channel state, since the header is a sibling of
 * `<Channel>`; needs a client with a user, as `client.channel()` throws otherwise. */
export function useCounterpartActivity(
	streamChannelId: string | undefined,
	counterpartUserId: string
): CounterpartActivity {
	const [activity, setActivity] = useState<CounterpartActivity>(IDLE);
	const { client } = useStreamStatus();

	useEffect(() => {
		if (!(client && streamChannelId)) {
			return;
		}
		const channel = client.channel("messaging", streamChannelId);

		const read = () =>
			setActivity({
				presence: readPresence(channel, counterpartUserId),
				typing: counterpartUserId in channel.state.typing,
			});
		read();

		const subs = [
			channel.on("typing.start", read),
			channel.on("typing.stop", read),
			client.on("user.presence.changed", (event) => {
				if (event.user?.id === counterpartUserId) {
					read();
				}
			}),
		];
		return () => subs.forEach((sub) => sub.unsubscribe());
	}, [client, streamChannelId, counterpartUserId]);

	// Derived, not synced: no client/channel means IDLE regardless of what the
	// last subscription left behind.
	return client && streamChannelId ? activity : IDLE;
}

function readPresence(
	channel: ReturnType<StreamChat["channel"]>,
	counterpartUserId: string
): CounterpartPresence | null {
	const user = channel.state.members[counterpartUserId]?.user;
	if (!user) {
		return null;
	}
	if (user.online) {
		return { online: true };
	}
	return {
		lastActive: user.last_active ? new Date(user.last_active).getTime() : null,
		online: false,
	};
}
