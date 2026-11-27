import { useFocusEffect } from "expo-router";
import { useSyncExternalStore } from "react";
import { createOfflineClaims } from "./offline-claim";

const claims = createOfflineClaims();

/**
 * For a screen that shows its own connection message: the root offline banner hides while
 * this screen is focused. Tied to focus, not the route's name.
 */
export function useClaimOfflineMessage(): void {
	useFocusEffect(claims.claim);
}

/** Whether a focused screen is showing its own connection message. */
export const useOfflineMessageClaimed = (): boolean =>
	useSyncExternalStore(claims.subscribe, claims.claimed);
