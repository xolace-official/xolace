import { describe, expect, it, vi } from "vitest";
import { breathAt, breathPhase, breathProps, breathRest } from "./ease-breath";
import { loopProps } from "./ease-loops";

vi.mock("react-native-reanimated", () => import("./testing/reanimated-stub"));
vi.mock("react-native-ease/uniwind", () => ({ EaseView: () => null }));

const SINE: [number, number, number, number] = [0.37, 0, 0.63, 1];

describe("breathProps", () => {
	const from = { scale: 1, translateX: 0 };
	const to = { scale: 1.07, translateX: 16 };
	it("breathProps is a sine there and back", () => {
		expect(breathProps(4800, false, from, to)).toEqual(
			loopProps({ from, periodMs: 4800, reduced: false, to })
		);
	});
});

describe("phased breath", () => {
	it("finds the half and how far through it the phase is", () => {
		expect(breathPhase(1000, 250)).toEqual({
			half: 500,
			leadMs: 250,
			rising: true,
			u: 0.5,
		});
		expect(breathPhase(1000, 750)).toMatchObject({ rising: false, u: 0.5 });
		// A phase past the period, or negative, wraps.
		expect(breathPhase(1000, 1250)).toEqual(breathPhase(1000, 250));
		expect(breathPhase(1000, -250)).toEqual(breathPhase(1000, 750));
	});

	// The bezier's y(x), with x handles at ⅓ and ⅔, is a cubic in time; compare it with the cosine.
	const hermite = ([, y1, , y2]: number[], x: number) =>
		3 * (1 - x) ** 2 * x * (y1 ?? 0) +
		3 * (1 - x) * x ** 2 * (y2 ?? 1) +
		x ** 3;

	for (const u of [0, 0.125, 0.25, 0.5, 0.75, 0.9]) {
		it(`from ${u} of the half, the lead-in follows the rest of the cosine within 2%`, () => {
			const curve = breathRest(u);
			const start = breathAt(u);
			for (let i = 0; i <= 20; i += 1) {
				const x = i / 20;
				const want = (breathAt(u + (1 - u) * x) - start) / (1 - start);
				expect(Math.abs(hermite(curve, x) - want)).toBeLessThan(0.02);
			}
		});
	}

	it("at the end of a half there is nothing left: the plain sine", () => {
		expect(breathRest(1)).toEqual(SINE);
	});
});
