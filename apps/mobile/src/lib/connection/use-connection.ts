import { createContext, use, useSyncExternalStore } from "react";
import {
	type ConnectionFlags,
	type ConnectionModel,
	type Reach,
	reachOf,
} from "./connection-model";

/** Filled by `ConnectionProvider`; null before it mounts, when both flags read false. */
export const ConnectionContext = createContext<ConnectionModel | null>(null);

const NO_SUBSCRIPTION = () => () => undefined;

// Only the boolean, so a component re-renders when its flag flips, not on every Convex request.
function useFlag(flag: keyof ConnectionFlags): boolean {
	const model = use(ConnectionContext);
	return useSyncExternalStore(
		model?.subscribe ?? NO_SUBSCRIPTION,
		() => model?.flags()[flag] ?? false
	);
}

/** The device has had no internet for 3 seconds in a row. */
export const useOffline = (): boolean => useFlag("offline");

/** Xolace's connection has been down for 3 seconds in a row, or the device is offline. */
export const useCantReachXolace = (): boolean => useFlag("cantReachXolace");

/** Both flags as one answer, for copy that says "offline" only when the device is. */
export const useReach = (): Reach =>
	reachOf({ cantReachXolace: useCantReachXolace(), offline: useOffline() });
