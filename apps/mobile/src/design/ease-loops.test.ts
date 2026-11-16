import { describe, expect, it, vi } from "vitest";
import { NONE } from "./ease";
import {
	leadInDone,
	loopOrSettle,
	loopProps,
	runFor,
	SETTLE_BACK_MS,
	startRun,
} from "./ease-loops";

vi.mock("react-native-reanimated", () => import("./testing/reanimated-stub"));
vi.mock("react-native-ease/uniwind", () => ({ EaseView: () => null }));

const SINE: [number, number, number, number] = [0.37, 0, 0.63, 1];

describe("loopProps", () => {
	const from = { scale: 1, translateX: 0 };
	const to = { scale: 1.07, translateX: 16 };

	it("reverse: half the period per leg, sine by default", () => {
		expect(loopProps({ from, periodMs: 12_000, reduced: false, to })).toEqual({
			animate: to,
			initialAnimate: from,
			transition: {
				duration: 6000,
				easing: SINE,
				loop: "reverse",
				type: "timing",
			},
		});
	});

	it("repeat: the full period per cycle, with a one-off delay", () => {
		const props = loopProps({
			delay: 300,
			easing: "linear",
			from,
			mode: "repeat",
			periodMs: 1000,
			reduced: false,
			to,
		});
		expect(props.transition).toEqual({
			delay: 300,
			duration: 1000,
			easing: "linear",
			loop: "repeat",
			type: "timing",
		});
	});

	it("reduced: no loop, the element rests at `from`", () => {
		expect(loopProps({ from, periodMs: 12_000, reduced: true, to })).toEqual({
			animate: from,
			initialAnimate: from,
			transition: NONE,
		});
	});

	it("a period of 0 holds still too", () => {
		expect(
			loopProps({ from, periodMs: 0, reduced: false, to }).transition
		).toEqual(NONE);
	});
});

describe("loopOrSettle", () => {
	const from = { opacity: 0.7 };
	const to = { opacity: 1 };

	it("running: the loop", () => {
		expect(
			loopOrSettle({ from, periodMs: 1800, reduced: false, running: true, to })
		).toEqual(loopProps({ from, periodMs: 1800, reduced: false, to }));
	});

	it("stopped: eases back to `from` and stops (no `paused`)", () => {
		const props = loopOrSettle({
			from,
			periodMs: 1800,
			reduced: false,
			running: false,
			to,
		});
		expect(props.animate).toEqual(from);
		expect(props.transition).toMatchObject({
			duration: SETTLE_BACK_MS,
			type: "timing",
		});
	});

	it("reduced: rests at `from` at once, even when asked to run", () => {
		expect(
			loopOrSettle({ from, periodMs: 1800, reduced: true, running: true, to })
				.transition
		).toEqual(NONE);
	});
});

describe("the loop run (useLoopRun, usePhasedBreath)", () => {
	const stopped = startRun(false, "4800");

	it("same input, same object: no re-render", () => {
		expect(runFor(stopped, false, "4800")).toBe(stopped);
	});

	it("turning on starts a new run; turning off keeps the count", () => {
		const on = runFor(stopped, true, "4800");
		expect(on).toEqual({ looping: false, n: 1, timing: "4800", was: true });
		expect(runFor(on, false, "4800")).toMatchObject({ n: 1, was: false });
	});

	it("a new period while running starts again (the night slowdown)", () => {
		const on = runFor(stopped, true, "4800");
		const looping = leadInDone(on, true, true);
		expect(runFor(looping, true, "6720")).toEqual({
			looping: false,
			n: 2,
			timing: "6720",
			was: true,
		});
	});

	it("a new period while stopped waits for the next start", () => {
		expect(runFor(stopped, false, "6720")).toMatchObject({
			n: 0,
			timing: "6720",
		});
	});

	it("the lead-in ends into the loop only when it finished while running", () => {
		const on = runFor(stopped, true, "4800");
		expect(leadInDone(on, true, true).looping).toBe(true);
		expect(leadInDone(on, true, false)).toBe(on);
		expect(leadInDone(on, false, true)).toBe(on);
	});
});
