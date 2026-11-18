/** Sample RevenueCat plans for the paywall's dev states, where the store sells nothing and
 * intro eligibility can't be faked. Never sold from. */
import type { PurchasesPackage } from "react-native-purchases";
import type { Plans } from "@/features/purchases/plans";

type SampleProduct = {
	identifier: string;
	introPrice: {
		cycles: number;
		period: string;
		price: number;
		priceString: string;
	} | null;
	price: number;
	pricePerMonthString: string | null;
	priceString: string;
};

// A fixture, not a store package: only the fields the paywall reads are filled in.
const samplePackage = (product: SampleProduct) =>
	({
		product: { defaultOption: null, ...product },
	}) as unknown as PurchasesPackage;

const YEARLY = {
	identifier: "sample_yearly",
	price: 59.99,
	pricePerMonthString: "$5.00",
	priceString: "$59.99",
};
const YEARLY_WITH_WEEK = samplePackage({
	...YEARLY,
	introPrice: { cycles: 1, period: "P1W", price: 0, priceString: "$0.00" },
});
const MONTHLY = {
	identifier: "sample_monthly",
	price: 9.99,
	pricePerMonthString: "$9.99",
	priceString: "$9.99",
};
const MONTHLY_PLAIN = samplePackage({ ...MONTHLY, introPrice: null });
// A seasonal or loyalty discount, as it arrives: the offering's intro price.
const MONTHLY_HALF_OFF = samplePackage({
	...MONTHLY,
	introPrice: { cycles: 1, period: "P1M", price: 4.99, priceString: "$4.99" },
});

const plans = (
	annual: PurchasesPackage | null,
	monthly: PurchasesPackage | null,
	eligible = true
): Plans => ({
	annual: { eligible, pkg: annual },
	monthly: { eligible, pkg: monthly },
});

/** Yearly with its free week, monthly plain: the usual offering. */
export const TRIAL = plans(YEARLY_WITH_WEEK, MONTHLY_PLAIN);
/** Monthly at 50% off its first month. */
export const DISCOUNT = plans(YEARLY_WITH_WEEK, MONTHLY_HALF_OFF);
/** Both intro offers already used. */
export const OFFERS_USED = plans(YEARLY_WITH_WEEK, MONTHLY_HALF_OFF, false);
/** The store sells only monthly. */
export const MONTHLY_ONLY = plans(null, MONTHLY_PLAIN);
/** Nothing from the store: payments off, or the offering didn't load. */
export const NONE = plans(null, null);
