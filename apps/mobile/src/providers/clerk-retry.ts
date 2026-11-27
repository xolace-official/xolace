const FIRST_RETRY_MS = 1000;
const MAX_RETRY_MS = 30_000;

/**
 * When to load Clerk again after its launch load failed (an offline cold start: Clerk's own load
 * can't reach its server and, in React Native, never tries again). Only while Xolace can be
 * reached, since a retry offline can only fail, and never under someone reading crisis resources
 * from the launch gate, since a retry remounts the app. Backs off when Xolace looks reachable but
 * Clerk still fails. `null`: don't retry now.
 */
export function clerkRetryDelay({
	cantReachXolace,
	failed,
	readingHelp,
	retries,
}: {
	failed: boolean;
	cantReachXolace: boolean;
	readingHelp: boolean;
	retries: number;
}): number | null {
	if (!failed || cantReachXolace || readingHelp) {
		return null;
	}
	return Math.min(FIRST_RETRY_MS * 2 ** retries, MAX_RETRY_MS);
}
