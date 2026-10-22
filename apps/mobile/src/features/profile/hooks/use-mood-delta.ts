import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useMoodDelta() {
  return useQuery(api.profile.getMoodDelta);
}
