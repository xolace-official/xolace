import { describe, expect, it } from "vitest";
import { CONTROLS_BOTTOM, controlStack } from "./first-run-layout";

const PILL = { h: 56, line: 22, pad: 20 };
const LINK = { h: 36, line: 19, pad: 12 };

describe("the board's bottom controls under Dynamic Type", () => {
	it("keep their board sizes at the default type size", () => {
		expect(controlStack(702, 8, CONTROLS_BOTTOM, [PILL, LINK], 1)).toEqual([
			{ h: 56, max: 1, top: 702 },
			{ h: 36, max: 1, top: 766 },
		]);
	});

	it("grow downward, never past the home indicator", () => {
		const [pill, link] = controlStack(
			702,
			8,
			CONTROLS_BOTTOM,
			[PILL, LINK],
			3.1
		);
		expect(pill.top).toBe(702);
		expect(pill.h).toBeGreaterThanOrEqual(56);
		expect(link.h).toBeGreaterThan(36);
		expect(link.top).toBe(702 + pill.h + 8);
		expect(link.top + link.h).toBeLessThanOrEqual(CONTROLS_BOTTOM);
		// Each label's line still fits inside its box.
		expect(PILL.line * pill.max).toBeLessThanOrEqual(pill.h - PILL.pad);
		expect(LINK.line * link.max).toBeLessThanOrEqual(link.h - LINK.pad);
	});
});
