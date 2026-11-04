import { useRef } from "react";

/**
 * Runs only the first way off a badge moment. `router.back()` acts on whatever
 * is focused, and the navigation state only moves on the next render, so a
 * second press on a busy JS thread would close the screen underneath too.
 */
export function useLeaveOnce() {
	const left = useRef(false);
	return (leave: () => void) => {
		if (left.current) {
			return;
		}
		left.current = true;
		leave();
	};
}
