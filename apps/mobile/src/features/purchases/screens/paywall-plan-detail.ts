import type { PurchasesStoreProduct } from "react-native-purchases";
import type { PlanId } from "./paywall-period-picker";

/**
 * The line under a live plan's price. Yearly breaks down to a monthly price
 * from the store's own localized string, so it matches the price above it in
 * every currency; without one it just says how it's billed.
 */
export function planDetail(
	plan: PlanId,
	product: Pick<PurchasesStoreProduct, "pricePerMonthString">
): string {
	if (plan === "monthly") {
		return "billed monthly";
	}
	return product.pricePerMonthString
		? `${product.pricePerMonthString}/mo, billed yearly`
		: "billed yearly";
}
