import { api } from "@xolace/backend/convex/_generated/api";
import { COMPANION_FALLBACK_NAME } from "@xolace/backend/convex/ai/prompts/companion";
import { useQuery } from "convex/react";

/** The companion's name when the person hasn't named their space (#601). */
export { COMPANION_FALLBACK_NAME };

/** The companion goes by the space name (#601); live, so a mid-talk rename shows at once. */
export function useCompanionName(): string {
	return useQuery(api.preferences.get)?.spaceName ?? COMPANION_FALLBACK_NAME;
}
