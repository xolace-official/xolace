import { useConvex } from "convex/react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const OFFLINE_GRACE_MS = 1500;

/**
 * Offline once Convex's socket has been down a moment, so a cold start or a reconnect doesn't
 * flash it. Back online shows at once. Only the boolean: `useConvexConnectionState` re-renders
 * on every request.
 */
export function useOffline(): boolean {
	const convex = useConvex();
	const subscribe = useCallback(
		(cb: () => void) => convex.subscribeToConnectionState(cb),
		[convex]
	);
	const connected = useSyncExternalStore(
		subscribe,
		() => convex.connectionState().isWebSocketConnected
	);
	const [downLong, setDownLong] = useState(false);
	useEffect(() => {
		if (connected) {
			setDownLong(false);
			return;
		}
		const t = setTimeout(() => setDownLong(true), OFFLINE_GRACE_MS);
		return () => clearTimeout(t);
	}, [connected]);
	return !connected && downLong;
}
