import { ConvexError } from "convex/values";

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
			if (e instanceof ConvexError) {
				throw e;
			}
			await sleep(ms);
		}
	}
	return await end();
}
