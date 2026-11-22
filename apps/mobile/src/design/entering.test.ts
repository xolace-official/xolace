import { describe, expect, it, vi } from "vitest";
import { FADE_IN } from "./ease";
import { fadeUp, fadeUpProps, riseIn } from "./entering";
import { SETTLE } from "./springs";

vi.mock("react-native-reanimated", () => import("./testing/reanimated-stub"));
vi.mock("react-native-ease/uniwind", () => ({ EaseView: () => null }));

const EASE_OUT = { bezier: [0.2, 0.8, 0.2, 1] };
const REDUCED_ENTER = { motion: "never", ms: 200 };

type Worklet = () => {
	initialValues: unknown;
	animations: { opacity: unknown; transform: unknown[] };
};

describe("Reanimated enters (each played as chosen: reduceMotion never)", () => {
	it("reduced: the 200 ms fade, played even under ReducedMotionConfig", () => {
		expect(riseIn(300, true)).toMatchObject(REDUCED_ENTER);
		expect(fadeUp(300, 500, 20, true)).toMatchObject(REDUCED_ENTER);
	});

	it("rise: opacity 360 ms ease-out and translateY on SETTLE, both delayed", () => {
		const frame = (riseIn(120, false) as Worklet)();
		expect(frame.initialValues).toEqual({
			opacity: 0,
			transform: [{ translateY: 14 }],
		});
		expect(frame.animations.opacity).toEqual({
			animation: {
				config: { duration: 360, easing: EASE_OUT, reduceMotion: "never" },
				kind: "timing",
				to: 1,
			},
			delay: 120,
			kind: "delay",
			reduceMotion: "never",
		});
		expect(frame.animations.transform).toEqual([
			{
				translateY: {
					animation: {
						config: { ...SETTLE, reduceMotion: "never" },
						kind: "spring",
						to: 0,
					},
					delay: 120,
					kind: "delay",
					reduceMotion: "never",
				},
			},
		]);
	});

	it("fadeUp: one timing for opacity and the rise", () => {
		const frame = (fadeUp(50, 380, 8, false) as Worklet)();
		const timing = (to: number) => ({
			animation: {
				config: { duration: 380, easing: EASE_OUT, reduceMotion: "never" },
				kind: "timing",
				to,
			},
			delay: 50,
			kind: "delay",
			reduceMotion: "never",
		});
		expect(frame.initialValues).toEqual({
			opacity: 0,
			transform: [{ translateY: 8 }],
		});
		expect(frame.animations.opacity).toEqual(timing(1));
		expect(frame.animations.transform).toEqual([{ translateY: timing(0) }]);
	});
});

describe("fadeUp on Ease", () => {
	it("reduced: the opacity fade, no transforms, no delay", () => {
		expect(fadeUpProps(300, 500, 20, true)).toBe(FADE_IN);
	});

	it("one timing for both, with the curve passed in", () => {
		const curve: [number, number, number, number] = [0.23, 1, 0.32, 1];
		const timing = { delay: 200, duration: 380, easing: curve, type: "timing" };
		expect(fadeUpProps(200, 380, 8, false, curve)).toEqual({
			animate: { opacity: 1, translateY: 0 },
			initialAnimate: { opacity: 0, translateY: 8 },
			transition: { opacity: timing, transform: timing },
		});
	});

	it("defaults to the boards' ease-out", () => {
		const props = fadeUpProps(0, 400, 6, false);
		expect(props.transition).toMatchObject({
			opacity: { easing: [0.2, 0.8, 0.2, 1] },
		});
	});
});
