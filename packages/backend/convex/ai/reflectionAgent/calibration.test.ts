import { describe, expect, it } from "vitest";
import {
	type CalibrationSignals,
	computeCalibration,
	deriveCalibrationSignals,
} from "./calibrationSignals";

/** A signal with no evidence — every derivation should stay silent. */
const empty: CalibrationSignals = {
	lengthConfirmed: [],
	lengthMissed: [],
	mood: { heavier: 0, lighter: 0, same: 0 },
	outcomes: { confirmed: 0, gave_up: 0, refined: 0 },
	toneOutcomes: {},
};

describe("computeCalibration", () => {
	it("returns null below the minimum outcome sample", () => {
		expect(
			computeCalibration({
				...empty,
				outcomes: { confirmed: 3, gave_up: 0, refined: 1 },
			})
		).toBeNull();
	});

	it("returns null when there is nothing conclusive to say", () => {
		// 5 outcomes, ~0.6 confirm rate (between the 0.4 and 0.7 thresholds),
		// no length/tone/mood signal → no directive.
		expect(
			computeCalibration({
				...empty,
				outcomes: { confirmed: 3, gave_up: 0, refined: 2 },
			})
		).toBeNull();
	});

	it("emits a confident-mirror directive when first reads usually land", () => {
		const out = computeCalibration({
			...empty,
			outcomes: { confirmed: 8, gave_up: 1, refined: 1 },
		});
		expect(out).toContain("first read usually lands");
	});

	it("emits a leave-room directive when the first mirror often misses", () => {
		const out = computeCalibration({
			...empty,
			outcomes: { confirmed: 2, gave_up: 4, refined: 4 },
		});
		expect(out).toContain("often misses");
	});

	it("prefers shorter mirrors when confirmed ones are markedly shorter", () => {
		const out = computeCalibration({
			...empty,
			lengthConfirmed: [80, 90, 100],
			lengthMissed: [200, 220, 240],
			outcomes: { confirmed: 5, gave_up: 0, refined: 3 },
		});
		expect(out).toContain("Shorter mirrors land better");
	});

	it("prefers fuller mirrors when confirmed ones are markedly longer", () => {
		const out = computeCalibration({
			...empty,
			lengthConfirmed: [240, 260, 280],
			lengthMissed: [90, 100, 110],
			outcomes: { confirmed: 5, gave_up: 0, refined: 3 },
		});
		expect(out).toContain("fuller mirrors");
	});

	it("names the best-landing tone only when tone varies enough", () => {
		const out = computeCalibration({
			...empty,
			outcomes: { confirmed: 6, gave_up: 0, refined: 2 },
			toneOutcomes: {
				direct: { confirmed: 4, total: 4 }, // 1.00
				poetic: { confirmed: 1, total: 4 }, // 0.25
			},
		});
		expect(out).toContain("direct register");
	});

	it("does not name a tone when only one tone has enough samples", () => {
		const out = computeCalibration({
			...empty,
			outcomes: { confirmed: 8, gave_up: 0, refined: 2 },
			toneOutcomes: {
				adaptive: { confirmed: 8, total: 10 },
				poetic: { confirmed: 0, total: 1 }, // below MIN_TONE_SAMPLE
			},
		});
		expect(out).not.toContain("register");
	});

	it("notes when sessions usually leave them lighter", () => {
		const out = computeCalibration({
			...empty,
			mood: { heavier: 1, lighter: 4, same: 2 },
			outcomes: { confirmed: 6, gave_up: 0, refined: 1 },
		});
		expect(out).toContain("lighter");
	});

	it("counsels accompaniment when sessions often leave them heavier", () => {
		const out = computeCalibration({
			...empty,
			mood: { heavier: 3, lighter: 1, same: 1 },
			outcomes: { confirmed: 2, gave_up: 1, refined: 3 },
		});
		expect(out).toContain("stay with them");
	});
});

describe("deriveCalibrationSignals", () => {
	it("tallies outcomes and ignores abandoned sessions", () => {
		const s = deriveCalibrationSignals([
			{ confirmationState: "confirmed", mirrorText: "a" },
			{ confirmationState: "refined", mirrorText: "bb" },
			{ confirmationState: "gave_up", mirrorText: "ccc" },
			{ confirmationState: "abandoned", mirrorText: "dddd" },
			{ confirmationState: undefined, mirrorText: "never" },
		]);
		expect(s.outcomes).toEqual({ confirmed: 1, gave_up: 1, refined: 1 });
	});

	it("buckets mirror lengths by landed vs missed", () => {
		const s = deriveCalibrationSignals([
			{ confirmationState: "confirmed", mirrorText: "1234" }, // 4
			{ confirmationState: "refined", mirrorText: "123456" }, // 6
			{ confirmationState: "gave_up", mirrorText: "12345678" }, // 8
		]);
		expect(s.lengthConfirmed).toEqual([4]);
		expect(s.lengthMissed).toEqual([6, 8]);
	});

	it("attributes tone confirm/total correctly", () => {
		const s = deriveCalibrationSignals([
			{ confirmationState: "confirmed", toneUsed: "direct" },
			{ confirmationState: "refined", toneUsed: "direct" },
			{ confirmationState: "confirmed", toneUsed: "poetic" },
		]);
		expect(s.toneOutcomes.direct).toEqual({ confirmed: 1, total: 2 });
		expect(s.toneOutcomes.poetic).toEqual({ confirmed: 1, total: 1 });
	});

	it("counts only conclusive post-session moods", () => {
		const s = deriveCalibrationSignals([
			{ confirmationState: "confirmed", postSessionMood: "lighter" },
			{ confirmationState: "confirmed", postSessionMood: "heavier" },
			{ confirmationState: "confirmed", postSessionMood: "unsure" },
		]);
		expect(s.mood).toEqual({ heavier: 1, lighter: 1, same: 0 });
	});
});
