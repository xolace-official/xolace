import { describe, expect, it } from "vitest";
import { rateCtaState } from "./utils";

describe("rateCtaState", () => {
	// canRate | myRating → what the CTA does
	const cases: {
		canRate: boolean;
		myRating?: number;
		expected: "hidden" | "prompt" | "rated";
	}[] = [
		{ canRate: true, expected: "prompt", myRating: undefined },
		{ canRate: true, expected: "rated", myRating: 4 },
		{ canRate: false, expected: "hidden", myRating: undefined },
		// Rated, then the conversation stopped being rateable (a block): the link
		// goes away even for someone who already used it.
		{ canRate: false, expected: "hidden", myRating: 5 },
	];

	for (const c of cases) {
		it(`canRate=${c.canRate} myRating=${c.myRating} → ${c.expected}`, () => {
			expect(rateCtaState({ canRate: c.canRate, myRating: c.myRating })).toBe(
				c.expected
			);
		});
	}
});
