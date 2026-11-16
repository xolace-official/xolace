import { useSyncExternalStore } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { useReducedMotion as useReducedMotionAtLaunch } from "react-native-reanimated";

/**
 * The OS Reduce Motion setting, live, for the whole app: one AccessibilityInfo listener,
 * however many components read it. Until the first event or read lands, it reports the value
 * Reanimated read synchronously at launch, so a first render is never "full motion" by
 * mistake. Read it through `useEffectiveReducedMotion()`, which puts the in-app setting first;
 * use this hook alone only where the OS setting itself is wanted.
 */

let live: boolean | null = null;
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

/** Starts the one listener and the first read. Idempotent; runs on the first subscribe. */
function start() {
	if (started || Platform.OS === "web") {
		return;
	}
	started = true;
	AccessibilityInfo.addEventListener("reduceMotionChanged", set);
	AccessibilityInfo.isReduceMotionEnabled()
		.then(set)
		.catch(() => undefined);
}

export function subscribeOSReducedMotion(listener: () => void): () => void {
	start();
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** The live value, or `null` before the first read or change has landed. */
export const liveOSReducedMotion = (): boolean | null => live;

/** Live OS Reduce Motion; the launch value until the first read lands. */
export function useOSReducedMotion(): boolean {
	const atLaunch = useReducedMotionAtLaunch();
	const value = useSyncExternalStore(
		subscribeOSReducedMotion,
		liveOSReducedMotion,
		liveOSReducedMotion
	);
	return value ?? atLaunch;
}
