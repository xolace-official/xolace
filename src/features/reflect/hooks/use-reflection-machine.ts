import { useReducer, useCallback, useEffect, useRef } from 'react';
import { usePostHog } from 'posthog-react-native';
// AppMetrics, not Observe: `logEvent` lives on the ExpoAppMetrics native module,
// and Observe only reaches it via a Proxy fallback keyed on `!(prop in target)`.
// On Android the ExpoObserve host object answers `'logEvent' in target` with
// true while exposing no such method, so the fallback never fires and
// `Observe.logEvent` resolves to undefined — crashing the mirror render.
import { AppMetrics } from 'expo-observe';
import type { FeedbackType } from '@/src/features/reflect/types';
import { useSession } from '@/src/features/reflect/hooks/use-session';
import {
  extractErrorMessage,
  isMaxRefinementError,
  projectScreen,
} from '@/src/features/reflect/session-service';
import { MAX_TURNS, initialState, reducer } from './reflection-reducer';
import { useDictation } from '@/src/features/reflect/hooks/use-dictation';

/**
 * Manages the reflection UI state machine and bridges it to the session API.
 *
 * Provides the current reflection state, a reducer dispatch, loading status, and a set of actions that submit reflections, handle clarifications and confirmations, select paths, and control or reset the session.
 *
 * @returns An object with:
 * - `state` — the current `ReflectionState` for the UI.
 * - `dispatch` — reducer dispatch function for local state actions.
 * - `isLoading` — `true` while session data is loading.
 * - `submitReflection` — submit the current typed entry to the session.
 * - `submitScaffold` — submit a scaffolded entry built from selected textures.
 * - `submitClarification` — submit a clarification/refinement for the last mirror.
 * - `handleThatsIt` — confirm the mirror as final (or refined when applicable).
 * - `handleNotQuite` — transition to the "not quite" clarification flow or give up when turns exhausted.
 * - `handleSayMore` — transition to the "say more" clarification flow or give up when turns exhausted.
 * - `handleGaveUpPathSelection` — confirm a "gave up" path and advance to completion.
 * - `handleSelectExit` — select the "exit" path for session-end navigation.
 * - `handleSelectSolo` — select the "solo" path.
 * - `handleSelectPeers` — select the "peers" path.
 * - `handleReset` — abandon the current session and reset local state.
 * - `handleRetry` — request the session to retry the last action.
 */
