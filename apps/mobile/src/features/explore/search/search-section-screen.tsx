import { LegendList } from "@legendapp/list/react-native";
import { Stack } from "expo-router";
import type { ReactElement } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { EmptyState } from "@/components/shared/empty-state";
import { SEARCH } from "@/features/explore/copy";
import { EntryRow, RowsSkeleton } from "@/features/explore/search/library-row";
import { PlaceRow } from "@/features/explore/search/place-row";
import {
	type SectionPage,
	useSearchSectionView,
} from "@/features/explore/search/search-data";
import { PAGE_SIZE } from "@/features/explore/search/search-model";
import { TrackRow } from "@/features/explore/search/track-row";
import { useMiniPlayerInset } from "@/lib/now-playing/now-playing-store";
import { useTokenColor } from "@/lib/use-token-color";

function Paged<T extends { _id: string }>({
	page: { results, status, isLoading, loadMore },
	row,
}: {
	page: SectionPage<T>;
	row: (item: T, position: number) => ReactElement;
}) {
	const playerInset = useMiniPlayerInset();
	const muted = useTokenColor("muted");
	const loading = status === "LoadingFirstPage";
	return (
		<LegendList
			contentContainerStyle={{ paddingBottom: 40 + playerInset }}
			contentInsetAdjustmentBehavior="automatic"
			data={loading ? [] : results}
			estimatedItemSize={80}
			keyExtractor={(item) => item._id}
			ListEmptyComponent={
				loading ? (
					<RowsSkeleton count={4} />
				) : (
					<EmptyState
						body={SEARCH.sectionEmpty.body}
						className="pt-10"
						title={SEARCH.sectionEmpty.title}
					/>
				)
			}
			ListFooterComponent={
				isLoading && results.length > 0 ? (
					<ActivityIndicator className="py-4" color={muted} />
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

function Section() {
	const { state, actions } = useSearchSectionView();
	const playerInset = useMiniPlayerInset();
	if (state.section === "lantern") {
		return (
			<Paged
				page={state.page}
				row={(e, i) => (
					<EntryRow
						entry={e}
						onOpen={() => actions.tap("lantern", i)}
						onShare={() => actions.shareEntry(e)}
						onToggleSave={(saved) => actions.toggleSaved(e, saved)}
					/>
				)}
			/>
		);
	}
	if (state.section === "places") {
		return (
			<ScrollView
				className="flex-1 bg-background"
				contentContainerStyle={{ paddingBottom: 40 + playerInset }}
				contentInsetAdjustmentBehavior="automatic"
			>
				{state.places === undefined ? (
					<RowsSkeleton count={4} />
				) : (
					state.places.map((p, i) => (
						<PlaceRow
							key={`${p.kind}:${p.slug}`}
							onOpen={() => {
								actions.tap("places", i + 1);
								actions.openPlace(p);
							}}
							place={p}
						/>
					))
				)}
			</ScrollView>
		);
	}
	const family = state.section;
	return (
		<Paged
			page={state.page}
			row={(t, i) => (
				<TrackRow
					locked={state.locked}
					onOpen={() => {
						actions.tap(family, i);
						actions.openTrack(t);
					}}
					track={t}
				/>
			)}
		/>
	);
}

export function SearchSectionScreen() {
	const { state } = useSearchSectionView();
	return (
		<>
			<Stack.Screen options={{ title: SEARCH.section[state.section] }} />
			<Section />
		</>
	);
}
