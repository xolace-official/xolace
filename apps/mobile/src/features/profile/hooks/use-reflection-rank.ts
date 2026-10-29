import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";

/** Percentile rank among reflectors: `undefined` while loading, then `ranked`,
 * `pending` (too few own moments) or `warming` (too few reflectors). */
export function useReflectionRank() {
	return useQuery(api.profile.getReflectionRank);
}
