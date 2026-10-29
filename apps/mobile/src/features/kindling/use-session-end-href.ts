import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import type { Href } from "expo-router";
import { shouldOfferKindlingAnnouncement } from "@/features/kindling/kindling-announcement";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";

export type SessionEndPath = "solo" | "peers" | "exit";

export const sessionEndHref = (
	path: SessionEndPath,
	sessionId?: string | null
): Href =>
	sessionId
		? `/session-end?path=${path}&sessionId=${sessionId}`
		: `/session-end?path=${path}`;

/** Where a finished path goes next (#458): session-end, or the kindling
 * announcement when the session qualifies. Subscribed from the path screen's
 * mount; if the answer isn't in hand when the activity ends, session-end it is. */
export function useSessionEndHref(sessionId: Id<"sessions"> | string | null) {
	const { isPlus, isResolved } = usePlusEntitlement();
	const qualifies = useQuery(
		api.paths.isKindlingQualifyingSession,
		sessionId ? { sessionId: sessionId as Id<"sessions"> } : "skip"
	);
	const variant = shouldOfferKindlingAnnouncement({
		isPlus,
		isResolved,
		qualifies,
	});

	return (path: SessionEndPath): Href =>
		variant === "none" || !sessionId
			? sessionEndHref(path, sessionId)
			: `/kindling-announcement?variant=${variant}&path=${path}&sessionId=${sessionId}`;
}
