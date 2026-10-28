import type { PurchasesPackage } from "react-native-purchases";
import type { PlanId } from "./paywall-period-picker";

const SEVEN_DAYS = ["P1W", "P7D"];

/** The one place a trial claim may appear (#221 §6/§7), read off the product; the period must
 * be seven days since the copy says "week". */
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

export function paywallCtaLabel(
	selected: PlanId,
	pkg: PurchasesPackage | null,
	isEligible: boolean
): string {
	return selected === "annual" && hasFreeTrial(pkg, isEligible)
		? "Start your free week"
		: "Continue with Plus";
}
