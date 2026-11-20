import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { playReply, type ReplySteps, ventClock } from "./vent-clock";

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

describe("ventClock", () => {
	it("runs what it schedules while the screen is there", () => {
		const clock = ventClock();
		const fn = vi.fn();
		clock.at(100, fn);
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledOnce();
	});

	it("cancels what's pending and refuses new timers once the screen has gone", () => {
		const clock = ventClock();
		const early = vi.fn();
		const late = vi.fn();
		clock.at(100, early);
		clock.stop();
		clock.at(100, late);
		vi.runAllTimers();
		expect(early).not.toHaveBeenCalled();
		expect(late).not.toHaveBeenCalled();
		expect(clock.live).toBe(false);
	});

	it("reopens when the effect runs again (development's double effects)", () => {
		const clock = ventClock();
		clock.stop();
		clock.start();
		const fn = vi.fn();
		clock.at(10, fn);
		vi.advanceTimersByTime(10);
		expect(fn).toHaveBeenCalledOnce();
	});
});

function reply() {
	let resolveVoice: (ms: number | null) => void = () => undefined;
	const clock = ventClock();
	const steps: ReplySteps = {
		begin: vi.fn(),
		clock,
		end: vi.fn(),
		say: vi.fn(),
		speak: () =>
			new Promise((resolve) => {
				resolveVoice = resolve;
			}),
	};
	return { clock, steps, voice: (ms: number | null) => resolveVoice(ms) };
}

describe("playReply", () => {
	it("lights the words from when the voice starts, reads them, then ends", async () => {
		const { steps, voice } = reply();
		const done = playReply(["a", "bbb"], steps);
		voice(null);
		await done;
		expect(steps.begin).toHaveBeenCalledWith([0, 240]);
		vi.runAllTimers();
		expect(steps.say).toHaveBeenCalledWith("a bbb");
		expect(steps.end).toHaveBeenCalledOnce();
	});

	it("does nothing if the screen closed while the voice was loading", async () => {
		const { clock, steps, voice } = reply();
		const done = playReply(["a", "bbb"], steps);
		clock.stop();
		voice(1200);
		await done;
		vi.runAllTimers();
		expect(steps.begin).not.toHaveBeenCalled();
		expect(steps.say).not.toHaveBeenCalled();
		expect(steps.end).not.toHaveBeenCalled();
	});

	it("cancels the reading and the burn if the screen closes while the words light", async () => {
		const { clock, steps, voice } = reply();
		const done = playReply(["a", "bbb"], steps);
		voice(null);
		await done;
		clock.stop();
		vi.runAllTimers();
		expect(steps.say).not.toHaveBeenCalled();
		expect(steps.end).not.toHaveBeenCalled();
	});
});
