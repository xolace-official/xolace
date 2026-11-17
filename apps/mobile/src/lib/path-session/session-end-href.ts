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

/** Where a finished path goes next: the session end, which carries the kindling
 * offer in its next step (the separate announcement beat, #458, folded into it). */
export function useSessionEndHref(sessionId: Id<"sessions"> | string | null) {
	return (path: SessionEndPath): Href => sessionEndHref(path, sessionId);
}
