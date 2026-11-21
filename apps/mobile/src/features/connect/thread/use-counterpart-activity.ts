import { useEffect, useState } from "react";
import type { Channel } from "stream-chat";
import type { Activity } from "./thread-model";

export type CounterpartPresence =
	| { online: true }
	| { online: false; lastActive: number | null };

type CounterpartActivity = {
	typing: boolean;
	presence: CounterpartPresence | null;
};

const IDLE: CounterpartActivity = { presence: null, typing: false };

export function sameActivity(a: Activity, b: Activity): boolean {
	if (a.typing !== b.typing) {
		return false;
	}
	if (a.presence === null || b.presence === null) {
		return a.presence === b.presence;
	}
	return (
		a.presence.online === b.presence.online &&
		(a.presence.lastActive ?? null) === (b.presence.lastActive ?? null)
	);
}

export function useCounterpartActivity(
	channel: Channel | null,
	counterpartUserId: string
): CounterpartActivity {
	const [activity, setActivity] = useState<CounterpartActivity>(IDLE);

	useEffect(() => {
		if (!channel) {
			return;
		}
		const read = () => {
			const next: CounterpartActivity = {
				presence: readPresence(channel, counterpartUserId),
				typing: counterpartUserId in channel.state.typing,
			};
			setActivity((prev) => (sameActivity(prev, next) ? prev : next));
		};
		read();

		const subs = [
			channel.on("typing.start", read),
			channel.on("typing.stop", read),
			channel.getClient().on("user.presence.changed", (event) => {
				if (event.user?.id === counterpartUserId) {
					read();
				}
			}),
		];
		return () => subs.forEach((sub) => sub.unsubscribe());
	}, [channel, counterpartUserId]);

	return channel ? activity : IDLE;
}

function readPresence(
	channel: Channel,
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
