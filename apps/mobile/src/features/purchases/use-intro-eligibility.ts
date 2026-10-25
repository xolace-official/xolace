import { useEffect, useState } from "react";
import { Platform } from "react-native";
import Purchases, { INTRO_ELIGIBILITY_STATUS } from "react-native-purchases";

type Status = "pending" | "eligible" | "ineligible";

/**
 * Whether the user can still take this product's intro offer, so someone who
 * has already subscribed isn't shown "50% off".
 *
 * iOS asks RevenueCat; it's best-effort, so an unknown answer or a failed check
 * counts as eligible (Apple's payment sheet has the final say). Until it
 * answers we say no, so the discount appears late rather than vanishing.
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
						INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE
						? "ineligible"
						: "eligible"
				);
			})
			.catch((error) => {
				console.error("[RevenueCat] intro eligibility check failed:", error);
				if (!cancelled) {
					setStatus("eligible");
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
