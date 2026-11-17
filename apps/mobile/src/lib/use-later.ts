import { useEffect, useRef } from "react";

/**
 * `setTimeout` that the component owns: every timer it starts is cleared when
 * it unmounts, so a late focus or a late mount never lands on a screen that's gone.
 */
export function useLater() {
	const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
	useEffect(() => {
		const pending = timers.current;
		return () => {
			for (const id of pending) {
				clearTimeout(id);
			}
			pending.clear();
		};
	}, []);
	return (run: () => void, ms: number) => {
		const id = setTimeout(() => {
			timers.current.delete(id);
			run();
		}, ms);
		timers.current.add(id);
	};
}
