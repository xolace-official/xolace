import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";

export type ProfileSummary = NonNullable<
	FunctionReturnType<typeof api.profile.getSummary>
>;

export function useProfileSummary() {
	return useQuery(api.profile.getSummary);
}
