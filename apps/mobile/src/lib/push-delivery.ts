import { getPushPermissionState, requestPushToken } from "@/lib/push-token";

export type PushReadiness = "ready" | "registered" | "blocked" | "unavailable";

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

export function deviceTimezone(): string | null {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
	} catch {
		return null;
	}
}
