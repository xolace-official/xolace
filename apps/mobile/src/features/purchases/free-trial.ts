import type { PurchasesPackage } from "react-native-purchases";

const SEVEN_DAYS = ["P1W", "P7D"];

export function hasFreeTrial(
	pkg: PurchasesPackage | null,
	isEligible: boolean
): boolean {
	const product = pkg?.product;
	if (!(product && isEligible)) {
		return false;
	}
	const period =
		product.introPrice?.price === 0
			? product.introPrice.period
			: (product.defaultOption?.freePhase?.billingPeriod?.iso8601 ?? null);
	return period != null && SEVEN_DAYS.includes(period.toUpperCase());
}
