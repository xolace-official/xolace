import { usePresence } from "@convex-dev/presence/react-native";
import { api } from "@xolace/backend/convex/_generated/api";
import { useConvexAuth } from "convex/react";

const PRESENCE_ROOM = "app";

const HEARTBEAT_INTERVAL_MS = 30_000;

export function AppPresence() {
	const { isAuthenticated } = useConvexAuth();
	return isAuthenticated ? <Heartbeat /> : null;
}

function Heartbeat() {
	usePresence(api.presence, PRESENCE_ROOM, "", HEARTBEAT_INTERVAL_MS);
	return null;
}
