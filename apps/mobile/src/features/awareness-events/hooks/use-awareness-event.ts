import { api } from "@xolace/backend/convex/_generated/api";
import type { Doc } from "@xolace/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { useAppStore } from "@/store/store";

export function useAwarenessEvent(): Doc<"monthlyEvents"> | null {
	const events = useQuery(api.monthlyEvents.getActive);
	const seenEventIds = useAppStore((s) => s.seenEventIds);
	const pruneSeenEventIds = useAppStore((s) => s.pruneSeenEventIds);

	// Prune stale seen entries on mount, not during render
	useEffect(() => {
		pruneSeenEventIds();
	}, [pruneSeenEventIds]);

	if (events === undefined) {
		return null; // loading or offline
	}

	const today = new Date();
	// en-CA produces "YYYY-MM-DD" in the local timezone, avoiding the UTC midnight bug
	const todayStr = today.toLocaleDateString("en-CA");

	const active = events
		.filter((e) => e.startDate <= todayStr && todayStr <= e.endDate)
		.filter((e) => !seenEventIds.some((s) => s.slug === e.slug))
		.sort((a, b) => {
			if (a.priority !== b.priority) {
				return a.priority - b.priority;
			}
			return a.startDate.localeCompare(b.startDate);
		});

	return active[0] ?? null;
}