export function useReflectionMachine() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const posthog = usePostHog();
  const {
    isRecording,
    partialTranscript,
    plusDictation,
    dictationUpsell,
    startRecording,
    stopRecording,
    abortRecording,
  } = useDictation((text) => dispatch({ type: 'VOICE_APPEND', text }));
  const voicePrefixRef = useRef('');
  const {
    sessionId,
    session,
    serverState,
    mirrorText,
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
    voicePrefixRef.current = '';
  }, []);

  const dispatchError = useCallback((message: string) => {
    dispatch({ type: 'SESSION_ERROR', message });
    posthog.capture('ai_error', { reason: message });
  }, [posthog]);

  // Forward live transcript to entryText
  useEffect(() => {
    if (!partialTranscript) return;
    const prefix = voicePrefixRef.current;
    const text = prefix ? `${prefix} ${partialTranscript}` : partialTranscript;
    dispatch({ type: 'VOICE_TRANSCRIPT', text });
  }, [partialTranscript]);

  // --- Reconcile server state edges into the UI ---
  // The screen policy lives in projectScreen (session-service.ts); this effect
  // is a thin applier plus edge telemetry. It fires once per server-state
  // change — between edges, local dispatches own the screen.
  useEffect(() => {
    if (!serverState || serverState === prevServerStateRef.current) return;
    // Mirror not readable yet — keep current screen and retry when mirrorText
    // arrives (don't mark handled, or the re-fire short-circuits above).
    if (serverState === 'mirror_delivered' && !mirrorText) return;
    prevServerStateRef.current = serverState;

    if (serverState === 'completed' || serverState === 'abandoned') {
      // Terminal states — reset UI for a fresh session
      abortRecording();
      resetSession();
      clearRefs();
      dispatch({ type: 'RESET' });
      return;
    }

    if (serverState === 'mirror_delivered') {
      const durationMs = submitTimestampRef.current
        ? Date.now() - submitTimestampRef.current
        : undefined;
      submitTimestampRef.current = null;
      posthog.capture('mirror_arrived', { duration_ms: durationMs ?? null });
      // EAS Observe perf signal: felt AI round-trip, correlated with app
      // version/release in the Observe dashboard. Only log a real measurement.
      //
      // Telemetry must never be able to reach the dispatch below it. This call
      // threw on Android once already (`Observe.logEvent` resolved to undefined),
      // and since it runs *before* the screen dispatch it took the mirror down
      // with it — on 1.6.0, which shipped without an error boundary, the throw
      // unmounted the whole tree and left users on a blank screen they could only
      // escape by force-quitting. A perf event is never worth a dead session.
      if (durationMs !== undefined) {
        try {
          AppMetrics.logEvent('mirror.generated', {
            attributes: {
              durationMs,
              escalated: !!session?.escalationTriggered,
            },
          });
        } catch (error) {
          console.warn('[observe] mirror.generated logEvent failed:', error);
        }
      }
      if (session?.escalationTriggered) {
        posthog.capture('escalation_triggered');
      }
    }

    const next = projectScreen(
      serverState,
      state.screen,
      !!session?.escalationTriggered,
    );
    if (next === 'error') {
      dispatchError(errorMessage ?? 'Something went wrong.');
    } else if (next && next !== state.screen) {
      dispatch({ type: 'SESSION_RESUMED', screen: next });
    }
  }, [serverState, mirrorText, errorMessage, state.screen, session, resetSession, clearRefs, posthog, dispatchError, abortRecording]);

  // Track freeze (typing-nudge = user paused)
  useEffect(() => {
    if (state.screen === 'typing-nudge') {
      freezeOccurredRef.current = true;
      freezeStartRef.current = Date.now();
    } else if (state.screen === 'typing' && freezeStartRef.current) {
      freezeDurationRef.current =
        (freezeDurationRef.current ?? 0) +
        (Date.now() - freezeStartRef.current);
      freezeStartRef.current = null;
    }
  }, [state.screen]);

  // Track typing start
  useEffect(() => {
    if (state.screen === 'typing' && !typingStartRef.current) {
      typingStartRef.current = Date.now();
    }
  }, [state.screen]);

  const submitReflection = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    abortRecording();
    dispatch({ type: 'SUBMIT' });
    const duration = typingStartRef.current
      ? Date.now() - typingStartRef.current
      : undefined;
    try {
      await initiateAndSubmit(
        state.entryText,
        state.entryType,
        duration,
        freezeOccurredRef.current,
        freezeDurationRef.current,
      );
      posthog.capture('reflection_submitted', {
        entry_type: state.entryType,
        input_length: state.entryText.length,
        freeze_occurred: freezeOccurredRef.current,
      });
      submitTimestampRef.current = Date.now();
    } catch (error) {
      dispatchError(extractErrorMessage(error));
    } finally {
      busyRef.current = false;
    }
  }, [state.entryText, state.entryType, initiateAndSubmit, posthog, dispatchError, abortRecording]);

  const submitScaffold = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    dispatch({ type: 'SCAFFOLD_SUBMIT' });
    try {
      await initiateAndSubmit(
        state.selectedTextures.join(', '),
        'scaffold',
        undefined,
        false,
      );
      posthog.capture('reflection_submitted', {
        entry_type: 'scaffold',
        input_length: state.selectedTextures.length,
        freeze_occurred: false,
      });
      submitTimestampRef.current = Date.now();
    } catch (error) {
      dispatchError(extractErrorMessage(error));
    } finally {
      busyRef.current = false;
    }
  }, [state.selectedTextures, initiateAndSubmit, posthog, dispatchError]);

  const submitClarification = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    abortRecording();
    dispatch({ type: 'SUBMIT' });
    const feedbackType: FeedbackType = state.lastFeedbackType ?? 'not_quite';
    try {
      await submitRefinement(feedbackType, state.clarifyText);
    } catch (error) {
      if (isMaxRefinementError(error)) {
        dispatch({ type: 'SESSION_RESUMED', screen: 'gave-up' });
      } else {
        dispatchError(extractErrorMessage(error));
      }
    } finally {
      busyRef.current = false;
    }
  }, [state.clarifyText, state.lastFeedbackType, submitRefinement, dispatchError, abortRecording]);

  const handleThatsIt = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    dispatch({ type: 'THATS_IT' });
    try {
      const confirmationState = turnsCount > 0 ? 'refined' : 'confirmed';
      await confirmMirror(confirmationState);
      posthog.capture('mirror_confirmed', { turns_count: turnsCount });
    } catch (error) {
      dispatchError(extractErrorMessage(error));
    } finally {
      busyRef.current = false;
    }
  }, [turnsCount, confirmMirror, posthog, dispatchError]);

  const handleNotQuite = useCallback(() => {
    if (state.screen !== 'mirror') return;
    if (turnsCount >= MAX_TURNS) {
      dispatch({ type: 'SESSION_RESUMED', screen: 'gave-up' });
    } else {
      // sessionId joins the press to its clarify_delivered (§9.4); the
      // claim strength is what the mirror on screen was carrying.
      posthog.capture('mirror_not_quite', {
        turns_count: turnsCount,
        sessionId,
        claimStrength: session?.claimStrength ?? null,
      });
      dispatch({ type: 'NOT_QUITE' });
    }
  }, [state.screen, turnsCount, posthog, sessionId, session?.claimStrength]);

  const handleSayMore = useCallback(() => {
    if (state.screen !== 'mirror') return;
    if (turnsCount >= MAX_TURNS) {
      dispatch({ type: 'SESSION_RESUMED', screen: 'gave-up' });
    } else {
      posthog.capture('mirror_say_more', {
        turns_count: turnsCount,
        sessionId,
        claimStrength: session?.claimStrength ?? null,
      });
      dispatch({ type: 'SAY_MORE' });
    }
  }, [state.screen, turnsCount, posthog, sessionId, session?.claimStrength]);

  const handleGaveUpPathSelection = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await confirmMirror('gave_up');
      dispatch({ type: 'THATS_IT' });
    } catch (error) {
      dispatchError(extractErrorMessage(error));
    } finally {
      busyRef.current = false;
    }
  }, [confirmMirror, dispatchError]);

  const handleSelectExit = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      // Exit has no activity: selection and completion collapse into one
      // terminal transition here, so the session is durably complete before
      // the "Heard." screen renders (which reads it by id, not getActive).
      await completeAsExit();
      posthog.capture('path_selected', { path: 'exit' });
    } catch (error) {
      dispatchError(extractErrorMessage(error));
    } finally {
      busyRef.current = false;
    }
  }, [completeAsExit, posthog, dispatchError]);

  const handleSelectSolo = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await selectPath('solo');
      posthog.capture('path_selected', { path: 'solo' });
    } catch (error) {
      dispatchError(extractErrorMessage(error));
    } finally {
      busyRef.current = false;
    }
  }, [selectPath, posthog, dispatchError]);

  const handleSelectPeers = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await selectPath('peers');
      posthog.capture('path_selected', { path: 'peers' });
    } catch (error) {
      dispatchError(extractErrorMessage(error));
    } finally {
      busyRef.current = false;
    }
  }, [selectPath, posthog, dispatchError]);

  const handleEscalationEngage = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await recordEscalationResponse('engaged');
      posthog.capture('escalation_engaged');
      // Resources phase is shown inline — component manages local state.
    } catch (error) {
      dispatchError(extractErrorMessage(error));
    } finally {
      busyRef.current = false;
    }
  }, [recordEscalationResponse, posthog, dispatchError]);

  const handleEscalationContinue = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const confirmation = turnsCount > 0 ? 'refined' : 'confirmed';
      await confirmMirror(confirmation);
      dispatch({ type: 'THATS_IT' });
    } catch (error) {
      dispatchError(extractErrorMessage(error));
    } finally {
      busyRef.current = false;
    }
  }, [turnsCount, confirmMirror, dispatchError]);

  const handleEscalationDismiss = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await recordEscalationResponse('dismissed');
      const confirmation = turnsCount > 0 ? 'refined' : 'confirmed';
      await confirmMirror(confirmation);
      dispatch({ type: 'THATS_IT' });
    } catch (error) {
      dispatchError(extractErrorMessage(error));
    } finally {
      busyRef.current = false;
    }
  }, [recordEscalationResponse, confirmMirror, turnsCount, dispatchError]);

  const startVoiceFromIdle = async () => {
    if (isRecording) { stopRecording(); return; }
    // A kept draft (#258) is the prefix too, or the first word would replace it.
    voicePrefixRef.current = state.entryText.trim();
    await startRecording(() => dispatch({ type: 'VOICE_START' }));
  };

  const startVoiceFromTyping = async () => {
    if (isRecording) { stopRecording(); return; }
    voicePrefixRef.current = state.entryText.trim();
    await startRecording();
  };

  const handleDismissTyping = () => {
    abortRecording();
    dispatch({ type: 'DISMISS_TYPING' });
  };

  const handleReset = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    abortRecording();
    try {
      await abandon();
    } finally {
      resetSession();
      clearRefs();
      dispatch({ type: 'RESET' });
      busyRef.current = false;
    }
  }, [abandon, resetSession, clearRefs, abortRecording]);

  // A live mic would re-fill the draft with its next transcript.
  // Stable on purpose: `dispatch` sits in effect dependency arrays downstream
  // (reflect-screen's variant effect, useReplySeed, useReflectBridge), and a
  // per-render identity re-ran them every render — an infinite update loop.
  const abortRecordingRef = useRef(abortRecording);
  useEffect(() => {
    abortRecordingRef.current = abortRecording;
  });
  const dispatchAction = useCallback<typeof dispatch>((action) => {
    if (action.type === 'DISCARD_DRAFT') abortRecordingRef.current();
    dispatch(action);
  }, []);

  const handleRetry = useCallback(async () => {
    if (busyRef.current) return;
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
    state,
    dispatch: dispatchAction,
    isLoading,
    sessionId,
    turnsCount,
    mirrorText,
    escalationResources: session?.escalationResources ?? null,
    toneUsed: session?.toneUsed ?? null,
    claimStrength: session?.claimStrength ?? null,
    // Gated on the server state: the processing screen shows optimistically,
    // while the row still carries the previous run's stage (retry, refinement).
    processingStage:
      serverState === 'processing' ? session?.processingStage : undefined,
    // What retry reprocesses — present after a cold resume, unlike entryText.
    rawInput: session?.rawInput ?? '',
    isRecording,
    plusDictation,
    dictationUpsell,
    submitReflection,
    submitScaffold,
    submitClarification,
    handleThatsIt,
    handleNotQuite,
    handleSayMore,
    handleGaveUpPathSelection,
    handleEscalationEngage,
    handleEscalationContinue,
    handleEscalationDismiss,
    handleSelectExit,
    handleSelectSolo,
    handleSelectPeers,
    handleReset,
    handleRetry,
    startVoiceFromIdle,
    startVoiceFromTyping,
    handleDismissTyping,
  };
}
