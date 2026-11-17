/**
 * One sheet at a time: `router.push` doesn't dedupe, so a double tap would stack two. The first
 * push holds the rest until the reader is back in focus (the sheet closed), or, if the push never
 * took the focus, for a moment.
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
	// One identity for the reader's life: the audio's actions keep it.
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
