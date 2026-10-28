import { api } from "@xolace/backend/convex/_generated/api";
import { usePaginatedQuery, useQuery } from "convex/react";
import type { TimelineEntry } from "@/features/timeline/types";
import {
	buildTimelineSections,
	toTimelineEntry,
} from "@/features/timeline/utils";

const PAGE_SIZE = 15;

/** Timeline sections plus pagination; `showUpgradeNudge` once the free window is exhausted and
 * older sessions exist. */
export function useTimeline() {
	const { results, status, loadMore } = usePaginatedQuery(
		api.sessions.listForTimeline,
		{},
		{ initialNumItems: PAGE_SIZE }
	);
	const windowInfo = useQuery(api.sessions.getTimelineWindowInfo);

	const isLoading = status === "LoadingFirstPage";

	const entries: TimelineEntry[] = results.map(toTimelineEntry);

	const sections = buildTimelineSections(entries);

	return {
		canLoadMore: status === "CanLoadMore",
		isEmpty: !isLoading && entries.length === 0,
		isLoading,
		isLoadingMore: status === "LoadingMore",
		loadMore: () => loadMore(PAGE_SIZE),
		sections,
		showUpgradeNudge:
			status === "Exhausted" && windowInfo?.hasOlderSessions === true,
		windowDays: windowInfo?.windowDays ?? null,
	};
}
