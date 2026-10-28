import { useSyncExternalStore } from "react";

/** Whether the native tab bar is hidden. A module store, not context, so no provider re-renders
 * every tab; frees the strip for `Stack.Toolbar`. */
let hidden = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function getSnapshot() {
	return hidden;
}

export function setTabBarHidden(nextHidden: boolean) {
	if (hidden === nextHidden) {
		return;
	}
	hidden = nextHidden;
	listeners.forEach((listener) => listener());
}

export function useTabBarHidden() {
	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
