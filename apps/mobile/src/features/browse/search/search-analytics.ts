/**
 * Browse search analytics (#552, CONTEXT.md "Browse search"): only a search's
 * shape — query length, results per section, and which section and position
 * was tapped. Never the words, and nothing about the search is stored.
 */
import { usePostHog } from 'posthog-react-native';
import { useEffect, useRef } from 'react';

import type { SearchSection } from '@/src/features/browse/search/search-sections';

/**
 * One `browse_search_results` per settled query. Pass the *fresh* results
 * (plain `useQuery`, undefined while a query loads), never held ones, so a
 * count is never the previous query's. Counts stop at the server's 6 per section.
 */
export function useSearchShape(query: string, counts: Record<SearchSection, number> | undefined) {
  const posthog = usePostHog();
  const reported = useRef<string | null>(null);
  useEffect(() => {
    if (!counts || reported.current === query) return;
    reported.current = query;
    posthog.capture('browse_search_results', { query_length: query.length, ...counts });
  }, [query, counts, posthog]);
}

/** `tap(section, position)` → the row's `onOpen`; position counts from 1. */
export function useSearchTap(from: 'results' | 'see_all') {
  const posthog = usePostHog();
  return (section: SearchSection, position: number) => () =>
    posthog.capture('browse_search_result_tapped', { section, position, from });
}
