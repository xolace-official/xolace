import { useConvex } from "convex/react";
import { useCallback, useSyncExternalStore } from "react";

/** Whether Convex's socket is up. Only the boolean: `useConvexConnectionState` re-renders on
 * every request start and finish. */
export function useConnected() {
	const convex = useConvex();
	const subscribe = useCallback(
		(cb: () => void) => convex.subscribeToConnectionState(cb),
		[convex]
	);
	return useSyncExternalStore(
		subscribe,
		() => convex.connectionState().isWebSocketConnected
	);
}
