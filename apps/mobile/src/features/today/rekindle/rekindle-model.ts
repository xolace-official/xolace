const NO_REVIVE = "no_revive_available";

export function rekindleOffer(
	reviveStreak: number | undefined,
	expired: number | undefined
): number | null {
	if (reviveStreak === undefined || reviveStreak === expired) {
		return null;
	}
	return reviveStreak;
}

export function keptExpiry(
	reviveStreak: number | undefined,
	expired: number | undefined
): number | undefined {
	return reviveStreak === undefined ? undefined : expired;
}

export function rekindleFailure(error: unknown): "gone" | "retry" {
	if (typeof error !== "object" || error === null || !("data" in error)) {
		return "retry";
	}
	const { data } = error;
	const code =
		typeof data === "object" && data !== null && "code" in data
			? data.code
			: undefined;
	return code === NO_REVIVE ? "gone" : "retry";
}

export type RekindleResult =
	| { ok: true; day: number }
	| { ok: false; failure: "gone" | "retry" };

export async function runRekindle(
	revive: () => Promise<number>
): Promise<RekindleResult> {
	try {
		return { day: await revive(), ok: true };
	} catch (error) {
		return { failure: rekindleFailure(error), ok: false };
	}
}
