import { useCallback, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

/**
 * Provides the active session and helpers to start and complete a path for path screens.
 *
 * Exposes the current active session state and two actions that serialize mutation calls
 * to avoid concurrent updates.
 *
 * @returns An object with:
 *  - `sessionId` - the active session's Id or `null` when no active session exists.
 *  - `session` - the full active session object or `undefined` while loading.
 *  - `isLoading` - `true` when the active session is still being fetched, `false` otherwise.
 *  - `startPath` - a function `(exerciseId?: Id<'exercises'>) => Promise<void>` that starts the path for the active session when the session state is `'path_selected'`; no-op if there is no active session or another mutation is in progress.
 *  - `completePath` - a function `(pathCompleted: boolean) => Promise<boolean>` that flips the session terminal (→ completed) the moment the activity ends, before navigating to session-end; no-op if there is no active session or another mutation is in progress.
 */
export function usePathSession() {
  const activeSession = useQuery(api.sessions.getActive);
  const startPathMutation = useMutation(api.sessions.startPath);
  const completePathMutation = useMutation(api.sessions.completePath);
  const busyRef = useRef(false);

  const sessionId = activeSession?._id ?? null;
  const session = activeSession;
  const isLoading = activeSession === undefined;

  /**
   * Start the path. Called on mount from path screens.
   * selectPath was already called from PathSelectionState before navigation.
   */
  const startPath = useCallback(
    async (exerciseId?: Id<'exercises'>): Promise<boolean> => {
      if (!sessionId || busyRef.current) return false;
      if (session?.state !== 'path_selected') return false;
      busyRef.current = true;
      try {
        await startPathMutation({ sessionId, exerciseId });
        return true;
      } catch {
        return false;
      } finally {
        busyRef.current = false;
      }
    },
    [sessionId, session?.state, startPathMutation],
  );

  /**
   * Flip the session terminal (→ completed). Called from the activity screen
   * the moment the exercise/peer view is done, before navigating to
   * session-end — so completion is durable even if the user closes the app on
   * the session-end screen. Post-session mood + contribution are recorded
   * separately from session-end via recordPostSessionFeedback.
   */
  const completePath = useCallback(
    async (pathCompleted: boolean): Promise<boolean> => {
      if (!sessionId || busyRef.current) return false;
      const s = session?.state;
      if (s !== 'path_in_progress' && s !== 'path_selected' && s !== 'confirmed') return false;
      busyRef.current = true;
      try {
        await completePathMutation({ sessionId, pathCompleted });
        return true;
      } catch {
        return false;
      } finally {
        busyRef.current = false;
      }
    },
    [sessionId, session?.state, completePathMutation],
  );

  return {
    sessionId,
    session,
    isLoading,
    startPath,
    completePath,
  };
}
