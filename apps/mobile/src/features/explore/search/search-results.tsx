import type { ReactNode } from "react";
import { ScrollView } from "react-native";
import { SEARCH, type SearchSection } from "@/features/explore/copy";
import {
	EntryRow,
	RowsSkeleton,
	SectionTitle,
} from "@/features/explore/search/library-row";
import { PlaceRow } from "@/features/explore/search/place-row";
import { useSearchResults } from "@/features/explore/search/search-data";
import {
	NeedSomeoneRow,
	NoResults,
} from "@/features/explore/search/search-edges";
import { PREVIEW, showsSeeAll } from "@/features/explore/search/search-model";
import { TrackRow } from "@/features/explore/search/track-row";
import { useMiniPlayerInset } from "@/lib/now-playing/now-playing-store";

function Section<T>({
	section,
	fresh,
	items,
	row,
}: {
	section: SearchSection;
	fresh: boolean;
	items: T[];
	row: (item: T, onOpen: () => void) => ReactNode;
}) {
	const { state, actions } = useSearchResults();
	if (items.length === 0) {
		return null;
	}
	return (
		<>
			<SectionTitle
				title={SEARCH.section[section]}
				{...(showsSeeAll(state.query, fresh, items.length) && {
					action: SEARCH.seeAll,
					onAction: () => actions.seeAll(section),
				})}
			/>
			{items
				.slice(0, PREVIEW)
				.map((item, i) => row(item, () => actions.tap(section, i + 1)))}
		</>
	);
}

export function SearchResults() {
	const { state, actions } = useSearchResults();
	const playerInset = useMiniPlayerInset();
	const { lantern, catalogue, fresh, locked } = state;
	const loading = lantern === undefined || catalogue === undefined;
	const empty =
		!loading &&
		[lantern, catalogue.support, catalogue.music, catalogue.places].every(
			(s) => s.length === 0
		);

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerStyle={{ paddingBottom: 40 + playerInset }}
			contentInsetAdjustmentBehavior="automatic"
			keyboardDismissMode="on-drag"
			keyboardShouldPersistTaps="handled"
		>
			{state.needSomeone && <NeedSomeoneRow onPress={actions.reachSomeone} />}
			{loading ? (
				<RowsSkeleton count={3} />
			) : empty ? (
				<NoResults onWayOut={actions.wayOut} query={state.query} />
			) : (
				<>
					<Section
						fresh={fresh.lantern}
						items={lantern}
						row={(e, tap) => (
							<EntryRow
								entry={e}
								key={e._id}
								onOpen={tap}
								onShare={() => actions.shareEntry(e)}
								onToggleSave={(saved) => actions.toggleSaved(e, saved)}
							/>
						)}
						section="lantern"
					/>
					{(["support", "music"] as const).map((family) => (
						<Section
							fresh={fresh.catalogue}
							items={catalogue[family]}
							key={family}
							row={(t, tap) => (
								<TrackRow
									key={t._id}
									locked={locked}
									onOpen={() => {
										tap();
										actions.openTrack(t);
									}}
									track={t}
								/>
							)}
							section={family}
						/>
					))}
					<Section
						fresh={fresh.catalogue}
						items={catalogue.places}
						row={(p, tap) => (
							<PlaceRow
								key={`${p.kind}:${p.slug}`}
								onOpen={() => {
									tap();
									actions.openPlace(p);
								}}
								place={p}
							/>
						)}
						section="places"
					/>
				</>
			)}
		</ScrollView>
	);
}
