import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { useSessionMode } from "@/context/session-mode-context";
import { mapEntryType } from "@/features/reflect/session-service";
import type { EntryType } from "@/features/reflect/types";
import { useAppStore } from "@/store/store";

// States where turns are relevant (mirror has been delivered at least once)
const TURN_RELEVANT_STATES = new Set([
	"mirror_delivered",
	"confirmed",
	"path_selected",
	"path_in_progress",
	"completed",
]);

/**
 * Maintain a client-side session identifier and expose server-backed session data, derived state, and actions to drive a session lifecycle.
 *
 * @returns An object with session identifiers and state (`sessionId`, `session`, `serverState`, `mirrorText`, `errorMessage`, `isLoading`), turn data (`turns`, `turnsCount`), and action creators for the session lifecycle:
 * - `initiateAndSubmit(rawText, entryType, inputDuration?, freezeOccurred?, freezeDuration?)`
 * - `confirmMirror(confirmationState)`
 * - `completeAsExit()`
 * - `selectPath(pathChosen)`
 * - `startPath(exerciseId?)`
 * - `completePath(pathCompleted)`
 * - `submitRefinement(userFeedback, additionalRawText?)`
 * - `abandon()`
 * - `retry()`
 * - `resetSession()`
 */
export function useSession() {
	const [localSessionId, setLocalSessionId] = useState<Id<"sessions"> | null>(
		null
	);
	const { mode: sessionModeAtHook } = useSessionMode();

	// Derive sessionId: prefer explicitly-set local ID, fall back to server active session
	const activeSession = useQuery(
		api.sessions.getActive,
		localSessionId ? "skip" : undefined
	);
	const sessionId = localSessionId ?? activeSession?._id ?? null;

	const session = useQuery(
		api.sessions.getById,
		sessionId ? { sessionId } : "skip"
	);

	// Only subscribe to turns when the session is in a state where turns matter
	const shouldQueryTurns =
		sessionId != null &&
		session?.state != null &&
		TURN_RELEVANT_STATES.has(session.state);

	const turns = useQuery(
		api.sessionTurns.listBySession,
		shouldQueryTurns ? { sessionId: sessionId! } : "skip"
	);

	// --- Mutations ---
	const initiateMutation = useMutation(api.sessions.initiate);
	const submitInputMutation = useMutation(api.sessions.submitInput);
	const confirmMirrorMutation = useMutation(api.sessions.confirmMirror);
	const selectPathMutation = useMutation(api.sessions.selectPath);
	const startPathMutation = useMutation(api.sessions.startPath);
	const completePathMutation = useMutation(api.sessions.completePath);
	const completeSessionMutation = useMutation(api.sessions.completeSession);
	const submitFeedbackMutation = useMutation(api.sessionTurns.submitFeedback);
	const abandonMutation = useMutation(api.sessions.abandon);
	const retryMutation = useMutation(api.sessions.retrySession);
	const recordEscalationResponseMutation = useMutation(
		api.escalation.recordUserResponse
	);

	// --- Derived state ---
	const turnsCount = turns?.length ?? 0;
	const isLoading = !sessionId && activeSession === undefined;
	const serverState = session?.state ?? null;
	const mirrorText = session?.mirrorText ?? null;
	const errorMessage = session?.errorMessage ?? null;

	// --- Actions ---

	const initiateAndSubmit = useCallback(
		async (
			rawText: string,
			entryType: EntryType,
			inputDuration?: number,
			freezeOccurred = false,
			freezeDuration?: number
		) => {
			const serverEntryType = mapEntryType(entryType);
			// "Reflect on this" (#413): the session remembers the entry it opened on.
			// One session per tap: once a session takes the entry, the prompt is spent.
			// A quote-reply seed outranks the prompt on the card, so that session
			// opened on the reply, not the entry.
			const { pendingEventPrompt: pending, replySeed } = useAppStore.getState();
			const fromEntryId =
				pending && pending.expiresAt > Date.now() && !replySeed
					? pending.fromEntryId
					: undefined;
			const newSessionId = await initiateMutation({
				entryType: serverEntryType,
				fromEntryId,
				sessionMode: sessionModeAtHook,
			});
			if (fromEntryId) {
				useAppStore.getState().setPendingEventPrompt(null);
			}
			setLocalSessionId(newSessionId);

			try {
				await submitInputMutation({
					freezeDuration,
					freezeOccurred,
					inputDuration,
					rawInput: rawText,
					rawInputLength: rawText.length,
					rawText,
					sessionId: newSessionId,
				});
			} catch (error) {
				// Roll back the dangling initiated session
				try {
					await abandonMutation({ sessionId: newSessionId });
				} catch {
					// best-effort cleanup
				}
				setLocalSessionId(null);
				throw error;
			}
		},
		[initiateMutation, submitInputMutation, abandonMutation, sessionModeAtHook]
	);

	const confirmMirror = useCallback(
		async (confirmationState: "confirmed" | "refined" | "gave_up") => {
			if (!sessionId) {
				return;
			}
			await confirmMirrorMutation({ confirmationState, sessionId });
		},
		[sessionId, confirmMirrorMutation]
	);

	const completeAsExit = useCallback(async () => {
		if (!sessionId) {
			return;
		}
		await completeSessionMutation({ sessionId });
	}, [sessionId, completeSessionMutation]);

	const selectPath = useCallback(
		async (pathChosen: "solo" | "peers" | "exit") => {
			if (!sessionId) {
				return;
			}
			await selectPathMutation({ pathChosen, sessionId });
		},
		[sessionId, selectPathMutation]
	);

	const startPath = useCallback(
		async (exerciseId?: string) => {
			if (!sessionId) {
				return;
			}
			await startPathMutation({
				exerciseId: exerciseId as Id<"exercises"> | undefined,
				sessionId,
			});
		},
		[sessionId, startPathMutation]
	);

	const completePath = useCallback(
		async (pathCompleted: boolean) => {
			if (!sessionId) {
				return;
			}
			await completePathMutation({ pathCompleted, sessionId });
		},
		[sessionId, completePathMutation]
	);

	const submitRefinement = useCallback(
		async (
			userFeedback: "not_quite" | "say_more",
			additionalRawText?: string
		) => {
			if (!sessionId) {
				return;
			}
			await submitFeedbackMutation({
				additionalRawText,
				sessionId,
				userFeedback,
				userInput: additionalRawText,
			});
		},
		[sessionId, submitFeedbackMutation]
	);

	const abandon = useCallback(async () => {
		if (!sessionId) {
			return;
		}
		try {
			await abandonMutation({ sessionId });
		} catch {
			// best-effort — session may already be terminal
		}
	}, [sessionId, abandonMutation]);

	// The server reprocesses the input it stored, so this works for a session
	// picked up from getActive too (a talk, or after a restart).
	const retry = useCallback(async () => {
		if (!sessionId) {
			return;
		}
		await retryMutation({ sessionId });
	}, [sessionId, retryMutation]);

	const recordEscalationResponse = useCallback(
		async (userResponse: "engaged" | "dismissed") => {
			if (!sessionId) {
				return;
			}
			await recordEscalationResponseMutation({ sessionId, userResponse });
		},
		[sessionId, recordEscalationResponseMutation]
	);

	const resetSession = useCallback(() => {
		setLocalSessionId(null);
	}, []);

	return {
		abandon,
		completeAsExit,
		completePath,
		confirmMirror,
		errorMessage,
		initiateAndSubmit,
		isLoading,
		mirrorText,
		recordEscalationResponse,
		resetSession,
		retry,
		selectPath,
		serverState,
		session,
		sessionId,
		startPath,
		submitRefinement,
		turns,
		turnsCount,
	};
}
