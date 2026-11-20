import { api } from "@xolace/backend/convex/_generated/api";
import { COMPANION_FALLBACK_NAME } from "@xolace/backend/convex/ai/prompts/companion";
import { useQuery } from "convex/react";

export { COMPANION_FALLBACK_NAME };

export function useCompanionName(): string {
	return useQuery(api.preferences.get)?.spaceName ?? COMPANION_FALLBACK_NAME;
}
