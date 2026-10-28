// Browse home with search (#549). The hub stays mounted under the results so
// clearing restores it. Sections rank on their own (#550), show a few with See
// all (#551); a crisis-term query gets Need someone now?; analytics carry only shape (#552).

import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { router, Stack } from "expo-router";
import { type ReactNode, useState } from "react";
import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { BrowseHubScreen } from "@/features/browse/components/browse-hub-screen";
import { TrackRow } from "@/features/browse/components/track-row";
import { useMiniPlayerInset } from "@/features/browse/now-playing/now-playing-store";
import { PlaceRow } from "@/features/browse/search/place-row";
import {
	useSearchShape,
	useSearchTap,
} from "@/features/browse/search/search-analytics";
import {
	NeedSomeoneRow,
	NoResults,
} from "@/features/browse/search/search-edges";
import {
	SECTION_TITLE,
	type SearchSection,
} from "@/features/browse/search/search-sections";
import { EntryRow, SectionTitle } from "@/features/library/home/entry-cards";
import { RowsSkeleton } from "@/features/library/skeletons";
import { useStableQuery } from "@/lib/convex/use-stable-query";
import { useDebounce } from "@/lib/use-debounce";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 250;
const PREVIEW = 5;

function Section<T>({
	section,
	query,
	items,
	row,
}: {
	section: SearchSection;
	/** Undefined while the rows are held from the last query: See all would open different
	 * words. */
	query: string | undefined;
	items: T[];
	row: (item: T, onOpen: () => void) => ReactNode;
}) {
	const tap = useSearchTap("results");
	if (items.length === 0) {
		return null;
	}
	const seeAll = () =>
		router.push({ params: { q: query, section }, pathname: "/browse/search" });
	return (
		<>
			<SectionTitle
				title={SECTION_TITLE[section]}
				{...(query &&
					items.length > PREVIEW && { action: "See all", onAction: seeAll })}
			/>
			{items.slice(0, PREVIEW).map((item, i) => row(item, tap(section, i + 1)))}
		</>
	);
}

function SearchResults({ query }: { query: string }) {
	const playerInset = useMiniPlayerInset();
	const args = query ? { query } : "skip";
	// Holds the last results while the next keystroke's load.
	const lantern = useStableQuery(api.library.search.searchEntries, args);
	const catalogue = useStableQuery(api.library.search.searchCatalogue, args);
	// The same subscriptions, unheld: analytics count only this query's results.
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
			{/* Fresh, never held: the row is this query's, not the last one's. */}
			{freshCatalogue?.needSomeone && <NeedSomeoneRow />}
			{loading ? (
				<RowsSkeleton count={3} />
			) : empty ? (
				<NoResults query={query} />
			) : (
				<>
					<Section
						items={lantern}
						query={freshLantern && query}
						row={(e, onOpen) => (
							<EntryRow entry={e} from="search" key={e._id} onOpen={onOpen} />
						)}
						section="lantern"
					/>
					<Section
						items={catalogue.support}
						query={freshCatalogue && query}
						row={(t, onOpen) => (
							<TrackRow from="search" key={t._id} onOpen={onOpen} track={t} />
						)}
						section="support"
					/>
					<Section
						items={catalogue.music}
						query={freshCatalogue && query}
						row={(t, onOpen) => (
							<TrackRow from="search" key={t._id} onOpen={onOpen} track={t} />
						)}
						section="music"
					/>
					<Section
						items={catalogue.places}
						query={freshCatalogue && query}
						row={(p, onOpen) => (
							<PlaceRow key={`${p.kind}:${p.slug}`} onOpen={onOpen} place={p} />
						)}
						section="places"
					/>
				</>
			)}
		</ScrollView>
	);
}

export function BrowseHome() {
	const [text, setText] = useState("");
	const searching = text.trim() !== "";
	// A clear lands at once, so a quick retype can't flash the old query's results.
	const query = useDebounce(text.trim(), searching ? DEBOUNCE_MS : 0);

	return (
		<>
			<Stack.SearchBar
				onCancelButtonPress={() => setText("")}
				onChangeText={(e) => setText(e.nativeEvent.text)}
				onClose={() => setText("")}
				placeholder="Search audio, music and Lantern"
			/>
			<View className={cn("flex-1", searching && "hidden")}>
				<BrowseHubScreen />
			</View>
			{searching && <SearchResults query={query} />}
		</>
	);
}
