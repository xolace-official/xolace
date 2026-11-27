import { api } from "@xolace/backend/api";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { Share } from "react-native";
import { SEARCH, type SearchSection } from "@/features/explore/copy";
import type {
	SearchResults,
	SearchRowActions,
	SearchSectionView,
} from "@/features/explore/search/search-data";
import { PAGE_SIZE } from "@/features/explore/search/search-model";
import { useOpenTrack } from "@/features/explore/use-open-track";
import { useStableQuery } from "@/lib/convex/use-stable-query";
import { playSoftPress } from "@/lib/haptics";
import { lanternShareUrl } from "@/lib/lantern-share-links";
import { trackLibrary } from "@/lib/library-analytics";

const FROM = "search";

function useSearchShape(
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

function useSearchRows(from: "results" | "see_all"): SearchRowActions & {
	locked: boolean;
} {
	const posthog = usePostHog();
	const record = useMutation(api.library.reads.record);
	const { open, locked } = useOpenTrack(FROM);
	return {
		locked,
		openPlace: (place) => {
			if (place.kind === "hub") {
				router.push({
					params: { slug: place.slug },
					pathname: "/explore/library/hub/[slug]",
				});
			} else {
				router.push({
					params: { slug: place.slug },
					pathname: "/explore/topic/[slug]",
				});
			}
		},
		openTrack: open,
		shareEntry: async (entry) => {
			const url = lanternShareUrl(entry.slug);
			try {
				const { action } = await Share.share({
					message: SEARCH.shareMessage(entry.title, url),
				});
				if (action === Share.sharedAction) {
					trackLibrary(posthog, "library_entry_shared", { slug: entry.slug });
				}
			} catch {}
		},
		tap: (section, position) =>
			posthog.capture("browse_search_result_tapped", {
				from,
				position,
				section,
			}),
		toggleSaved: (entry, saved) =>
			record({ entryId: entry._id, saved }).catch(() => undefined),
	};
}

/** The results under the search bar, for one debounced query ("" skips). */
export function useSearch(query: string): SearchResults {
	const args = query ? { query } : "skip";
	const lantern = useStableQuery(api.library.search.searchEntries, args);
	const catalogue = useStableQuery(api.library.search.searchCatalogue, args);
	const freshLantern = useQuery(api.library.search.searchEntries, args);
	const freshCatalogue = useQuery(api.library.search.searchCatalogue, args);
	useSearchShape(
		query,
		freshLantern &&
			freshCatalogue && {
				lantern: freshLantern.length,
				music: freshCatalogue.music.length,
				places: freshCatalogue.places.length,
				support: freshCatalogue.support.length,
			}
	);
	const { locked, ...rows } = useSearchRows("results");

	return {
		actions: {
			...rows,
			reachSomeone: () => {
				playSoftPress();
				router.push("/(protected)/crisis-resources");
			},
			seeAll: (section) =>
				router.push({
					params: { q: query, section },
					pathname: "/explore/search",
				}),
			wayOut: (href) => {
				playSoftPress();
				router.push(href);
			},
		},
		state: {
			catalogue,
			fresh: {
				catalogue: freshCatalogue !== undefined,
				lantern: freshLantern !== undefined,
			},
			lantern,
			locked,
			// Fresh, never held: the row is this query's, not the last one's.
			needSomeone: freshCatalogue?.needSomeone ?? false,
			query,
		},
	};
}

/** One section's full list, behind "See all". */
export function useSearchSection(
	section: SearchSection,
	query: string
): SearchSectionView {
	const paging = { initialNumItems: PAGE_SIZE };
	const entries = usePaginatedQuery(
		api.library.search.searchEntriesPage,
		section === "lantern" ? { query } : "skip",
		paging
	);
	const tracks = usePaginatedQuery(
		api.library.search.searchTracksPage,
		section === "support" || section === "music"
			? { family: section, query }
			: "skip",
		paging
	);
	const places = useQuery(
		api.library.search.searchPlaces,
		section === "places" ? { query } : "skip"
	);
	const { locked, ...actions } = useSearchRows("see_all");

	if (section === "lantern") {
		return { actions, state: { locked, page: entries, section } };
	}
	if (section === "places") {
		return { actions, state: { locked, places, section } };
	}
	return { actions, state: { locked, page: tracks, section } };
}
