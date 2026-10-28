import { usePresence } from "@convex-dev/presence/react-native";
import { api } from "@xolace/backend/convex/_generated/api";
import { useConvexAuth } from "convex/react";

/** Must match `PRESENCE_ROOM` in convex/presence.ts. */
const PRESENCE_ROOM = "app";

/** 30s, matching the server; the component times a session out at 2.5x this (~75s). */
const HEARTBEAT_INTERVAL_MS = 30_000;

/** Presence heartbeat at the protected layout root. Gated on `isAuthenticated`: an
 * unauthenticated beat rejects unhandled, uncaught by any boundary. */
export function AppPresence() {
	const { isAuthenticated } = useConvexAuth();
	// Hooks can't be called conditionally, so the gate is a mount boundary.
	return isAuthenticated ? <Heartbeat /> : null;
}

/** Return value discarded: the server's `list` is empty by design. `userId` is ignored
 * server-side; the empty string makes that obvious. */
function Heartbeat() {
	usePresence(api.presence, PRESENCE_ROOM, "", HEARTBEAT_INTERVAL_MS);
	return null;
}
