import type { PurchasesStoreProduct } from "react-native-purchases";
import type { PlanId } from "./paywall-period-picker";

/** The line under a live plan's price. Yearly derives a monthly price from the store's
 * localized string. */
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
