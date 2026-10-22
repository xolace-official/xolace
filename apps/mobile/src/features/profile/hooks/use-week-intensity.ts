import { api } from "@/convex/_generated/api";
import { useStableQuery } from "@/src/lib/convex/use-stable-query";

export function useWeekIntensity(weekOffset = 0) {
  // Stable so paging between weeks doesn't flash `undefined` (which would
  // unmount the card and replay its entrance animation). See use-stable-query.
  return useStableQuery(api.profile.getWeekIntensity, { weekOffset });
}
