import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	MODERATION_TIMEOUT_MS,
	MODERATION_UNAVAILABLE,
	moderateInput,
} from "./moderation";

/** A request that never answers, but stops when it is aborted, as `fetch` does. */
const hangingFetch = (_url: string, init: RequestInit) =>
	new Promise<never>((_resolve, reject) => {
		init.signal?.addEventListener("abort", () =>
			reject(new DOMException("Aborted", "AbortError"))
		);
	});

describe("moderateInput", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubEnv("OPENAI_API_KEY", "test-key");
		vi.spyOn(console, "error").mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("gives up on a hung request and reports moderation unavailable", async () => {
		vi.stubGlobal("fetch", hangingFetch);
		const result = moderateInput("words");
		await vi.advanceTimersByTimeAsync(MODERATION_TIMEOUT_MS);
		await expect(result).resolves.toEqual(MODERATION_UNAVAILABLE);
	});

	it("stops the request as soon as the caller stops waiting", async () => {
		const fetchSpy = vi.fn(hangingFetch);
		vi.stubGlobal("fetch", fetchSpy);
		const caller = new AbortController();
		const result = moderateInput("words", caller.signal);
		caller.abort();
		await expect(result).resolves.toEqual(MODERATION_UNAVAILABLE);
		expect(fetchSpy.mock.calls[0]?.[1].signal?.aborted).toBe(true);
	});

	it("returns the verdict of a request that answers in time", async () => {
		vi.stubGlobal("fetch", async () =>
			Response.json({
				results: [
					{
						categories: { "self-harm": true },
						category_scores: { "self-harm": 0.9 },
						flagged: true,
					},
				],
			})
		);
		await expect(moderateInput("words")).resolves.toMatchObject({
			categories: { "self-harm": true },
			flagged: true,
		});
	});
});
