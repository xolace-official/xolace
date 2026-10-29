import { useEffect, useState } from "react";
import { Platform } from "react-native";
import Purchases, { INTRO_ELIGIBILITY_STATUS } from "react-native-purchases";

type Status = "pending" | "eligible" | "ineligible";

// Whether the user can still take this product's intro offer. iOS asks RevenueCat and
// only an explicit "eligible" counts (pending, unknown and failed all mean no). Android
// always answers "unknown", but Play only lists offers the user can take.
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
