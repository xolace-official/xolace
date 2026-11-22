import { usePresence } from "@convex-dev/presence/react-native";
import { api } from "@xolace/backend/convex/_generated/api";
import { PRESENCE_HEARTBEAT_MS, PRESENCE_ROOM } from "@xolace/backend/shared";
import { useConvexAuth } from "convex/react";

export function AppPresence() {
	const { isAuthenticated } = useConvexAuth();
	return isAuthenticated ? <Heartbeat /> : null;
}

function Heartbeat() {
	usePresence(api.presence, PRESENCE_ROOM, "", PRESENCE_HEARTBEAT_MS);
	return null;
}
