import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";

export function useProfileSummary() {
	return useQuery(api.profile.getSummary);
}
