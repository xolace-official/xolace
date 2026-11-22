import { useAuth } from "@clerk/expo";
import {
	REFINEMENT_MAX_TURNS,
	type SessionErrorCode,
} from "@xolace/backend/shared";
// AppMetrics, not Observe: on Android `Observe.logEvent` resolves to undefined
// (the host object answers `'logEvent' in target` without exposing the method).
import { AppMetrics } from "expo-observe";
import { usePostHog } from "posthog-react-native";
import {
	useCallback,
	useEffect,
	useEffectEvent,
	useReducer,
	useRef,
	useState,
} from "react";
import {
	clearReflectDraft,
	onReflectDraftWiped,
	readReflectDraft,
	usePersistReflectDraft,
} from "@/features/reflect/reflect-draft";
import {
	extractErrorMessage,
	isMaxRefinementError,
	projectScreen,
} from "@/features/reflect/session/session-service";
import type {
	FeedbackType,
	ReflectionAction,
	ReflectionStateName,
} from "@/features/reflect/session/types";
import { useSession } from "@/features/reflect/session/use-session";
import { useDictation } from "@/features/reflect/write/dictation/use-dictation";
import { trackFirstReflection } from "@/lib/intake-analytics";
import { initialState, timedReducer } from "./reflection-reducer";

const MIRROR_SCREENS: ReadonlySet<ReflectionStateName> = new Set([
	"mirror",
	"clarify",
	"gave-up",
	"path-selection",
	"escalation",
]);

