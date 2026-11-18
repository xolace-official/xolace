import { useSyncExternalStore } from "react";
import { AccessibilityInfo, Platform } from "react-native";

/**
 * The OS Reduce Transparency setting, live, for the whole app: one AccessibilityInfo
 * listener, however many views read it (as `lib/motion/os-reduced-motion.ts` does for Reduce
 * Motion). React Native has no synchronous read, so the first one starts when this module
 * loads, at launch, and has landed before a screen draws glass; every view mounted after that
 * gets the live value on its first render, with no glass-then-solid flash.
 */

let live = false;
let started = false;
const listeners = new Set<() => void>();

function set(value: boolean) {
	if (value === live) {
		return;
	}
	live = value;
	for (const listener of listeners) {
		listener();
	}
}

/** Starts the one listener and the first read. Idempotent. */
function start() {
	if (started || Platform.OS === "web") {
		return;
	}
	started = true;
	AccessibilityInfo.addEventListener("reduceTransparencyChanged", set);
	AccessibilityInfo.isReduceTransparencyEnabled()
		.then(set)
		.catch(() => undefined);
}

start();

export function subscribeOSReduceTransparency(
	listener: () => void
): () => void {
	start();
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** The live value; false until the first read lands. */
export const liveOSReduceTransparency = (): boolean => live;

/** Live OS Reduce Transparency. */
export function useOSReduceTransparency(): boolean {
	return useSyncExternalStore(
		subscribeOSReduceTransparency,
		liveOSReduceTransparency,
		liveOSReduceTransparency
	);
}
