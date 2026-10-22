import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useProfileSummary() {
  return useQuery(api.profile.getSummary);
}
