import { describe, expect, it } from "vitest";
import { freezeReason, freezeRefusal } from "@/lib/streak-freeze";

const SHELF = {
	balance: 120,
	freezeCap: 2,
	freezePrice: 50,
	freezes: 1,
	streakLapsed: false,
};

describe("freezeReason", () => {
	it("is null when a freeze can be bought", () => {
		expect(freezeReason(SHELF)).toBeNull();
	});

	it("checks as buyFreeze does: ended streak, then sparks short, then the cap", () => {
		expect(
			freezeReason({ ...SHELF, balance: 10, freezes: 2, streakLapsed: true })
		).toBe("Your streak ended. Show up today, then buy one.");
		expect(freezeReason({ ...SHELF, balance: 49, freezes: 2 })).toBe(
			"1 more spark to buy one."
		);
		expect(freezeReason({ ...SHELF, balance: 30 })).toBe(
			"20 more sparks to buy one."
		);
		expect(freezeReason({ ...SHELF, freezes: 2 })).toBe(
			"You're holding the max of 2 freezes."
		);
	});
});

describe("freezeRefusal", () => {
	it("explains a refused buy by its code", () => {
		expect(freezeRefusal("insufficient_sparks", 2)).toBe(
			"Not enough sparks for a freeze yet."
		);
		expect(freezeRefusal("freeze_cap_reached", 2)).toBe(
			"You're holding the max of 2 freezes."
		);
		expect(freezeRefusal("streak_lapsed", 2)).toBe(
			"Your streak ended. Show up today, then buy one."
		);
		expect(freezeRefusal(undefined, 2)).toBe(
			"Couldn't buy a freeze. Try again."
		);
	});
});
