import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHECK_CEILING_MS, createCheck } from "./check-store";
import type { SendAnswer } from "./letters-model";

const CARE: SendAnswer = { next: "care" };
const FIXABLE: SendAnswer = {
	held: false,
	line: "Try a softer word.",
	next: "back",
};
const RISE: SendAnswer = { next: "rise" };

const pending = () => {
	let answer: (a: SendAnswer | null) => void = () => undefined;
	const ask = vi.fn(
		() =>
			new Promise<SendAnswer | null>((resolve) => {
				answer = resolve;
			})
	);
	return { answer: (a: SendAnswer | null) => answer(a), ask };
};

describe("createCheck", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs one check at a time: a second send while one runs never starts", async () => {
		const check = createCheck();
		const first = pending();
		const second = vi.fn(async () => RISE);
		const running = check.run(first.ask, vi.fn());
		expect(await check.run(second, vi.fn())).toBe("busy");
		expect(second).not.toHaveBeenCalled();
		first.answer(RISE);
		expect(await running).toEqual(RISE);
		expect(first.ask).toHaveBeenCalledOnce();
	});

	it("clears the flag only once the draft change has landed", async () => {
		const check = createCheck();
		const { answer, ask } = pending();
		const seen: boolean[] = [];
		const running = check.run(ask, () =>
			seen.push(check.store.getState().running)
		);
		expect(check.store.getState().running).toBe(true);
		answer(RISE);
		await running;
		expect(seen).toEqual([true]);
		expect(check.store.getState().running).toBe(false);
	});

	it("frees Write past the ceiling when the check never answers", async () => {
		const check = createCheck();
		const { ask } = pending();
		const running = check.run(ask, vi.fn());
		vi.advanceTimersByTime(CHECK_CEILING_MS - 1);
		expect(check.store.getState().running).toBe(true);
		vi.advanceTimersByTime(1);
		expect(check.store.getState().running).toBe(false);
		expect(await running).toBe("ceiling");
	});

	it("still lands an answer that comes past the ceiling, if no check started since", async () => {
		const check = createCheck();
		const { answer, ask } = pending();
		const settle = vi.fn();
		const running = check.run(ask, settle);
		vi.advanceTimersByTime(CHECK_CEILING_MS);
		await running;
		answer(CARE);
		await vi.waitFor(() => expect(settle).toHaveBeenCalledWith(CARE));
		expect(check.store.getState().unplayed).toEqual(CARE);
	});

	it("drops a late answer once a newer check has started", async () => {
		const check = createCheck();
		const old = pending();
		const oldSettle = vi.fn();
		check.run(old.ask, oldSettle);
		vi.advanceTimersByTime(CHECK_CEILING_MS);
		const fresh = pending();
		const freshRun = check.run(fresh.ask, vi.fn());
		old.answer(RISE);
		await Promise.resolve();
		await Promise.resolve();
		expect(oldSettle).not.toHaveBeenCalled();
		expect(check.store.getState().running).toBe(true);
		fresh.answer(FIXABLE);
		expect(await freshRun).toEqual(FIXABLE);
	});

	it("keeps a care answer for a reopened Write until a screen plays it", async () => {
		const check = createCheck();
		const { answer, ask } = pending();
		const running = check.run(ask, vi.fn());
		answer(CARE);
		await running;
		expect(check.store.getState().unplayed).toEqual(CARE);
		check.played();
		expect(check.store.getState().unplayed).toBeNull();
	});

	it("keeps a line, but not a pass or a failure, for later", async () => {
		const check = createCheck();
		for (const [answer, kept] of [
			[FIXABLE, FIXABLE],
			[RISE, null],
			[null, null],
		] as const) {
			const run = pending();
			const running = check.run(run.ask, vi.fn());
			run.answer(answer);
			await running;
			expect(check.store.getState().unplayed).toEqual(kept);
		}
	});

	it("treats a check that throws as failed, and frees Write", async () => {
		const check = createCheck();
		const settle = vi.fn();
		expect(
			await check.run(() => Promise.reject(new Error("x")), settle)
		).toBeNull();
		expect(settle).toHaveBeenCalledWith(null);
		expect(check.store.getState().running).toBe(false);
	});
});
