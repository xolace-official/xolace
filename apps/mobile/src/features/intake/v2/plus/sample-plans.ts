// Dev only: sample RevenueCat plans for previewing the Xolace+ step (#713) on a simulator,
// where the store sells nothing and intro eligibility can't be faked. Never sold from.
import type { PurchasesPackage } from "react-native-purchases";
import type { Plans } from "@/features/intake/v2/plus/plans";

type SampleProduct = {
	identifier: string;
	introPrice: {
		cycles: number;
		period: string;
		price: number;
		priceString: string;
	} | null;
	price: number;
	priceString: string;
};

// A fixture, not a store package: only the fields the step reads are filled in.
const samplePackage = (product: SampleProduct) =>
	({
		product: { defaultOption: null, ...product },
	}) as unknown as PurchasesPackage;

const YEARLY_WITH_WEEK = samplePackage({
	identifier: "sample_yearly",
	introPrice: { cycles: 1, period: "P1W", price: 0, priceString: "$0.00" },
	price: 49.99,
	priceString: "$49.99",
});
const MONTHLY_PLAIN = samplePackage({
	identifier: "sample_monthly",
	introPrice: null,
	price: 9.99,
	priceString: "$9.99",
});
// A seasonal or loyalty discount, as it arrives: the offering's intro price.
const MONTHLY_DISCOUNTED = samplePackage({
	identifier: "sample_monthly_discount",
	introPrice: { cycles: 3, period: "P1M", price: 5.99, priceString: "$5.99" },
	price: 9.99,
	priceString: "$9.99",
});

export type SampleScenario = { label: string; plans: Plans };

/** What the preview cycles through: each way the plans can arrive. */
export const SAMPLE_SCENARIOS: SampleScenario[] = [
	{
		label: "Free week + monthly discount",
		plans: {
			annual: { eligible: true, pkg: YEARLY_WITH_WEEK },
			monthly: { eligible: true, pkg: MONTHLY_DISCOUNTED },
		},
	},
	{
		label: "Free week only",
		plans: {
			annual: { eligible: true, pkg: YEARLY_WITH_WEEK },
			monthly: { eligible: true, pkg: MONTHLY_PLAIN },
		},
	},
	{
		label: "Offers already used",
		plans: {
			annual: { eligible: false, pkg: YEARLY_WITH_WEEK },
			monthly: { eligible: false, pkg: MONTHLY_DISCOUNTED },
		},
	},
];
