import { useEffect, useState } from "react";
import type { Channel as StreamChannel } from "stream-chat";
import { hydrateChannelsFromCache } from "@/lib/stream-chat/offline-db";

/** True once the channel holds state: already live, hydrated from the offline db, or watched.
 * Failure resolves too, so Stream's error indicator shows instead of an endless skeleton. */
export function useLocalChannelState(channel: StreamChannel) {
	// Only the settled cid: success just needs the re-render, and the cid makes
	// a channel swap re-gate instead of inheriting the verdict.
	const [settledCid, setSettledCid] = useState<string | null>(null);

	useEffect(() => {
		if (channel.initialized || channel.offlineMode) {
			return;
		}
		let alive = true;
		const client = channel.getClient();
		hydrateChannelsFromCache(client, [channel.id as string])
			.then(() => {
				if (channel.offlineMode) {
					return;
				}
				return channel.watch({ presence: true });
			})
			.catch((error) =>
				console.error("[xolacer-chat] channel load failed", error)
			)
			.finally(() => {
				if (alive) {
					setSettledCid(channel.cid);
				}
			});
		return () => {
			alive = false;
		};
	}, [channel]);

	return (
		channel.initialized || channel.offlineMode || settledCid === channel.cid
	);
}
