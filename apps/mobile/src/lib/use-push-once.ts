/**
 * One screen at a time: `router.push` doesn't dedupe, so a double tap would stack two. The first
 * push holds the rest until the caller's screen is back in focus (what it opened closed), or, if
 * the push never took the focus, for a moment. Lantern's reader and Today use it.
 */
import { useIsFocused } from "expo-router";
import { useEffect, useRef, useState } from "react";

const HOLD_MS = 1000;

export function usePushOnce(): (push: () => void) => void {
	const focused = useIsFocused();
	const held = useRef(false);
	useEffect(() => {
		if (focused) {
			held.current = false;
		}
	}, [focused]);
	// One identity for the screen's life: actions built on it keep it.
	const [once] = useState(() => (push: () => void) => {
		if (held.current) {
			return;
		}
		held.current = true;
		push();
		setTimeout(() => {
			held.current = false;
		}, HOLD_MS);
	});
	return once;
}
