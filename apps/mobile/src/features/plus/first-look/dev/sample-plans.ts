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

const samplePackage = (product: SampleProduct) =>
	({
		product: { defaultOption: null, ...product },
	}) as unknown as PurchasesPackage;

const YEARLY_WITH_WEEK = samplePackage({
	identifier: "sample_yearly",
	introPrice: { cycles: 1, period: "P1W", price: 0, priceString: "$0.00" },
	price: 49.99,
	pricePerMonthString: "$4.17",
	priceString: "$49.99",
});
const MONTHLY_PLAIN = samplePackage({
	identifier: "sample_monthly",
	introPrice: null,
	price: 9.99,
	pricePerMonthString: "$9.99",
	priceString: "$9.99",
});
const MONTHLY_DISCOUNTED = samplePackage({
	identifier: "sample_monthly_discount",
	introPrice: { cycles: 3, period: "P1M", price: 5.99, priceString: "$5.99" },
	price: 9.99,
	pricePerMonthString: "$9.99",
	priceString: "$9.99",
});

export const TRIAL_AND_DISCOUNT: Plans = {
	annual: { eligible: true, pkg: YEARLY_WITH_WEEK },
	monthly: { eligible: true, pkg: MONTHLY_DISCOUNTED },
};

export const TRIAL_ONLY: Plans = {
	annual: { eligible: true, pkg: YEARLY_WITH_WEEK },
	monthly: { eligible: true, pkg: MONTHLY_PLAIN },
};

export const OFFERS_USED: Plans = {
	annual: { eligible: false, pkg: YEARLY_WITH_WEEK },
	monthly: { eligible: false, pkg: MONTHLY_DISCOUNTED },
};

export const NO_PLANS: Plans = {
	annual: { eligible: false, pkg: null },
	monthly: { eligible: false, pkg: null },
};
