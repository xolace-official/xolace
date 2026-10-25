import { describe, expect, it } from "vitest";
import { planDetail } from "./paywall-plan-detail";

describe("planDetail", () => {
	it("breaks yearly down with the store's own monthly price", () => {
		expect(planDetail("annual", { pricePerMonthString: "US$6.67" })).toBe(
			"US$6.67/mo, billed yearly"
		);
	});

	it("says only how yearly is billed when the store gives no monthly price", () => {
		expect(planDetail("annual", { pricePerMonthString: null })).toBe(
			"billed yearly"
		);
	});

	it("says monthly is billed monthly", () => {
		expect(planDetail("monthly", { pricePerMonthString: "US$9.99" })).toBe(
			"billed monthly"
		);
	});
});
