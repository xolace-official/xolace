import { useEffect } from 'react';
import { useAppStore } from '@/src/store/store';
import type { ReflectionAction, ReflectionStateName } from '@/src/features/reflect/types';

/**
 * Arriving with a reply seed (#316) opens the composer for the user; leaving the
 * compose screens by any other route (submitted, a session resumed under them)
 * spends it, so the card cannot re-open itself on a later visit to idle.
 */
export function useReplySeed(
  screen: ReflectionStateName,
  dispatch: (action: ReflectionAction) => void,
) {
  const replySeed = useAppStore((s) => s.replySeed);
  const clearReplySeed = useAppStore((s) => s.clearReplySeed);

  useEffect(() => {
    if (!replySeed) return;
    if (screen === 'idle') {
      dispatch({ type: 'TAP_INPUT' });
      return;
    }
    if (screen !== 'typing' && screen !== 'typing-nudge') {
      clearReplySeed();
    }
  }, [replySeed, screen, dispatch, clearReplySeed]);
}
