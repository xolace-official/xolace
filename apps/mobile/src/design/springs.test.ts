import { describe, expect, it, vi } from "vitest";
import {
	BLOOM,
	BREATH,
	GLIDE,
	NIGHT_SLOWDOWN,
	POP,
	PRESS,
	press,
	REDUCED_FADE_MS,
	SETTLE,
	spring,
} from "./springs";

vi.mock("react-native-reanimated", () => import("./testing/reanimated-stub"));

describe("the named springs", () => {
	it("keep the redesign's values", () => {
		expect(SETTLE).toEqual({ dampingRatio: 0.82, duration: 340 });
		expect(GLIDE).toEqual({ dampingRatio: 1, duration: 420 });
		expect(BLOOM).toEqual({ damping: 11, mass: 1, stiffness: 160 });
		expect(POP).toEqual({ damping: 15.5, mass: 1, stiffness: 240 });
		expect(PRESS).toMatchObject({
			cardScale: 0.98,
			duration: 150,
			scale: 0.96,
		});
		expect(BREATH).toEqual({
			dayMs: 4800,
			nightMs: 6700,
			rise: 3,
			scale: 1.02,
		});
		expect(NIGHT_SLOWDOWN).toBe(1.4);
	});

	it("spring(): the named spring when motion is full", () => {
		expect(spring("settle", 1, false)).toEqual({
			config: { ...SETTLE, reduceMotion: "never" },
			kind: "spring",
			to: 1,
		});
		expect(spring("pop", 0, false)).toMatchObject({ config: POP });
	});

	it("spring(): the named spring when motion is full, played even if Reanimated would skip it", () => {
		expect(spring("bloom", 1, false)).toEqual({
			config: { ...BLOOM, reduceMotion: "never" },
			kind: "spring",
			to: 1,
		});
	});

	it("spring(): the 200 ms fade when reduced, played even under ReducedMotionConfig", () => {
		expect(spring("glide", 1, true)).toEqual({
			config: { duration: REDUCED_FADE_MS, reduceMotion: "never" },
			kind: "timing",
			to: 1,
		});
	});

	it("press(): 150 ms on the press curve, always played; reduced, applied at once", () => {
		expect(press(0.96, false)).toEqual({
			config: {
				duration: 150,
				easing: { bezier: [0.23, 1, 0.32, 1] },
				reduceMotion: "never",
			},
			kind: "timing",
			to: 0.96,
		});
		expect(press(0.96, true)).toBe(0.96);
	});
});
