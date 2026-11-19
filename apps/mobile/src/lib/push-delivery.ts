import { getPushPermissionState, requestPushToken } from "@/lib/push-token";

/**
 * Where turning a notification on stands, after the OS was asked:
 * `ready` (already delivering), `registered` (a token was just registered:
 * sync the time zone), `blocked` (only device settings can allow it), or
 * `unavailable` (no token, or registering failed: write nothing).
 */
export type PushReadiness = "ready" | "registered" | "blocked" | "unavailable";

/**
 * Asks for permission and registers this device's token when it isn't
 * delivering yet. Settings' switches and Quotes' daily quote offer share it,
 * so both turn push on the same way. The token is dropped whenever every kind
 * of notification goes quiet, so it's registered again here.
 */
export async function preparePushDelivery(
	alreadyDelivering: boolean,
	register: (pushToken: string) => Promise<unknown>
): Promise<PushReadiness> {
	const permission = await getPushPermissionState();
	if (permission === "blocked") {
		return "blocked";
	}
	if (permission === "granted" && alreadyDelivering) {
		return "ready";
	}
	const token = await requestPushToken();
	if (!token) {
		return "unavailable";
	}
	try {
		await register(token);
	} catch {
		return "unavailable";
	}
	return "registered";
}

/** The device's IANA time zone, for the server's local-hour gates; null when unknown. */
export function deviceTimezone(): string | null {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
	} catch {
		return null;
	}
}
