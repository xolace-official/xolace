import { useSyncExternalStore } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { useReducedMotion as useReducedMotionAtLaunch } from "react-native-reanimated";

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

export const liveOSReducedMotion = (): boolean | null => live;

export function useOSReducedMotion(): boolean {
	const atLaunch = useReducedMotionAtLaunch();
	const value = useSyncExternalStore(
		subscribeOSReducedMotion,
		liveOSReducedMotion,
		liveOSReducedMotion
	);
	return value ?? atLaunch;
}
