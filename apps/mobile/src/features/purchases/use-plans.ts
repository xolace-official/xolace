import { useEffect } from "react";
import { appConfig } from "@/config/app";
import type { Plans } from "@/features/purchases/plans";
import { useRevenueCat } from "@/features/purchases/revenuecat-context";
import { useIntroEligibility } from "@/features/purchases/use-intro-eligibility";

export function usePlans() {
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

	useEffect(() => {
		if (unavailable && !isLoading) {
			refreshOfferings();
		}
	}, [unavailable, isLoading, refreshOfferings]);

	return { isLoading, plans, purchase, refreshOfferings, unavailable };
}
