import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import type { Href } from "expo-router";

export type SessionEndPath = "solo" | "peers" | "exit";

const sessionEndHref = (
	path: SessionEndPath,
	sessionId?: string | null
): Href =>
	sessionId
		? `/session-end?path=${path}&sessionId=${sessionId}`
		: `/session-end?path=${path}`;

export function useSessionEndHref(sessionId: Id<"sessions"> | string | null) {
	return (path: SessionEndPath): Href => sessionEndHref(path, sessionId);
}
