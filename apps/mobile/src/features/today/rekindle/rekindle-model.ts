/**
 * Reviving a streak that broke yesterday, with one streak saver (#437). The offer is
 * `users.getFullContext`'s `reviveStreak`: the count a saver would bring back, until
 * the day ends.
 */

/** The server's answer when the window closed or the saver is gone (`streaks/revive.ts`). */
const NO_REVIVE = "no_revive_available";

/**
 * The offer to show. The query doesn't re-run when the window closes at midnight, so an
 * offer the server turned down (`expired`) stays hidden until the query drops it.
 */
export function rekindleOffer(
	reviveStreak: number | undefined,
	expired: number | undefined
): number | null {
	if (reviveStreak === undefined || reviveStreak === expired) {
		return null;
	}
	return reviveStreak;
}

/**
 * The turned-down offer to keep hiding: forgotten once the query drops the offer, so a
 * later break's revive at the same count still shows.
 */
export function keptExpiry(
	reviveStreak: number | undefined,
	expired: number | undefined
): number | undefined {
	return reviveStreak === undefined ? undefined : expired;
}

/**
 * What a failed revive means: the offer is gone (hide it), or anything else (offline, a
 * server hiccup), which leaves the chip up to try again.
 */
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

/** Spend the saver: the revived streak's count, or what the failure means. */
export async function runRekindle(
	revive: () => Promise<number>
): Promise<RekindleResult> {
	try {
		return { day: await revive(), ok: true };
	} catch (error) {
		return { failure: rekindleFailure(error), ok: false };
	}
}
