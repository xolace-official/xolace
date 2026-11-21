import { api } from "@xolace/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { type PlusStatus, plusStatus } from "@/features/purchases/plus-status";
import { useAppStore } from "@/store/store";
import { useRevenueCat } from "./revenuecat-context";

export function usePlusEntitlement(): { status: PlusStatus; isPlus: boolean } {
	const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
	const accountPending = useAppStore((s) => s.accountPending);
	const entitlement = useQuery(
		api.premium.getEntitlement,
		isAuthenticated && !accountPending ? {} : "skip"
	);
	const { isProUser, isLoading: storeLoading } = useRevenueCat();
	const status = plusStatus({
		authLoading,
		serverPlus: entitlement?.isPlus,
		signedIn: isAuthenticated,
		storeLoading,
		storePlus: isProUser,
	});
	return { isPlus: status === "plus", status };
}
