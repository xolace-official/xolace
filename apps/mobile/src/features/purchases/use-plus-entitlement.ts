import { api } from "@xolace/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { useAppStore } from "@/store/store";
import { useRevenueCat } from "./revenuecat-context";

export function usePlusEntitlement(): {
	isPlus: boolean;
	isLoading: boolean;
	isResolved: boolean;
} {
	const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
	const accountPending = useAppStore((s) => s.accountPending);
	const entitlement = useQuery(
		api.premium.getEntitlement,
		isAuthenticated && !accountPending ? {} : "skip"
	);
	const { isProUser, isLoading: sdkLoading } = useRevenueCat();

	return {
		isLoading: (isAuthenticated && entitlement === undefined) || sdkLoading,
		isPlus: (entitlement?.isPlus ?? false) || isProUser,
		isResolved:
			!authLoading &&
			isAuthenticated &&
			entitlement !== undefined &&
			!sdkLoading,
	};
}
