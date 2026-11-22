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
