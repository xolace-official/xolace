import type { api } from "@xolace/backend/api";
import type { PaginationStatus } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { useLocalSearchParams } from "expo-router";
import { createContext, type ReactNode, use } from "react";
import type { SEARCH, SearchSection } from "@/features/explore/copy";
import { sectionOf } from "@/features/explore/search/search-model";
import {
	useSearch,
	useSearchSection,
} from "@/features/explore/search/use-search";

export type EntryItem = FunctionReturnType<
	typeof api.library.entries.listEntries
>[number];
export type TrackItem = FunctionReturnType<
	typeof api.browse.topics.getTopic
>[number];
export type Place = FunctionReturnType<
	typeof api.library.search.searchPlaces
>[number];
export type WayOut = (typeof SEARCH.wayOuts)[number]["href"];
type Catalogue = FunctionReturnType<typeof api.library.search.searchCatalogue>;

/** What every result row can do, on the results and on a see-all screen. */
export type SearchRowActions = {
	tap: (section: SearchSection, position: number) => void;
	openTrack: (track: TrackItem) => void;
	openPlace: (place: Place) => void;
	toggleSaved: (entry: EntryItem, saved: boolean) => Promise<unknown>;
	shareEntry: (entry: EntryItem) => void;
};

export type SearchResults = {
	state: {
		query: string;
		/** Held across queries, so the list doesn't blank while the next loads. */
		lantern: EntryItem[] | undefined;
		catalogue: Catalogue | undefined;
		/** Whether the shown results are this query's own, not the last one's. */
		fresh: { lantern: boolean; catalogue: boolean };
		needSomeone: boolean;
		locked: boolean;
	};
	actions: SearchRowActions & {
		seeAll: (section: SearchSection) => void;
		reachSomeone: () => void;
		wayOut: (href: WayOut) => void;
	};
};

export type SectionPage<T> = {
	results: T[];
	status: PaginationStatus;
	isLoading: boolean;
	loadMore: (n: number) => void;
};

export type SearchSectionView = {
	state: { locked: boolean } & (
		| { section: "lantern"; page: SectionPage<EntryItem> }
		| { section: "support" | "music"; page: SectionPage<TrackItem> }
		| { section: "places"; places: Place[] | undefined }
	);
	actions: SearchRowActions;
};

const ResultsContext = createContext<SearchResults | null>(null);
const SectionContext = createContext<SearchSectionView | null>(null);

export function useSearchResults(): SearchResults {
	const value = use(ResultsContext);
	if (!value) {
		throw new Error("useSearchResults needs a SearchResultsProvider above it");
	}
	return value;
}

export function useSearchSectionView(): SearchSectionView {
	const value = use(SectionContext);
	if (!value) {
		throw new Error("useSearchSectionView needs a SearchSectionProvider");
	}
	return value;
}

function SearchResultsProvider({
	value,
	children,
}: {
	value: SearchResults;
	children: ReactNode;
}) {
	return <ResultsContext value={value}>{children}</ResultsContext>;
}

function SearchSectionProvider({
	value,
	children,
}: {
	value: SearchSectionView;
	children: ReactNode;
}) {
	return <SectionContext value={value}>{children}</SectionContext>;
}

/** Mounted only while searching, so a new search starts from loading. */
export function SearchData({
	query,
	children,
}: {
	query: string;
	children: ReactNode;
}) {
	return (
		<SearchResultsProvider value={useSearch(query)}>
			{children}
		</SearchResultsProvider>
	);
}

export function SearchSectionData({ children }: { children: ReactNode }) {
	const { section, q = "" } = useLocalSearchParams<{
		section?: string;
		q?: string;
	}>();
	return (
		<SearchSectionProvider value={useSearchSection(sectionOf(section), q)}>
			{children}
		</SearchSectionProvider>
	);
}
