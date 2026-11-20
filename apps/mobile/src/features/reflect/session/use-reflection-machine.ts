import { useAuth } from "@clerk/expo";
import {
	REFINEMENT_MAX_TURNS,
	type SessionErrorCode,
} from "@xolace/backend/shared";
// AppMetrics, not Observe: on Android `Observe.logEvent` resolves to undefined
// (the host object answers `'logEvent' in target` without exposing the method).
import { AppMetrics } from "expo-observe";
import { usePostHog } from "posthog-react-native";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
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
	ReflectionStateName,
} from "@/features/reflect/session/types";
import { useSession } from "@/features/reflect/session/use-session";
import { useDictation } from "@/features/reflect/write/dictation/use-dictation";
import { trackFirstReflection } from "@/lib/intake-analytics";
import { initialState, reducer } from "./reflection-reducer";

const MIRROR_SCREENS: ReadonlySet<ReflectionStateName> = new Set([
	"mirror",
	"clarify",
	"gave-up",
	"path-selection",
	"escalation",
]);

export function useReflectionMachine() {
	const { userId } = useAuth();
	const [state, dispatch] = useReducer(reducer, initialState, (s) => ({
		...s,
		entryText: readReflectDraft(userId),
	}));
	const [draftOwner, setDraftOwner] = useState(userId);
	if (draftOwner !== userId) {
		setDraftOwner(userId);
		dispatch({ entryText: readReflectDraft(userId), type: "ACCOUNT_SWITCHED" });
	}
	const posthog = usePostHog();
	const {
		isRecording,
		partialTranscript,
		plusDictation,
		dictationUpsell,
		startRecording,
		stopRecording,
		abortRecording,
	} = useDictation((text) => dispatch({ text, type: "VOICE_APPEND" }));
	const voicePrefixRef = useRef("");
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
	const typingStartRef = useRef<number | null>(null);
	const submitTimestampRef = useRef<number | null>(null);
	const freezeOccurredRef = useRef(false);
	const freezeStartRef = useRef<number | null>(null);
	const freezeDurationRef = useRef<number | undefined>(undefined);
	const busyRef = useRef(false);

	const clearRefs = useCallback(() => {
		prevServerStateRef.current = null;
		typingStartRef.current = null;
		submitTimestampRef.current = null;
		freezeOccurredRef.current = false;
		freezeStartRef.current = null;
		freezeDurationRef.current = undefined;
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

	useEffect(() => {
		if (!partialTranscript) {
			return;
		}
		const prefix = voicePrefixRef.current;
		const text = prefix ? `${prefix} ${partialTranscript}` : partialTranscript;
		dispatch({ text, type: "VOICE_TRANSCRIPT" });
	}, [partialTranscript]);

	useEffect(() => {
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
	}, [
		serverState,
		mirrorText,
		errorCode,
		errorMessage,
		state.screen,
		session,
		resetSession,
		clearRefs,
		posthog,
		dispatchError,
		abortRecording,
	]);

	useEffect(() => {
		if (sessionId) {
			shownSessionRef.current = sessionId;
			return;
		}
		if (isLoading || !shownSessionRef.current) {
			return;
		}
		shownSessionRef.current = null;
		if (MIRROR_SCREENS.has(state.screen)) {
			clearRefs();
			dispatch({ type: "RESET" });
		}
	}, [sessionId, isLoading, state.screen, clearRefs]);

	useEffect(() => {
		if (state.screen === "typing-nudge") {
			freezeOccurredRef.current = true;
			freezeStartRef.current = Date.now();
		} else if (state.screen === "typing" && freezeStartRef.current) {
			freezeDurationRef.current =
				(freezeDurationRef.current ?? 0) +
				(Date.now() - freezeStartRef.current);
			freezeStartRef.current = null;
		}
	}, [state.screen]);

	useEffect(() => {
		if (state.screen === "typing" && !typingStartRef.current) {
			typingStartRef.current = Date.now();
		}
	}, [state.screen]);

	const submitReflection = useCallback(async () => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		abortRecording();
		dispatch({ type: "SUBMIT" });
		const duration = typingStartRef.current
			? Date.now() - typingStartRef.current
			: undefined;
		try {
			await initiateAndSubmit(
				state.entryText,
				state.entryType,
				duration,
				freezeOccurredRef.current,
				freezeDurationRef.current
			);
			clearReflectDraft();
			posthog.capture("reflection_submitted", {
				entry_type: state.entryType,
				freeze_occurred: freezeOccurredRef.current,
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
				false
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

	const handleNotQuite = useCallback(() => {
		if (state.screen !== "mirror") {
			return;
		}
		if (turnsCount >= REFINEMENT_MAX_TURNS) {
			dispatch({ screen: "gave-up", type: "SESSION_RESUMED" });
		} else {
			posthog.capture("mirror_not_quite", {
				claimStrength: session?.claimStrength ?? null,
				sessionId,
				turns_count: turnsCount,
			});
			dispatch({ type: "NOT_QUITE" });
		}
	}, [state.screen, turnsCount, posthog, sessionId, session?.claimStrength]);

	const handleSayMore = useCallback(() => {
		if (state.screen !== "mirror") {
			return;
		}
		if (turnsCount >= REFINEMENT_MAX_TURNS) {
			dispatch({ screen: "gave-up", type: "SESSION_RESUMED" });
		} else {
			posthog.capture("mirror_say_more", {
				claimStrength: session?.claimStrength ?? null,
				sessionId,
				turns_count: turnsCount,
			});
			dispatch({ type: "SAY_MORE" });
		}
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

	const handleSelectSolo = useCallback(async () => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		try {
			await selectPath("solo");
			posthog.capture("path_selected", { path: "solo" });
		} catch (error) {
			dispatchError(extractErrorMessage(error));
		} finally {
			busyRef.current = false;
		}
	}, [selectPath, posthog, dispatchError]);

	const handleSelectPeers = useCallback(async () => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		try {
			await selectPath("peers");
			posthog.capture("path_selected", { path: "peers" });
		} catch (error) {
			dispatchError(extractErrorMessage(error));
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

	const abortRecordingRef = useRef(abortRecording);
	useEffect(() => {
		abortRecordingRef.current = abortRecording;
	});
	const dispatchAction = useCallback<typeof dispatch>((action) => {
		if (action.type === "DISCARD_DRAFT") {
			abortRecordingRef.current();
		}
		dispatch(action);
	}, []);

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
