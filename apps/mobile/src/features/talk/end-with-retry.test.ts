import { ConvexError } from "convex/values";
import { describe, expect, it, vi } from "vitest";
import { endWithRetry } from "@/src/features/talk/end-with-retry";

const noWait = () => Promise.resolve();

describe("endWithRetry", () => {
	it("sends the end again after a failed call", async () => {
		const end = vi
			.fn<() => Promise<boolean>>()
			.mockRejectedValueOnce(new Error("Network request failed"))
			.mockResolvedValueOnce(true);
		await expect(endWithRetry(end, [1000], noWait)).resolves.toBe(true);
		expect(end).toHaveBeenCalledTimes(2);
	});

	it("gives up after the last retry", async () => {
		const end = vi
			.fn<() => Promise<boolean>>()
			.mockRejectedValue(new Error("Network request failed"));
		await expect(endWithRetry(end, [1, 2], noWait)).rejects.toThrow(
			"Network request failed"
		);
		expect(end).toHaveBeenCalledTimes(3);
	});

	it("doesn't retry the server's own refusal", async () => {
		const end = vi
			.fn<() => Promise<boolean>>()
			.mockRejectedValue(new ConvexError({ code: "not_a_talk" }));
		await expect(endWithRetry(end, [1, 2], noWait)).rejects.toBeInstanceOf(
			ConvexError
		);
		expect(end).toHaveBeenCalledTimes(1);
	});
});
