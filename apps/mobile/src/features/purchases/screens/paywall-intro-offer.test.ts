import type { PurchasesStoreProduct } from "react-native-purchases";
import { describe, expect, it } from "vitest";
import { introOfferOf } from "./paywall-intro-offer";

const product = (fields: Record<string, unknown>) =>
	({
		defaultOption: null,
		introPrice: null,
		price: 9.99,
		priceString: "$9.99",
		...fields,
	}) as unknown as PurchasesStoreProduct;

const appStoreIntro = product({
	introPrice: { cycles: 2, period: "P1M", price: 4.99, priceString: "$4.99" },
});
const playIntro = product({
	defaultOption: {
		introPhase: {
			billingCycleCount: 2,
			billingPeriod: { iso8601: "P1M" },
			price: { amountMicros: 4_990_000, formatted: "$4.99" },
		},
	},
});

describe("introOfferOf", () => {
	it("reads the App Store intro price", () => {
		expect(introOfferOf(appStoreIntro, true)).toEqual({
			fullPrice: "$9.99",
			percentOff: 50,
			price: "$4.99",
			term: "2 months",
		});
	});

	it("reads the Play intro phase off the default option", () => {
		expect(introOfferOf(playIntro, true)).toEqual({
			fullPrice: "$9.99",
			percentOff: 50,
			price: "$4.99",
			term: "2 months",
		});
	});

	it("works the percent out from real prices instead of assuming 50", () => {
		const euro = product({
			introPrice: {
				cycles: 2,
				period: "P1M",
				price: 5.99,
				priceString: "€5.99",
			},
			priceString: "€9.99",
		});
		expect(introOfferOf(euro, true)?.percentOff).toBe(40);
	});

	it("says a single period without a count", () => {
		const oneMonth = product({
			introPrice: {
				cycles: 1,
				period: "P1M",
				price: 4.99,
				priceString: "$4.99",
			},
		});
		expect(introOfferOf(oneMonth, true)?.term).toBe("month");
	});

	it("shows the plain price to someone who can't take the offer", () => {
		expect(introOfferOf(appStoreIntro, false)).toBeNull();
	});

	it("ignores a free trial, which is not a discount", () => {
		const trial = product({
			introPrice: { cycles: 1, period: "P1W", price: 0, priceString: "$0.00" },
		});
		expect(introOfferOf(trial, true)).toBeNull();
	});

	it("shows the plain price without an offer or a product", () => {
		expect(introOfferOf(product({}), true)).toBeNull();
		expect(introOfferOf(null, true)).toBeNull();
	});
});
