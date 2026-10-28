import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { COMPANION_FALLBACK_NAME } from "@/features/talk/talk-copy";

/** The companion goes by the space name (#601); live, so a mid-talk rename shows at once. */
export function useCompanionName(): string {
	return useQuery(api.preferences.get)?.spaceName ?? COMPANION_FALLBACK_NAME;
}
