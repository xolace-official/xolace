import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";

export function useMoodDelta() {
	return useQuery(api.profile.getMoodDelta);
}
