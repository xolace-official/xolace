import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Undo } from "../letters-model";
import { createUndoTimer } from "./undo-timer";

const MS = 5000;

const setup = () => {
	const shown: (Undo | null)[] = [];
	const timer = createUndoTimer(MS, (k) => shown.push(k));
	const commit = vi.fn();
	const after = vi.fn();
	return { after, commit, shown, timer };
};

describe("createUndoTimer", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("shows the act at once and commits it at 5 s, then runs after", () => {
		const { timer, commit, after, shown } = setup();
		timer.begin("ack", { after, commit });
		expect(shown).toEqual(["ack"]);
		vi.advanceTimersByTime(MS - 1);
		expect(commit).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(commit).toHaveBeenCalledOnce();
		expect(after).toHaveBeenCalledOnce();
		expect(shown).toEqual(["ack", null]);
	});

	it("commits nothing once Undo cancels it", () => {
		const { timer, commit, after, shown } = setup();
		timer.begin("ack", { after, commit });
		vi.advanceTimersByTime(MS / 2);
		timer.cancel();
		vi.advanceTimersByTime(MS);
		timer.leave();
		expect(commit).not.toHaveBeenCalled();
		expect(after).not.toHaveBeenCalled();
		expect(shown).toEqual(["ack", null]);
	});

	it("commits a running act as the reader leaves, without Hide's way back", () => {
		const { timer, commit, after } = setup();
		timer.begin("hide", { after, commit, hold: true });
		vi.advanceTimersByTime(MS / 2);
		timer.leave();
		expect(commit).toHaveBeenCalledOnce();
		vi.advanceTimersByTime(MS);
		expect(commit).toHaveBeenCalledOnce();
		expect(after).not.toHaveBeenCalled();
	});

	it("doesn't stack timers on a second begin", () => {
		const { timer, commit, after, shown } = setup();
		const second = vi.fn();
		expect(timer.begin("ack", { after, commit })).toBe(true);
		expect(timer.begin("hide", { commit: second })).toBe(false);
		vi.advanceTimersByTime(MS * 2);
		expect(commit).toHaveBeenCalledOnce();
		expect(second).not.toHaveBeenCalled();
		expect(shown).toEqual(["ack", null]);
	});

	it("keeps Hide showing once it commits, so the letter doesn't drift back in (R1)", () => {
		const { timer, commit, after, shown } = setup();
		timer.begin("hide", { after, commit, hold: true });
		vi.advanceTimersByTime(MS);
		expect(commit).toHaveBeenCalledOnce();
		expect(after).toHaveBeenCalledOnce();
		expect(shown).toEqual(["hide"]);
		timer.leave();
		expect(commit).toHaveBeenCalledOnce();
	});

	it("leaves a held Hide up when Undo comes after it committed", () => {
		const { timer, commit, after, shown } = setup();
		timer.begin("hide", { after, commit, hold: true });
		vi.advanceTimersByTime(MS);
		timer.cancel();
		expect(shown).toEqual(["hide"]);
		expect(commit).toHaveBeenCalledOnce();
	});

	it("commits once, not again as the reader leaves after it", () => {
		const { timer, commit, after } = setup();
		timer.begin("ack", { after, commit });
		vi.advanceTimersByTime(MS);
		timer.leave();
		expect(commit).toHaveBeenCalledOnce();
	});
});
