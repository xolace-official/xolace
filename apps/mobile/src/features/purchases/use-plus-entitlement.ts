import { api } from "@xolace/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { useRevenueCat } from "./revenuecat-context";

/** The single entitlement read for all gated UI: server truth OR'd with local SDK state, which
 * covers webhook lag. */
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
		// True once both sources have answered. A default `isPlus: false` is indistinguishable
		// from a real lapse, so anything that revokes on a negative must wait for this.
		isResolved:
			!authLoading &&
			isAuthenticated &&
			entitlement !== undefined &&
			!sdkLoading,
	};
}
