import { describe, expect, it, vi } from "vitest";
import {
	delayed,
	enter,
	FADE_IN,
	fadeTiming,
	GLIDE,
	NONE,
	POP,
	PRESS_TIMING,
	REDUCED,
	SETTLE,
	springTransition,
	stateTransition,
} from "./ease";
import { GLIDE as RN_GLIDE, SETTLE as RN_SETTLE } from "./springs";

vi.mock("react-native-reanimated", () => import("./testing/reanimated-stub"));
vi.mock("react-native-ease/uniwind", () => ({ EaseView: () => null }));

/**
 * Reanimated 4.7's duration-spring solver (`calculateNewStiffnessToMatchDuration` in
 * `react-native-reanimated/src/animation/spring/springUtils.ts`): the stiffness whose energy
 * falls to its threshold at 1.5 × duration, found by bisection. x0 = 1, v0 = 0, mass 1.
 */
function reanimatedStiffness(dampingRatio: number, durationMs: number) {
	const threshold = 6e-9;
	const settle = (durationMs * 1.5) / 1000;
	const diff = (k: number) => {
		const w = Math.sqrt(k) * dampingRatio;
		const decay = Math.exp(-w * settle);
		const x = (1 + w * settle) * decay;
		const v = (1 + w * settle) * decay * -w + w * decay;
		return (0.5 * k * x ** 2 + 0.5 * v ** 2) / (0.5 * k) - threshold;
	};
	let min = Number.EPSILON;
	let max = 8e3;
	const direction = diff(max) >= diff(min) ? 1 : -1;
	let k = (min + max) / 2;
	for (let i = 0; i < 100 && Math.abs(diff(k)) > threshold * 1e-3; i++) {
		if (diff(k) * direction < 0) {
			min = k;
		} else {
			max = k;
		}
		k = (min + max) / 2;
	}
	return k;
}

describe("Ease twins of the Reanimated duration springs", () => {
	for (const [name, ease, reanimated] of [
		["SETTLE", SETTLE, RN_SETTLE],
		["GLIDE", GLIDE, RN_GLIDE],
	] as const) {
		it(`${name}: the stiffness and damping Reanimated's solver picks`, () => {
			const zeta = reanimated.dampingRatio ?? 0;
			const k = reanimatedStiffness(zeta, reanimated.duration ?? 0);
			expect(ease.stiffness).toBeCloseTo(k, 0);
			expect(ease.damping).toBeCloseTo(2 * zeta * Math.sqrt(k), 0);
		});
	}
});

describe("transitions", () => {
	it("springTransition: the named Ease spring, or the 200 ms fade when reduced", () => {
		expect(springTransition("settle", false)).toBe(SETTLE);
		expect(springTransition("pop", false)).toBe(POP);
		expect(springTransition("glide", true)).toBe(REDUCED);
		expect(REDUCED).toEqual({
			duration: 200,
			easing: [0.455, 0.03, 0.515, 0.955],
			type: "timing",
		});
	});

	it("press and fade timings", () => {
		expect(PRESS_TIMING).toEqual({
			duration: 150,
			easing: [0.23, 1, 0.32, 1],
			type: "timing",
		});
		expect(fadeTiming()).toEqual({
			duration: 200,
			easing: [0.25, 0.46, 0.45, 0.94],
			type: "timing",
		});
		expect(fadeTiming(400).duration).toBe(400);
	});

	it("delayed: no delay key at 0, none on a `none`", () => {
		expect(delayed(PRESS_TIMING, 0)).toBe(PRESS_TIMING);
		expect(delayed(NONE, 300)).toBe(NONE);
		expect(delayed(PRESS_TIMING, 300)).toEqual({ ...PRESS_TIMING, delay: 300 });
	});

	it("enter: opacity and transform on their own transitions, both delayed", () => {
		expect(
			enter(
				{ opacity: 0, scale: 0.5 },
				{ opacity: 1, scale: 1 },
				REDUCED,
				POP,
				120
			)
		).toEqual({
			animate: { opacity: 1, scale: 1 },
			initialAnimate: { opacity: 0, scale: 0.5 },
			transition: {
				opacity: { ...REDUCED, delay: 120 },
				transform: { ...POP, delay: 120 },
			},
		});
	});

	it("the reduced enter is an opacity fade with no transforms", () => {
		expect(FADE_IN).toEqual({
			animate: { opacity: 1 },
			initialAnimate: { opacity: 0 },
			transition: REDUCED,
		});
	});
});

describe("stateTransition", () => {
	const normal = { damping: 15.5, stiffness: 240, type: "spring" } as const;

	it("passes the normal transition through", () => {
		expect(stateTransition(false, normal)).toBe(normal);
	});

	it("reduced: opacity fades, everything else applies at once", () => {
		expect(stateTransition(true, normal)).toEqual({
			default: NONE,
			opacity: REDUCED,
		});
	});
});
