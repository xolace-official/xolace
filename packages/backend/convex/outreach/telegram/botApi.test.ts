// @vitest-environment edge-runtime
/**
 * The Bot API transport. What can go wrong: a call Telegram never answers
 * holds its action (and the inbound pool's slot) until the action's limit.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BOT_API_TIMEOUT_MS, botApi, TelegramApiError } from "./botApi";

beforeEach(() => {
	process.env.TELEGRAM_BOT_TOKEN = "123456:test-token";
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	Reflect.deleteProperty(process.env, "TELEGRAM_BOT_TOKEN");
});

describe("a Bot API call", () => {
	it("gives up when Telegram doesn't answer in time, as a network failure", async () => {
		const deadline = new AbortController();
		const timeout = vi
			.spyOn(AbortSignal, "timeout")
			.mockReturnValue(deadline.signal);
		// Telegram never answers: only the call's own deadline ends it.
		vi.stubGlobal(
			"fetch",
			vi.fn(
				(_input: RequestInfo | URL, init?: RequestInit) =>
					new Promise((_resolve, reject) => {
						const signal = init?.signal;
						if (!signal) {
							reject(new Error("no deadline on this call"));
							return;
						}
						signal.addEventListener("abort", () => reject(signal.reason));
					})
			)
		);

		const call = botApi.sendMessage({ chat_id: "1", text: "hi" });
		deadline.abort(new DOMException("timed out", "TimeoutError"));

		const error = await call.catch((caught: unknown) => caught);
		expect(timeout).toHaveBeenCalledWith(BOT_API_TIMEOUT_MS);
		expect(error).toBeInstanceOf(DOMException);
		expect(error).not.toBeInstanceOf(TelegramApiError);
	});
});
