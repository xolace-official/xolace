import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { createPathFlight } from "./path-flight";

export function usePathSession() {
	const activeSession = useQuery(api.sessions.getActive);
	const startPathMutation = useMutation(api.sessions.startPath);
	const completePathMutation = useMutation(api.sessions.completePath);
	const [flight] = useState(createPathFlight);

	const sessionId = activeSession?._id ?? null;
	const session = activeSession;
	const isLoading = activeSession === undefined;

	const startPath = useCallback(
		(exerciseId?: Id<"exercises">): Promise<boolean> => {
			if (!sessionId || session?.state !== "path_selected") {
				return Promise.resolve(false);
			}
			return flight.start(() => startPathMutation({ exerciseId, sessionId }));
		},
		[flight, sessionId, session?.state, startPathMutation]
	);

	const completePath = useCallback(
		(pathCompleted: boolean): Promise<boolean> => {
			const s = session?.state;
			if (
				!sessionId ||
				(s !== "path_in_progress" && s !== "path_selected" && s !== "confirmed")
			) {
				return Promise.resolve(false);
			}
			return flight.complete(() =>
				completePathMutation({ pathCompleted, sessionId })
			);
		},
		[flight, sessionId, session?.state, completePathMutation]
	);

	return {
		completePath,
		isLoading,
		session,
		sessionId,
		startPath,
	};
}
