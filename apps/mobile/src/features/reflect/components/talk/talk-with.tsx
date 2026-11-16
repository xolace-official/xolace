// A talk's mirror says who the talk was with (#601); the typed mirror stays unsigned.

import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AppText } from "@/components/shared/app-text";

export function TalkWith({ sessionId }: { sessionId: Id<"sessions"> | null }) {
	// The reflect screen already holds this subscription.
	const session = useQuery(
		api.sessions.getById,
		sessionId ? { sessionId } : "skip"
	);
	if (session?.entryType !== "talk" || !session.companionName) {
		return null;
	}
	return (
		<AppText className="mb-3 text-muted text-xs">
			From your talk with {session.companionName}
		</AppText>
	);
}
