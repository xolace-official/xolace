import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { specialtyListensTo } from "@xolace/backend/convex/lib/specialties";
import { useAction, useConvexAuth } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useState } from "react";
import type { ListenerCard } from "./session-end-data";

const MATCH_WAIT_MS = 2000;

type Suggestion = FunctionReturnType<
	typeof api.ai.xolacers.suggest.sessionSuggestion
>;

export type ListenerMatch = {
	status: "pending" | "found" | "none";
	card: ListenerCard | null;
	profile: { profileId: string; specialty: string } | null;
};

export function useListenerMatch(
	sessionId: Id<"sessions"> | null
): ListenerMatch {
	const { isAuthenticated } = useConvexAuth();
	const fetchSuggestion = useAction(api.ai.xolacers.suggest.sessionSuggestion);
	const [suggestion, setSuggestion] = useState<Suggestion | undefined>(
		sessionId ? undefined : null
	);

	useEffect(() => {
		if (!(sessionId && isAuthenticated)) {
			return;
		}
		let live = true;
		fetchSuggestion({ sessionId })
			.then(
				(s) => live && setSuggestion((prev) => (prev === undefined ? s : prev))
			)
			.catch(() => live && setSuggestion((prev) => prev ?? null));
		return () => {
			live = false;
		};
	}, [sessionId, isAuthenticated, fetchSuggestion]);

	useEffect(() => {
		const timer = setTimeout(
			() => setSuggestion((prev) => prev ?? null),
			MATCH_WAIT_MS
		);
		return () => clearTimeout(timer);
	}, []);

	if (suggestion === undefined) {
		return { card: null, profile: null, status: "pending" };
	}
	if (suggestion === null) {
		return { card: null, profile: null, status: "none" };
	}
	return {
		card: {
			id: suggestion.xolacerProfileId,
			listensTo: specialtyListensTo(suggestion.specialty),
			name: suggestion.displayName,
			photoUrl: suggestion.photoUrl,
			present: suggestion.present ?? false,
			rating: suggestion.rating,
		},
		profile: {
			profileId: suggestion.xolacerProfileId,
			specialty: suggestion.specialty,
		},
		status: "found",
	};
}
