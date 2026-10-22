import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { Uniwind } from 'uniwind';
import { useAppStore } from '@/src/store/store';

export type SessionMode = 'day' | 'night';

interface SessionModeContextType {
  mode: SessionMode;
  isNight: boolean;
}

const SessionModeContext = createContext<SessionModeContextType | undefined>(
  undefined,
);

/** Returns true if the given hour (0–23) falls in the night window (22:00–04:00). */
function isNightHour(hour: number): boolean {
  return hour >= 22 || hour < 4;
}

function computeMode(): SessionMode {
  return isNightHour(new Date().getHours()) ? 'night' : 'day';
}

/**
 * Provides time-aware session mode to the app.
 *
 * - Computes initial mode from the device clock.
 * - Listens to AppState 'active' events to recompute on foreground.
 * - When entering the night window: stashes the current theme and
 *   switches to `nightly-dark` (or `nightly-light` if the user is
 *   in light mode). When exiting: restores the previous theme.
 * - Does NOT flip mid-session; callers that need the mode at session
 *   start should capture it via a ref.
 */
export function SessionModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const nightModeEnabled = useAppStore((s) => s.nightModeEnabled);
  const setPreviousTheme = useAppStore((s) => s.setPreviousTheme);

  // mode always reflects the actual time of day regardless of nightModeEnabled.
  // forceRefresh handles time-based foreground refreshes.
  const [, forceRefresh] = useReducer((n: number) => n + 1, 0);
  const mode: SessionMode = computeMode();

  // Track whether we've already applied the nightly theme swap so we
  // don't double-stash on repeated AppState events within the window.
  const nightAppliedRef = useRef(false);

  const applyNightTheme = useCallback(() => {
    if (nightAppliedRef.current) return;
    nightAppliedRef.current = true;
    const current = Uniwind.currentTheme;
    setPreviousTheme(current);
    Uniwind.setTheme('nightly-dark');
  }, [setPreviousTheme]);

  const restoreDayTheme = useCallback(() => {
    if (!nightAppliedRef.current) return;
    nightAppliedRef.current = false;
    const { previousTheme, theme: storedTheme, colorThemeId } = useAppStore.getState();
    setPreviousTheme(null);

    if (previousTheme) {
      Uniwind.setTheme(previousTheme as never);
      return;
    }

    const modeStr = storedTheme === 'system' ? 'dark' : storedTheme;
    const nextTheme =
      colorThemeId === 'default'
        ? modeStr
        : (`${colorThemeId}-${modeStr}` as never);
    Uniwind.setTheme(nextTheme);
  }, [setPreviousTheme]);

  // Theme swap is gated by the user's night mode preference; session mode is not.
  useEffect(() => {
    if (nightModeEnabled && mode === 'night') {
      applyNightTheme();
    } else {
      restoreDayTheme();
    }
  }, [mode, nightModeEnabled, applyNightTheme, restoreDayTheme]);

  // On app foreground, re-render so mode recomputes with the current hour
  useEffect(() => {
    const handler = (state: AppStateStatus) => {
      if (state === 'active') forceRefresh();
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, []);

  const value = useMemo(
    () => ({ mode, isNight: nightModeEnabled && mode === 'night' }),
    [mode, nightModeEnabled],
  );

  return (
    <SessionModeContext.Provider value={value}>
      {children}
    </SessionModeContext.Provider>
  );
}

/** Access the current session mode anywhere inside SessionModeProvider. */
export function useSessionMode(): SessionModeContextType {
  const ctx = useContext(SessionModeContext);
  if (!ctx) {
    throw new Error('useSessionMode must be used within SessionModeProvider');
  }
  return ctx;
}
