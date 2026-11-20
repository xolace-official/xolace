import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";

import type { SearchSection } from "@/features/browse/search/search-sections";

export function useSearchShape(
	query: string,
	counts: Record<SearchSection, number> | undefined
) {
	const posthog = usePostHog();
	const reported = useRef<string | null>(null);
	useEffect(() => {
		if (!counts || reported.current === query) {
			return;
		}
		reported.current = query;
		posthog.capture("browse_search_results", {
			query_length: query.length,
			...counts,
		});
	}, [query, counts, posthog]);
}

export function useSearchTap(from: "results" | "see_all") {
	const posthog = usePostHog();
	return (section: SearchSection, position: number) => () =>
		posthog.capture("browse_search_result_tapped", { from, position, section });
}
