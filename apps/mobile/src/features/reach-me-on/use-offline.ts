import { useConvexConnectionState } from "convex/react";
import { useEffect, useState } from "react";

/** How long the socket must stay down before "Reach me on…" says offline. */
const OFFLINE_GRACE_MS = 1500;

/**
 * Offline only once the Convex socket has been down for a moment, so a cold
 * start or the reconnect after coming back from Telegram doesn't flash
 * "You're offline" or disable the buttons. Back online shows at once.
 */
export function useOffline(): boolean {
	const connected = useConvexConnectionState().isWebSocketConnected;
	const [downLong, setDownLong] = useState(false);

	useEffect(() => {
		if (connected) {
			setDownLong(false);
			return;
		}
		const timer = setTimeout(() => setDownLong(true), OFFLINE_GRACE_MS);
		return () => clearTimeout(timer);
	}, [connected]);

	return !connected && downLong;
}
