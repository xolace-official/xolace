import { api } from "@xolace/backend/convex/_generated/api";
import { COMPANION_FALLBACK_NAME } from "@xolace/backend/shared";
import { useQuery } from "convex/react";

export function useCompanionName(): string {
	return useQuery(api.preferences.get)?.spaceName ?? COMPANION_FALLBACK_NAME;
}
