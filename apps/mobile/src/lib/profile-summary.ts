import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";

export type ProfileSummary = NonNullable<
	FunctionReturnType<typeof api.profile.getSummary>
>;

export function useProfileSummary(): ProfileSummary | undefined {
	return useQuery(api.profile.getSummary);
}
