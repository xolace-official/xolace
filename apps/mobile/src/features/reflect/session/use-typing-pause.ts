import { useCallback, useEffect, useRef } from "react";

/** A typing-inactivity timer that calls `onPause` after `delay` ms. */

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

	useEffect(() => clearTimer, [clearTimer]);

	return { clearTimer, resetTimer };
}
