import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { router, Stack } from "expo-router";
import { type ReactNode, useState } from "react";
import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { TrackRow } from "@/features/browse/components/track-row";
import {
	EntryRow,
	RowsSkeleton,
	SectionTitle,
} from "@/features/browse/search/library-row";
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
import { useStableQuery } from "@/lib/convex/use-stable-query";
import { useMiniPlayerInset } from "@/lib/now-playing/now-playing-store";
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
	query: string | undefined;
	items: T[];
	row: (item: T, onOpen: () => void) => ReactNode;
}) {
	const tap = useSearchTap("results");
	if (items.length === 0) {
		return null;
	}
	const seeAll = () =>
		router.push({ params: { q: query, section }, pathname: "/explore/search" });
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
							<EntryRow entry={e} key={e._id} onOpen={onOpen} />
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

export function BrowseHome({ children }: { children: ReactNode }) {
	const [text, setText] = useState("");
	const searching = text.trim() !== "";
	const query = useDebounce(text.trim(), searching ? DEBOUNCE_MS : 0);

	return (
		<>
			{/* Always shown under the title, as the handoff draws it (explore.md). */}
			<Stack.SearchBar
				hideWhenScrolling={false}
				onCancelButtonPress={() => setText("")}
				onChangeText={(e) => setText(e.nativeEvent.text)}
				onClose={() => setText("")}
				placeholder="Search audio, music and Lantern"
			/>
			<View className={cn("flex-1", searching && "hidden")}>{children}</View>
			{searching && <SearchResults query={query} />}
		</>
	);
}
