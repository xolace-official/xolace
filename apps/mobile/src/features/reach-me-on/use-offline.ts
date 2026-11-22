import { useConvexConnectionState } from "convex/react";
import { useEffect, useState } from "react";

const OFFLINE_GRACE_MS = 1500;

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
