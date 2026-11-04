import type { PurchasesPackage } from "react-native-purchases";
import { describe, expect, it } from "vitest";
import {
	defaultPlan,
	type Plans,
	planCta,
	planPriceLine,
	planTag,
} from "@/features/intake/v2/plus/plans";

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
// A holiday or loyalty offer arrives as the current offering's intro price.
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

describe("planCta", () => {
	it("offers the free week on yearly when it has one", () => {
		expect(planCta("annual", plans(yearlyWithWeek, monthlyPlain))).toBe(
			"Start my free week"
		);
	});

	it("never claims a week someone already spent", () => {
		expect(planCta("annual", plans(yearlyWithWeek, monthlyPlain, false))).toBe(
			"Continue with Plus"
		);
	});

	it("names monthly's discount", () => {
		expect(planCta("monthly", plans(yearlyPlain, monthlyDiscounted))).toBe(
			"Get 40% off your first 3 months"
		);
	});

	it("is plain on a plan with no offer", () => {
		expect(planCta("annual", plans(yearlyPlain, monthlyPlain))).toBe(
			"Continue with Plus"
		);
		expect(planCta("monthly", plans(yearlyPlain, monthlyPlain))).toBe(
			"Continue with Plus"
		);
	});

	it("is plain on a discount the user can't take", () => {
		expect(
			planCta("monthly", plans(yearlyPlain, monthlyDiscounted, false))
		).toBe("Continue with Plus");
	});
});

describe("planPriceLine", () => {
	it("says what the free week turns into", () => {
		expect(planPriceLine("annual", plans(yearlyWithWeek, null))).toBe(
			"Then $49.99 a year. Cancel any time."
		);
	});

	it("gives yearly's price without a week", () => {
		expect(planPriceLine("annual", plans(yearlyPlain, null))).toBe(
			"$49.99 a year. Cancel any time."
		);
	});

	it("gives monthly's discount and what it renews at", () => {
		expect(planPriceLine("monthly", plans(null, monthlyDiscounted))).toBe(
			"$5.99/mo for your first 3 months, then $9.99/mo. Cancel any time."
		);
	});

	it("gives monthly's plain price", () => {
		expect(planPriceLine("monthly", plans(null, monthlyPlain))).toBe(
			"$9.99 a month. Cancel any time."
		);
	});

	it("has no line for a plan the store doesn't sell", () => {
		expect(planPriceLine("monthly", plans(yearlyPlain, null))).toBeNull();
	});
});

describe("planTag", () => {
	it("marks the free week on yearly", () => {
		expect(planTag("annual", plans(yearlyWithWeek, monthlyPlain))).toBe(
			"7 days free"
		);
	});

	it("marks monthly's discount", () => {
		expect(planTag("monthly", plans(yearlyPlain, monthlyDiscounted))).toBe(
			"40% off"
		);
	});

	it("marks nothing without an offer", () => {
		expect(planTag("annual", plans(yearlyPlain, monthlyPlain))).toBeNull();
		expect(planTag("monthly", plans(yearlyPlain, monthlyPlain))).toBeNull();
	});
});
