import type { PurchasesPackage } from "react-native-purchases";
import { describe, expect, it } from "vitest";
import {
	defaultPlan,
	PLAN_CTA,
	type Plans,
	planNote,
	planPrice,
	planPriceLine,
} from "@/features/purchases/plans";

const pkg = (product: Record<string, unknown>) =>
	({
		product: {
			defaultOption: null,
			introPrice: null,
			...product,
		},
	}) as unknown as PurchasesPackage;

const yearlyWithWeek = pkg({
	introPrice: { period: "P1W", price: 0 },
	price: 49.99,
	priceString: "$49.99",
});
const yearlyPlain = pkg({ price: 49.99, priceString: "$49.99" });
const monthlyPlain = pkg({ price: 9.99, priceString: "$9.99" });
const monthlyDiscounted = pkg({
	introPrice: { cycles: 3, period: "P1M", price: 5.99, priceString: "$5.99" },
	price: 9.99,
	priceString: "$9.99",
});

const plans = (
	annual: PurchasesPackage | null,
	monthly: PurchasesPackage | null,
	eligible = true
): Plans => ({
	annual: { eligible, pkg: annual },
	monthly: { eligible, pkg: monthly },
});

describe("defaultPlan", () => {
	it("preselects yearly", () => {
		expect(defaultPlan(plans(yearlyWithWeek, monthlyDiscounted))).toBe(
			"annual"
		);
	});

	it("falls to monthly when the store has no yearly plan", () => {
		expect(defaultPlan(plans(null, monthlyPlain))).toBe("monthly");
	});

	it("stays on yearly with nothing to sell", () => {
		expect(defaultPlan(plans(null, null))).toBe("annual");
	});
});

describe("PLAN_CTA", () => {
	it("never sells the trial or a discount (App Review 3.1.2(c))", () => {
		expect(PLAN_CTA).not.toMatch(/free|trial|week|off|%/i);
	});
});

describe("planPriceLine", () => {
	it("leads with the billed amount, then the free week", () => {
		expect(planPriceLine("annual", plans(yearlyWithWeek, null))).toBe(
			"$49.99 a year after a 7-day free trial. Renews automatically. Cancel any time."
		);
	});

	it("gives yearly's price without a week", () => {
		expect(planPriceLine("annual", plans(yearlyPlain, null))).toBe(
			"$49.99 a year. Renews automatically. Cancel any time."
		);
	});

	it("leads with what monthly renews at, then the discount", () => {
		expect(planPriceLine("monthly", plans(null, monthlyDiscounted))).toBe(
			"$9.99 a month after $5.99/mo for your first 3 months. Renews automatically. Cancel any time."
		);
	});

	it("gives monthly's plain price", () => {
		expect(planPriceLine("monthly", plans(null, monthlyPlain))).toBe(
			"$9.99 a month. Renews automatically. Cancel any time."
		);
	});

	it("has no line for a plan the store doesn't sell", () => {
		expect(planPriceLine("monthly", plans(yearlyPlain, null))).toBeNull();
	});
});

describe("planPrice", () => {
	it("is the billed amount, whatever the offer", () => {
		expect(planPrice("annual", plans(yearlyWithWeek, monthlyDiscounted))).toBe(
			"$49.99/yr"
		);
		expect(planPrice("monthly", plans(yearlyPlain, monthlyDiscounted))).toBe(
			"$9.99/mo"
		);
	});

	it("is null for a plan the store doesn't sell", () => {
		expect(planPrice("monthly", plans(yearlyPlain, null))).toBeNull();
	});
});

describe("planNote", () => {
	const yearlyWeekPerMonth = pkg({
		introPrice: { period: "P1W", price: 0 },
		price: 59.99,
		pricePerMonthString: "$5.00",
		priceString: "$59.99",
	});

	it("puts the free week and the per-month working-out under yearly", () => {
		expect(planNote("annual", plans(yearlyWeekPerMonth, monthlyPlain))).toBe(
			"7 days free · $5.00/mo"
		);
		expect(planNote("annual", plans(yearlyWithWeek, monthlyPlain))).toBe(
			"7 days free"
		);
	});

	it("never claims a week someone already spent", () => {
		expect(
			planNote("annual", plans(yearlyWeekPerMonth, monthlyPlain, false))
		).toBe("$5.00/mo");
	});

	it("puts monthly's discount under its billed amount", () => {
		expect(planNote("monthly", plans(yearlyPlain, monthlyDiscounted))).toBe(
			"$5.99/mo for 3 months"
		);
		expect(
			planNote("monthly", plans(yearlyPlain, monthlyDiscounted, false))
		).toBeNull();
	});

	it("is null without an offer or a working-out", () => {
		expect(planNote("annual", plans(yearlyPlain, monthlyPlain))).toBeNull();
		expect(planNote("monthly", plans(yearlyPlain, monthlyPlain))).toBeNull();
	});
});
