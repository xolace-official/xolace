import { useSyncExternalStore } from "react";
import { AccessibilityInfo, Platform } from "react-native";

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

export const liveOSReduceTransparency = (): boolean => live;

export function useOSReduceTransparency(): boolean {
	return useSyncExternalStore(
		subscribeOSReduceTransparency,
		liveOSReduceTransparency,
		liveOSReduceTransparency
	);
}
