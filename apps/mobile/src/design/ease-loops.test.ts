import { describe, expect, it, vi } from "vitest";
import { NONE } from "./ease";
import { loopOrSettle, loopProps, SETTLE_BACK_MS } from "./ease-loops";

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
