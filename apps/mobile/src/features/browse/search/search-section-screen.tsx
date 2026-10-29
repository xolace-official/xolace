// A search section's See all (#551): every match, paged on scroll except Hubs
// & topics, which shows whole. Taps report only section and position (#552).

import { LegendList } from "@legendapp/list/react-native";
import { api } from "@xolace/backend/convex/_generated/api";
import type { PaginationStatus } from "convex/browser";
import { usePaginatedQuery, useQuery } from "convex/react";
import { Stack, useLocalSearchParams } from "expo-router";
import type { ReactElement } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { TrackRow } from "@/features/browse/components/track-row";
import { useMiniPlayerInset } from "@/features/browse/now-playing/now-playing-store";
import { PlaceRow } from "@/features/browse/search/place-row";
import { useSearchTap } from "@/features/browse/search/search-analytics";
import {
	SECTION_TITLE,
	type SearchSection,
} from "@/features/browse/search/search-sections";
import { EntryRow } from "@/features/library/home/entry-cards";
import { RowsSkeleton } from "@/features/library/skeletons";

const PAGE_SIZE = 20;

function Paged<T extends { _id: string }>({
	page: { results, status, isLoading, loadMore },
	row,
}: {
	page: {
		results: T[];
		status: PaginationStatus;
		isLoading: boolean;
		loadMore: (n: number) => void;
	};
	row: (item: T, position: number) => ReactElement;
}) {
	const playerInset = useMiniPlayerInset();
	if (status === "LoadingFirstPage") {
		return <RowsSkeleton count={4} />;
	}
	return (
		<LegendList
			contentContainerStyle={{ paddingBottom: 40 + playerInset }}
			contentInsetAdjustmentBehavior="automatic"
			data={results}
			estimatedItemSize={80}
			keyExtractor={(item) => item._id}
			ListEmptyComponent={
				<AppText className="px-4 pt-8 text-[15px] text-muted">
					Nothing matches that.
				</AppText>
			}
			ListFooterComponent={
				isLoading && results.length > 0 ? (
					<ActivityIndicator className="py-4" />
				) : null
			}
			onEndReached={
				status === "CanLoadMore" ? () => loadMore(PAGE_SIZE) : undefined
			}
			onEndReachedThreshold={0.4}
			renderItem={({ item, index }) => row(item, index + 1)}
		/>
	);
}

function Entries({ query }: { query: string }) {
	const tap = useSearchTap("see_all");
	const page = usePaginatedQuery(
		api.library.search.searchEntriesPage,
		{ query },
		{ initialNumItems: PAGE_SIZE }
	);
	return (
		<Paged
			page={page}
			row={(e, i) => (
				<EntryRow entry={e} from="search" onOpen={tap("lantern", i)} />
			)}
		/>
	);
}

function Tracks({
	query,
	family,
}: {
	query: string;
	family: "support" | "music";
}) {
	const tap = useSearchTap("see_all");
	const page = usePaginatedQuery(
		api.library.search.searchTracksPage,
		{ family, query },
		{ initialNumItems: PAGE_SIZE }
	);
	return (
		<Paged
			page={page}
			row={(t, i) => (
				<TrackRow from="search" onOpen={tap(family, i)} track={t} />
			)}
		/>
	);
}

function Places({ query }: { query: string }) {
	const playerInset = useMiniPlayerInset();
	const tap = useSearchTap("see_all");
	const places = useQuery(api.library.search.searchPlaces, { query });
	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerStyle={{ paddingBottom: 40 + playerInset }}
			contentInsetAdjustmentBehavior="automatic"
		>
			{places === undefined ? (
				<RowsSkeleton count={4} />
			) : (
				places.map((p, i) => (
					<PlaceRow
						key={`${p.kind}:${p.slug}`}
						onOpen={tap("places", i + 1)}
						place={p}
					/>
				))
			)}
		</ScrollView>
	);
}

export function SearchSectionScreen() {
	const { section, q = "" } = useLocalSearchParams<{
		section?: string;
		q?: string;
	}>();
	const known: SearchSection =
		section && Object.hasOwn(SECTION_TITLE, section)
			? (section as SearchSection)
			: "lantern";
	return (
		<>
			<Stack.Screen options={{ title: SECTION_TITLE[known] }} />
			{known === "lantern" ? (
				<Entries query={q} />
			) : known === "places" ? (
				<Places query={q} />
			) : (
				<Tracks family={known} query={q} />
			)}
		</>
	);
}
