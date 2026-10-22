import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { buildTimelineSections, toTimelineEntry } from "@/src/features/timeline/utils";
import type { TimelineEntry } from "@/src/features/timeline/types";

const PAGE_SIZE = 15;

/**
 * Provides timeline sections and pagination controls for session entries.
 *
 * @returns An object containing:
 * - `sections` — Array of timeline sections derived from recent sessions.
 * - `isEmpty` — `true` when not loading and there are no entries, `false` otherwise.
 * - `isLoading` — `true` while the initial query is loading, `false` otherwise.
 * - `canLoadMore` — `true` when additional pages are available to load, `false` otherwise.
 * - `isLoadingMore` — `true` while additional pages are being fetched, `false` otherwise.
 * - `loadMore` — Function that requests the next page of items.
 * - `showUpgradeNudge` — `true` once the free-tier window is exhausted and older sessions exist.
 * - `windowDays` — server-truth length of the free-tier window, for the nudge copy.
 */
export function useTimeline() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.sessions.listForTimeline,
    {},
    { initialNumItems: PAGE_SIZE },
  );
  const windowInfo = useQuery(api.sessions.getTimelineWindowInfo);

  const isLoading = status === "LoadingFirstPage";

  const entries: TimelineEntry[] = results.map(toTimelineEntry);

  const sections = buildTimelineSections(entries);

  return {
    sections,
    isEmpty: !isLoading && entries.length === 0,
    isLoading,
    canLoadMore: status === "CanLoadMore",
    isLoadingMore: status === "LoadingMore",
    loadMore: () => loadMore(PAGE_SIZE),
    showUpgradeNudge: status === "Exhausted" && windowInfo?.hasOlderSessions === true,
    windowDays: windowInfo?.windowDays ?? null,
  };
}
