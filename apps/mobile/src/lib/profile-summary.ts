import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";

/**
 * The account's own summary (`profile.getSummary`): name, avatar, streak, moments.
 * In `src/lib` because no one feature owns it: You draws most of it and Today's
 * (Discovery's) headers greet by name, and features can't import each other.
 */
export type ProfileSummary = NonNullable<
	FunctionReturnType<typeof api.profile.getSummary>
>;

/** Undefined while it loads. */
export function useProfileSummary(): ProfileSummary | undefined {
	return useQuery(api.profile.getSummary);
}
