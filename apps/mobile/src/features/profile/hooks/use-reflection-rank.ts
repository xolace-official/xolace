import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";

/**
 * Percentile rank among people who reflect. Returns `undefined` while loading,
 * then one of three states — `ranked`, `pending` (too few of your own moments)
 * or `warming` (too few reflectors for the number to mean anything). The card
 * renders in all three; there is no "nothing to show" case.
 */
export function useReflectionRank() {
	return useQuery(api.profile.getReflectionRank);
}
