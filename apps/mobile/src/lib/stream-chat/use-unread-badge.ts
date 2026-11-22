import { useCallback, useSyncExternalStore } from "react";
import type { StreamChat } from "stream-chat";
import { useStreamStatus } from "@/lib/stream-chat/stream-chat-provider";
import { badgeFromEvents } from "@/lib/stream-chat/unread-badge";

/** Per-client total, keyed by user: the SDK writes `total_unread_count` only at handshake, and
 * a sign-out reconnects the same singleton as someone else. */
const totals = new WeakMap<
	StreamChat,
	{ userId: string | undefined; total: number | null }
>();

function seed(client: StreamChat): number | null {
	const me = client.user;
	return me && "total_unread_count" in me
		? (me.total_unread_count ?? null)
		: null;
}

function totalFor(client: StreamChat): number | null {
	const entry = totals.get(client);
	if (entry && entry.userId === client.userID) {
		return entry.total;
	}
	const total = seed(client);
	totals.set(client, { total, userId: client.userID });
	return total;
}

export function useUnreadBadge(): number | null {
	const { client, status } = useStreamStatus();
	const connected = status === "ready" ? client : null;

	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			if (!connected) {
				return () => {};
			}
			totalFor(connected);
			const { unsubscribe } = connected.on((event) => {
				totals.set(connected, {
					total: badgeFromEvents(totalFor(connected) ?? 0, event),
					userId: connected.userID,
				});
				onStoreChange();
			});
			return unsubscribe;
		},
		[connected]
	);

	return useSyncExternalStore(subscribe, () =>
		connected ? totalFor(connected) : null
	);
}
