import { describe, expect, it } from "vitest";
import { clerkRetryDelay } from "./clerk-retry";

const FAILED = {
	cantReachXolace: false,
	failed: true,
	readingHelp: false,
	retries: 0,
};

describe("clerkRetryDelay", () => {
	it("never retries a Clerk that loaded or is still loading", () => {
		expect(clerkRetryDelay({ ...FAILED, failed: false })).toBeNull();
	});

	it("waits for Xolace to be reachable again before retrying", () => {
		expect(clerkRetryDelay({ ...FAILED, cantReachXolace: true })).toBeNull();
	});

	it("retries soon once Xolace is back", () => {
		expect(clerkRetryDelay(FAILED)).toBe(1000);
	});

	it("backs off when a retry fails while Xolace looks reachable", () => {
		expect(clerkRetryDelay({ ...FAILED, retries: 1 })).toBe(2000);
		expect(clerkRetryDelay({ ...FAILED, retries: 3 })).toBe(8000);
		expect(clerkRetryDelay({ ...FAILED, retries: 20 })).toBe(30_000);
	});

	it("doesn't restart the app under someone reading crisis resources", () => {
		expect(clerkRetryDelay({ ...FAILED, readingHelp: true })).toBeNull();
	});
});
