import { describe, expect, it } from "vitest";
import type { Beat } from "../sit-model";
import { INHALE, type PhaseKind, TOP } from "./breath";
import {
	breathSeam,
	captionFor,
	closeSeam,
	G,
	handPulse,
	leavingAt,
	phaseSaid,
} from "./phases";

const EXHALE: PhaseKind = 2;

describe("captionFor", () => {
	it("shows Make room's in-line on the inhale, its out-line on the exhale, and keeps it at the top", () => {
		expect(captionFor(true, INHALE, 1)).toBe(0);
		expect(captionFor(true, EXHALE, 0)).toBe(1);
		expect(captionFor(true, TOP, 0)).toBe(0);
		expect(captionFor(true, TOP, 1)).toBe(1);
	});

	it("always shows a single line", () => {
		expect(captionFor(false, EXHALE, 0)).toBe(0);
	});
});

describe("the seam light", () => {
	it("rises with the inhale, swells at the top, falls with the exhale", () => {
		expect(breathSeam(INHALE, 0, 0)).toBeCloseTo(G.inBase);
		expect(breathSeam(INHALE, 1, 1)).toBeCloseTo(0.62);
		expect(breathSeam(TOP, 1, 0.5)).toBeCloseTo(1);
		expect(breathSeam(EXHALE, 0, 1)).toBe(0);
	});

	it("swells once at the end, peaking at .7 s", () => {
		expect(closeSeam(700)).toBeCloseTo(1);
		expect(closeSeam(3000)).toBeCloseTo(G.close);
	});
});

describe("handPulse", () => {
	it("pulses every 2.8 s, closest .4 s in, and skips one with under 1.4 s left", () => {
		expect(handPulse(400, 6000)).toMatchObject({ k: 0, live: true });
		expect(handPulse(400, 6000).env).toBeCloseTo(1);
		expect(handPulse(1000, 6000).env).toBe(0);
		expect(handPulse(2900, 6000)).toMatchObject({ k: 1, live: true });
		expect(handPulse(5700, 6000)).toMatchObject({ env: 0, k: 2, live: false });
	});
});

describe("leavingAt", () => {
	it("leaves over the last .28 s", () => {
		expect(leavingAt(1000, 2000)).toBe(0);
		expect(leavingAt(1860, 2000)).toBeCloseTo(0.5);
		expect(leavingAt(2000, 2000)).toBe(1);
	});
});

describe("phaseSaid", () => {
	const breathe: Beat = {
		cyc: 2,
		k: "breath",
		pat: "sigh",
		t: "Breathe with it.",
	};
	const room: Beat = {
		cyc: 3,
		k: "breath",
		pat: "ext",
		t: ["Breathing in, give it room.", "Breathing out, rest beside it."],
	};

	it("says a one-line caption once, with the first phase", () => {
		expect(phaseSaid(breathe, INHALE, 0, true)).toBe(
			"Breathe with it. Breathe in."
		);
		expect(phaseSaid(breathe, EXHALE, 0, false)).toBe("Breathe out");
	});

	it("says Make room's line for each phase, and only the label at the top", () => {
		expect(phaseSaid(room, EXHALE, 1, false)).toBe(
			"Breathe out. Breathing out, rest beside it."
		);
		expect(phaseSaid(room, TOP, 0, false)).toBe("A little more");
	});

	it("says just the label when there is no caption (Three breaths)", () => {
		expect(phaseSaid({ ...breathe, t: "" }, INHALE, 0, true)).toBe(
			"Breathe in"
		);
	});
});
