import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Reading } from "@/features/intake/v2/heard";
import {
	READ_TIMEOUT_MS,
	settleRead,
} from "@/features/intake/v2/use-read-first-answer";

vi.mock("@sentry/react-native", () => ({ captureException: vi.fn() }));
vi.mock("convex/react", () => ({ useAction: vi.fn() }));

const SAFETY: Reading = {
	resources: [],
	route: "safety",
	safeguardLevel: "crisis",
};

/** A read the test answers by hand, on its own schedule. */
const deferred = () => {
	let resolve: (reading: Reading) => void = () => undefined;
	let reject: (error: Error) => void = () => undefined;
	const promise = new Promise<Reading>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, reject, resolve };
};

describe("settleRead", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("hands back a reading that lands in time", async () => {
		await expect(settleRead(async () => SAFETY)).resolves.toEqual({
			reading: SAFETY,
		});
	});

	it("falls back on a read that fails", async () => {
		await expect(
			settleRead(() => Promise.reject(new Error("offline")))
		).resolves.toEqual({ fallback: "error" });
	});

	it("falls back on a read that throws as it starts", async () => {
		await expect(
			settleRead(() => {
				throw new Error("no client");
			})
		).resolves.toEqual({ fallback: "error" });
	});

	it("keeps a read that outlives the wait, for its late verdict", async () => {
		const read = deferred();
		const settling = settleRead(() => read.promise);
		await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
		const outcome = await settling;
		if (!("late" in outcome)) {
			throw new Error("expected a timeout with a late read");
		}
		expect(outcome.fallback).toBe("timeout");
		read.resolve(SAFETY);
		await expect(outcome.late).resolves.toEqual(SAFETY);
	});

	it("settles a late read that fails to nothing, never a rejection", async () => {
		const read = deferred();
		const settling = settleRead(() => read.promise);
		await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
		const outcome = await settling;
		if (!("late" in outcome)) {
			throw new Error("expected a timeout with a late read");
		}
		read.reject(new Error("gave up"));
		await expect(outcome.late).resolves.toBeNull();
	});
});
