import { useCallback, useRef, useEffect } from 'react';


/**
 * Manage a typing-inactivity timer that invokes a callback after a configurable delay.
 *
 * @param onPause - Callback invoked when the inactivity period elapses.
 * @param delay - Time in milliseconds to wait before invoking `onPause`. Defaults to 8000.
 * @returns An object with:
 *  - `resetTimer`: Restarts the inactivity countdown.
 *  - `clearTimer`: Cancels any active inactivity countdown.
 */

export function useTypingPause(onPause: () => void, delay = 8000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(onPause, delay);
  }, [onPause, delay, clearTimer]);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  return { resetTimer, clearTimer };
}
