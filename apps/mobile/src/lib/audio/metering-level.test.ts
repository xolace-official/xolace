import { describe, expect, it } from "vitest";
import { meteringLevel } from "@/lib/audio/metering-level";

describe("meteringLevel", () => {
	it("reads no metering as silence", () => {
		expect(meteringLevel(undefined)).toBe(0);
		expect(meteringLevel(Number.NaN)).toBe(0);
		expect(meteringLevel(-160)).toBe(0);
	});

	it("keeps room tone near zero", () => {
		expect(meteringLevel(-50)).toBe(0);
		expect(meteringLevel(-55)).toBe(0);
	});

	it("spreads speech across the range", () => {
		expect(meteringLevel(-30)).toBeCloseTo(0.5);
		expect(meteringLevel(-20)).toBeCloseTo(0.75);
	});

	it("caps loud input at one", () => {
		expect(meteringLevel(-10)).toBe(1);
		expect(meteringLevel(0)).toBe(1);
	});
});
