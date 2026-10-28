import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useRef } from "react";

/** Active session plus `startPath` / `completePath`. Both are serialized through one busy flag;
 * a call while busy returns false. */
export function usePathSession() {
	const activeSession = useQuery(api.sessions.getActive);
	const startPathMutation = useMutation(api.sessions.startPath);
	const completePathMutation = useMutation(api.sessions.completePath);
	const busyRef = useRef(false);

	const sessionId = activeSession?._id ?? null;
	const session = activeSession;
	const isLoading = activeSession === undefined;

	/** Called on mount from path screens; selectPath already ran before navigation. */
	const startPath = useCallback(
		async (exerciseId?: Id<"exercises">): Promise<boolean> => {
			if (!sessionId || busyRef.current) {
				return false;
			}
			if (session?.state !== "path_selected") {
				return false;
			}
			busyRef.current = true;
			try {
				await startPathMutation({ exerciseId, sessionId });
				return true;
			} catch {
				return false;
			} finally {
				busyRef.current = false;
			}
		},
		[sessionId, session?.state, startPathMutation]
	);

	/** Marks the session completed before navigating to session-end, so it survives the app
	 * closing there. */
	const completePath = useCallback(
		async (pathCompleted: boolean): Promise<boolean> => {
			if (!sessionId || busyRef.current) {
				return false;
			}
			const s = session?.state;
			if (
				s !== "path_in_progress" &&
				s !== "path_selected" &&
				s !== "confirmed"
			) {
				return false;
			}
			busyRef.current = true;
			try {
				await completePathMutation({ pathCompleted, sessionId });
				return true;
			} catch {
				return false;
			} finally {
				busyRef.current = false;
			}
		},
		[sessionId, session?.state, completePathMutation]
	);

	return {
		completePath,
		isLoading,
		session,
		sessionId,
		startPath,
	};
}