export function useReflectionMachine() {
	const { userId } = useAuth();
	const [state, dispatchAt] = useReducer(timedReducer, initialState, (s) => ({
		...s,
		entryText: readReflectDraft(userId),
	}));
	// Stable like a reducer's dispatch: this hook bails out of the compiler (try/finally),
	// so the callbacks below list their deps by hand.
	const dispatch = useCallback(
		(action: ReflectionAction) => dispatchAt({ ...action, at: Date.now() }),
		[]
	);
	const [draftOwner, setDraftOwner] = useState(userId);
	if (draftOwner !== userId) {
		setDraftOwner(userId);
		dispatch({ entryText: readReflectDraft(userId), type: "ACCOUNT_SWITCHED" });
	}
	const posthog = usePostHog();
	const voicePrefixRef = useRef("");
	const {
		isRecording,
		plusDictation,
		dictationUpsell,
		startRecording,
		stopRecording,
		abortRecording,
	} = useDictation(
		(text) => dispatch({ text, type: "VOICE_APPEND" }),
		(partial) => {
			const prefix = voicePrefixRef.current;
			const text = prefix ? `${prefix} ${partial}` : partial;
			dispatch({ text, type: "VOICE_TRANSCRIPT" });
		}
	);
	usePersistReflectDraft(userId, state.entryText, state.screen);
	useEffect(
		() => onReflectDraftWiped(() => dispatch({ type: "DISCARD_DRAFT" })),
		[]
	);
	const {
		sessionId,
		session,
		serverState,
		mirrorText,
		errorCode,
		errorMessage,
		turnsCount,
		isLoading,
		initiateAndSubmit,
		confirmMirror,
		selectPath,
		completeAsExit,
		submitRefinement,
		recordEscalationResponse,
		abandon,
		retry,
		resetSession,
	} = useSession();

	const prevServerStateRef = useRef<string | null>(null);
	const shownSessionRef = useRef<typeof sessionId>(null);
	const submitTimestampRef = useRef<number | null>(null);
	const busyRef = useRef(false);

	const clearRefs = useCallback(() => {
		prevServerStateRef.current = null;
		submitTimestampRef.current = null;
		busyRef.current = false;
		voicePrefixRef.current = "";
	}, []);

	const dispatchError = useCallback(
		(message: string, code?: SessionErrorCode) => {
			dispatch({ code, message, type: "SESSION_ERROR" });
			posthog.capture("ai_error", { reason: message });
		},
		[posthog]
	);

	const projectServerState = useEffectEvent(() => {
		if (!serverState || serverState === prevServerStateRef.current) {
			return;
		}
		if (serverState === "mirror_delivered" && !mirrorText) {
			return;
		}
		prevServerStateRef.current = serverState;

		if (serverState === "completed" || serverState === "abandoned") {
			abortRecording();
			resetSession();
			clearRefs();
			dispatch({ type: "RESET" });
			return;
		}

		if (serverState === "mirror_delivered") {
			const durationMs = submitTimestampRef.current
				? Date.now() - submitTimestampRef.current
				: undefined;
			submitTimestampRef.current = null;
			posthog.capture("mirror_arrived", { duration_ms: durationMs ?? null });
			// Observe perf signal for the felt AI round-trip. Wrapped in try/catch: a throw
			// here runs before the screen dispatch and would take the mirror down (1.6.0 Android).
			if (durationMs !== undefined) {
				try {
					AppMetrics.logEvent("mirror.generated", {
						attributes: {
							durationMs,
							escalated: !!session?.escalationTriggered,
						},
					});
				} catch (error) {
					console.warn("[observe] mirror.generated logEvent failed:", error);
				}
			}
			if (session?.escalationTriggered) {
				posthog.capture("escalation_triggered");
			}
		}

		const next = projectScreen(
			serverState,
			state.screen,
			!!session?.escalationTriggered
		);
		if (next === "error") {
			dispatchError(
				errorMessage ?? "Something went wrong.",
				errorCode ?? undefined
			);
		} else if (next && next !== state.screen) {
			dispatch({ screen: next, type: "SESSION_RESUMED" });
		}
	});
	useEffect(() => {
		projectServerState();
	}, [serverState, mirrorText]);

	const resetIfGone = useEffectEvent(() => {
		if (MIRROR_SCREENS.has(state.screen)) {
			clearRefs();
			dispatch({ type: "RESET" });
		}
	});
	useEffect(() => {
		if (sessionId) {
			shownSessionRef.current = sessionId;
			return;
		}
		if (isLoading || !shownSessionRef.current) {
			return;
		}
		shownSessionRef.current = null;
		resetIfGone();
	}, [sessionId, isLoading]);

	const submitReflection = useCallback(async () => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		abortRecording();
		dispatch({ type: "SUBMIT" });
		const { typing } = state;
		const duration =
			typing.startedAt === null ? undefined : Date.now() - typing.startedAt;
		try {
			await initiateAndSubmit(
				state.entryText,
				state.entryType,
				duration,
				typing.froze,
				typing.frozeMs,
				state.selectedTextures
			);
			clearReflectDraft();
			posthog.capture("reflection_submitted", {
				entry_type: state.entryType,
				freeze_occurred: typing.froze,
				input_length: state.entryText.length,
			});
			trackFirstReflection(posthog);
			submitTimestampRef.current = Date.now();
		} catch (error) {
			dispatchError(extractErrorMessage(error));
		} finally {
			busyRef.current = false;
		}
	}, [
		state.entryText,
		state.entryType,
		state.typing,
		state.selectedTextures,
		initiateAndSubmit,
		posthog,
		dispatchError,
		abortRecording,
	]);

	const submitScaffold = useCallback(async () => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		dispatch({ type: "SCAFFOLD_SUBMIT" });
		try {
			await initiateAndSubmit(
				state.selectedTextures.join(", "),
				"scaffold",
				undefined,
				false,
				undefined,
				state.selectedTextures
			);
			posthog.capture("reflection_submitted", {
				entry_type: "scaffold",
				freeze_occurred: false,
				input_length: state.selectedTextures.length,
			});
			trackFirstReflection(posthog);
			submitTimestampRef.current = Date.now();
		} catch (error) {
			dispatchError(extractErrorMessage(error));
		} finally {
			busyRef.current = false;
		}
	}, [state.selectedTextures, initiateAndSubmit, posthog, dispatchError]);

	const submitClarification = useCallback(async () => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		abortRecording();
		dispatch({ type: "SUBMIT" });
		const feedbackType: FeedbackType = state.lastFeedbackType ?? "not_quite";
		try {
			await submitRefinement(feedbackType, state.clarifyText);
		} catch (error) {
			if (isMaxRefinementError(error)) {
				dispatch({ screen: "gave-up", type: "SESSION_RESUMED" });
			} else {
				dispatchError(extractErrorMessage(error));
			}
		} finally {
			busyRef.current = false;
		}
	}, [
		state.clarifyText,
		state.lastFeedbackType,
		submitRefinement,
		dispatchError,
		abortRecording,
	]);

	const handleThatsIt = useCallback(async () => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		dispatch({ type: "THATS_IT" });
		try {
			const confirmationState = turnsCount > 0 ? "refined" : "confirmed";
			await confirmMirror(confirmationState);
			posthog.capture("mirror_confirmed", { turns_count: turnsCount });
		} catch (error) {
			dispatchError(extractErrorMessage(error));
		} finally {
			busyRef.current = false;
		}
	}, [turnsCount, confirmMirror, posthog, dispatchError]);

	const handleNotQuite = useCallback((): boolean => {
		if (state.screen !== "mirror") {
			return false;
		}
		if (turnsCount >= REFINEMENT_MAX_TURNS) {
			dispatch({ screen: "gave-up", type: "SESSION_RESUMED" });
			return false;
		}
		posthog.capture("mirror_not_quite", {
			claimStrength: session?.claimStrength ?? null,
			sessionId,
			turns_count: turnsCount,
		});
		dispatch({ type: "NOT_QUITE" });
		return true;
	}, [state.screen, turnsCount, posthog, sessionId, session?.claimStrength]);

	const handleSayMore = useCallback((): boolean => {
		if (state.screen !== "mirror") {
			return false;
		}
		if (turnsCount >= REFINEMENT_MAX_TURNS) {
			dispatch({ screen: "gave-up", type: "SESSION_RESUMED" });
			return false;
		}
		posthog.capture("mirror_say_more", {
			claimStrength: session?.claimStrength ?? null,
			sessionId,
			turns_count: turnsCount,
		});
		dispatch({ type: "SAY_MORE" });
		return true;
	}, [state.screen, turnsCount, posthog, sessionId, session?.claimStrength]);

	const handleGaveUpPathSelection = useCallback(async () => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		try {
			await confirmMirror("gave_up");
			dispatch({ type: "THATS_IT" });
		} catch (error) {
			dispatchError(extractErrorMessage(error));
		} finally {
			busyRef.current = false;
		}
	}, [confirmMirror, dispatchError]);

	const handleSelectExit = useCallback(async () => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		try {
			await completeAsExit();
			posthog.capture("path_selected", { path: "exit" });
		} catch (error) {
			dispatchError(extractErrorMessage(error));
		} finally {
			busyRef.current = false;
		}
	}, [completeAsExit, posthog, dispatchError]);

	// Resolve false only when the selection failed and the error screen is up.
	const handleSelectSolo = useCallback(async (): Promise<boolean> => {
		if (busyRef.current) {
			return true;
		}
		busyRef.current = true;
		try {
			await selectPath("solo");
			posthog.capture("path_selected", { path: "solo" });
			return true;
		} catch (error) {
			dispatchError(extractErrorMessage(error));
			return false;
		} finally {
			busyRef.current = false;
		}
	}, [selectPath, posthog, dispatchError]);

	const handleSelectPeers = useCallback(async (): Promise<boolean> => {
		if (busyRef.current) {
			return true;
		}
		busyRef.current = true;
		try {
			await selectPath("peers");
			posthog.capture("path_selected", { path: "peers" });
			return true;
		} catch (error) {
			dispatchError(extractErrorMessage(error));
			return false;
		} finally {
			busyRef.current = false;
		}
	}, [selectPath, posthog, dispatchError]);

	const handleEscalationEngage = useCallback(async () => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		try {
			await recordEscalationResponse("engaged");
			posthog.capture("escalation_engaged");
		} catch (error) {
			dispatchError(extractErrorMessage(error));
		} finally {
			busyRef.current = false;
		}
	}, [recordEscalationResponse, posthog, dispatchError]);

	const handleEscalationContinue = useCallback(async () => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		try {
			const confirmation = turnsCount > 0 ? "refined" : "confirmed";
			await confirmMirror(confirmation);
			dispatch({ type: "THATS_IT" });
		} catch (error) {
			dispatchError(extractErrorMessage(error));
		} finally {
			busyRef.current = false;
		}
	}, [turnsCount, confirmMirror, dispatchError]);

	const handleEscalationDismiss = useCallback(async () => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		try {
			await recordEscalationResponse("dismissed");
			const confirmation = turnsCount > 0 ? "refined" : "confirmed";
			await confirmMirror(confirmation);
			dispatch({ type: "THATS_IT" });
		} catch (error) {
			dispatchError(extractErrorMessage(error));
		} finally {
			busyRef.current = false;
		}
	}, [recordEscalationResponse, confirmMirror, turnsCount, dispatchError]);

	const startVoiceFromIdle = async () => {
		if (isRecording) {
			stopRecording();
			return;
		}
		voicePrefixRef.current = state.entryText.trim();
		await startRecording(() => dispatch({ type: "VOICE_START" }));
	};

	const startVoiceFromTyping = async () => {
		if (isRecording) {
			stopRecording();
			return;
		}
		voicePrefixRef.current = state.entryText.trim();
		await startRecording();
	};

	const handleDismissTyping = () => {
		abortRecording();
		dispatch({ type: "DISMISS_TYPING" });
	};

	const handleReset = useCallback(async () => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		abortRecording();
		try {
			await abandon();
		} finally {
			resetSession();
			clearRefs();
			dispatch({ type: "RESET" });
			busyRef.current = false;
		}
	}, [abandon, resetSession, clearRefs, abortRecording]);

	const dispatchAction = (action: ReflectionAction) => {
		if (action.type === "DISCARD_DRAFT") {
			abortRecording();
		}
		dispatch(action);
	};

	const handleRetry = useCallback(async () => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		try {
			await retry();
		} catch (error) {
			dispatchError(extractErrorMessage(error));
		} finally {
			busyRef.current = false;
		}
	}, [retry, dispatchError]);

	return {
		abortRecording,
		claimStrength: session?.claimStrength ?? null,
		companionName:
			session?.entryType === "talk" ? (session.companionName ?? null) : null,
		dictationUpsell,
		dispatch: dispatchAction,
		escalationResources: session?.escalationResources ?? null,
		handleDismissTyping,
		handleEscalationContinue,
		handleEscalationDismiss,
		handleEscalationEngage,
		handleGaveUpPathSelection,
		handleNotQuite,
		handleReset,
		handleRetry,
		handleSayMore,
		handleSelectExit,
		handleSelectPeers,
		handleSelectSolo,
		handleThatsIt,
		isLoading,
		isRecording,
		mirrorText,
		plusDictation,
		processingStage:
			serverState === "processing" ? session?.processingStage : undefined,
		rawInput: session?.rawInput ?? "",
		sessionId,
		startVoiceFromIdle,
		startVoiceFromTyping,
		state,
		submitClarification,
		submitReflection,
		submitScaffold,
		toneUsed: session?.toneUsed ?? null,
		turnsCount,
	};
}
