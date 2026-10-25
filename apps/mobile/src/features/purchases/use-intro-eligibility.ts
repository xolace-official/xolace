import { useEffect, useState } from "react";
import { Platform } from "react-native";
import Purchases, { INTRO_ELIGIBILITY_STATUS } from "react-native-purchases";

type Status = "pending" | "eligible" | "ineligible";

/**
 * Whether the user can still take this product's intro offer, so someone who
 * has already subscribed isn't shown "50% off".
 *
 * iOS asks RevenueCat, and only an explicit "eligible" counts: an unknown
 * answer, no offer, a missing result or a failed check all mean no, so we never
 * advertise a discount the user can't get (Apple's payment sheet still applies
 * one they can). Until it answers we say no, so the discount appears late
 * rather than vanishing.
 * Android always answers "unknown" here, but Play only lists offers the user
 * can take, so the product itself already carries the answer.
 */
export function useIntroEligibility(productId: string | null): boolean {
	const [status, setStatus] = useState<Status>("pending");

	useEffect(() => {
		if (Platform.OS !== "ios" || !productId) {
			return;
		}
		let cancelled = false;
		setStatus("pending");
		Purchases.checkTrialOrIntroductoryPriceEligibility([productId])
			.then((result) => {
				if (cancelled) {
					return;
				}
				setStatus(
					result[productId]?.status ===
						INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE
						? "eligible"
						: "ineligible"
				);
			})
			.catch((error) => {
				console.error("[RevenueCat] intro eligibility check failed:", error);
				if (!cancelled) {
					setStatus("ineligible");
				}
			});
		return () => {
			cancelled = true;
		};
	}, [productId]);

	if (Platform.OS !== "ios") {
		return true;
	}
	return status === "eligible";
}
