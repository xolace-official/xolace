import { api } from "@xolace/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { useRevenueCat } from "./revenuecat-context";

/**
 * The single entitlement read for all gated UI — client counterpart of the
 * server's hasPremium(). Server truth (reactive: flips the instant the
 * RevenueCat webhook lands) OR'd with the local SDK state as an optimistic
 * hint covering webhook lag right after a purchase.
 */
export function usePlusEntitlement(): {
	isPlus: boolean;
	isLoading: boolean;
	isResolved: boolean;
} {
	const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
	const entitlement = useQuery(
		api.premium.getEntitlement,
		isAuthenticated ? {} : "skip"
	);
	const { isProUser, isLoading: sdkLoading } = useRevenueCat();

	return {
		isLoading: (isAuthenticated && entitlement === undefined) || sdkLoading,
		isPlus: (entitlement?.isPlus ?? false) || isProUser,
		// True only once BOTH sources have actually answered. `isPlus: false` is the
		// default for a signed-out or still-authenticating user — safe for locking UI,
		// but indistinguishable from a real lapse. Anything that *revokes* on the
		// strength of a negative (see usePremiumThemeReconciler) must wait for this.
		isResolved:
			!authLoading &&
			isAuthenticated &&
			entitlement !== undefined &&
			!sdkLoading,
	};
}
