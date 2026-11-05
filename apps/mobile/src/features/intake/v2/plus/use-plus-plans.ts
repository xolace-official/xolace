import { useEffect } from "react";
import { appConfig } from "@/config/app";
import type { Plans } from "@/features/intake/v2/plus/plans";
import { useRevenueCat } from "@/features/purchases/revenuecat-context";
import { useIntroEligibility } from "@/features/purchases/use-intro-eligibility";

/** The current offering's two plans, each with this user's intro eligibility. */
export function usePlusPlans() {
	const { isLoading, offerings, purchase, refreshOfferings } = useRevenueCat();
	const annual = offerings?.current?.annual ?? null;
	const monthly = offerings?.current?.monthly ?? null;
	const plans: Plans = {
		annual: {
			eligible: useIntroEligibility(annual?.product.identifier ?? null),
			pkg: annual,
		},
		monthly: {
			eligible: useIntroEligibility(monthly?.product.identifier ?? null),
			pkg: monthly,
		},
	};
	// Payments live but nothing to sell: never a purchasable-looking button (App Review 2.1).
	const unavailable = appConfig.features.payments && !annual && !monthly;

	// Retry a failed cold-start fetch as the step opens, as the paywall does.
	useEffect(() => {
		if (unavailable && !isLoading) {
			refreshOfferings();
		}
	}, [unavailable, isLoading, refreshOfferings]);

	return { isLoading, plans, purchase, refreshOfferings, unavailable };
}
