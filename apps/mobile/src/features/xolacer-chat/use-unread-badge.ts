import { useCallback, useSyncExternalStore } from "react";
import type { StreamChat } from "stream-chat";
import { useStreamStatus } from "@/features/xolacer-chat/providers/stream-chat-provider";
import { badgeFromEvents } from "@/features/xolacer-chat/unread-badge";

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

/** The one unread number across every conversation, feeding the tab and icon badges. `null`
 * means unknown, not zero: a push-set icon badge stays until Stream says otherwise. */
export function useUnreadBadge(): number | null {
	const { client, status } = useStreamStatus();
	const connected = status === "ready" ? client : null;

	// Stable per client for the same reason as `useConversationUnreadCount`.
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			if (!connected) {
				return () => {};
			}
			totalFor(connected);
			// Always notifies: the first listener to run already updated the map, so
			// skipping "unchanged" would leave every later subscriber never re-rendering.
			// React bails out itself when the snapshot is equal.
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
