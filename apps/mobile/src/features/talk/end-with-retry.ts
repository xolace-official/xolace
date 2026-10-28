// Ending a talk has to land. A "Just end" lost to one failed call leaves the
// session to the idle check, which closes it without the flag, and the mirror
// opens on home after all. `talk.session.end` and `markMirrorLater` are
// idempotent, so they can go again.

import { ConvexError } from "convex/values";

/** Waits before each retry; all well inside the talk's idle window. */
const END_RETRY_MS = [1000, 3000, 10_000];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function endWithRetry<T>(
	end: () => Promise<T>,
	waits: readonly number[] = END_RETRY_MS,
	sleep: (ms: number) => Promise<unknown> = wait
): Promise<T> {
	for (const ms of waits) {
		try {
			return await end();
		} catch (e) {
			// The server's answer (not the person's talk, say) won't change.
			if (e instanceof ConvexError) {
				throw e;
			}
			await sleep(ms);
		}
	}
	return await end();
}
