/**
 * The Browse home with Browse search (#549, CONTEXT.md "Browse search"): the
 * native header bar swaps the hub for results while there's a query. The hub
 * stays mounted underneath, so clearing or cancelling brings it back as it was.
 * Sections run Lantern, Support audio, Music, Hubs & topics, each ranked on its
 * own (#550); a section with no matches is hidden. Each shows its first few,
 * with a See all for the rest when there are more (#551). A crisis-term query
 * gets the Need someone now? row above its results; no results gets way-outs;
 * analytics carry only the search's shape (#552).
 */
import { useQuery } from 'convex/react';
import { router, Stack } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { api } from '@/convex/_generated/api';
import { AppText } from '@/src/components/shared/app-text';
import { useStableQuery } from '@/src/lib/convex/use-stable-query';
import { useDebounce } from '@/src/lib/use-debounce';
import { cn } from '@/src/lib/utils';
import { BrowseHubScreen } from '@/src/features/browse/components/browse-hub-screen';
import { TrackRow } from '@/src/features/browse/components/track-row';
import { PlaceRow } from '@/src/features/browse/search/place-row';
import { useSearchShape, useSearchTap } from '@/src/features/browse/search/search-analytics';
import { NeedSomeoneRow, NoResults } from '@/src/features/browse/search/search-edges';
import { SECTION_TITLE, type SearchSection } from '@/src/features/browse/search/search-sections';
import { useMiniPlayerInset } from '@/src/features/browse/now-playing/now-playing-store';
import { EntryRow, SectionTitle } from '@/src/features/library/home/entry-cards';
import { RowsSkeleton } from '@/src/features/library/skeletons';

const DEBOUNCE_MS = 250;
const PREVIEW = 5;

function Section<T>({
  section,
  query,
  items,
  row,
}: {
  section: SearchSection;
  query: string;
  items: T[];
  row: (item: T, onOpen: () => void) => ReactNode;
}) {
  const tap = useSearchTap('results');
  if (items.length === 0) return null;
  const seeAll = () => router.push({ pathname: '/browse/search', params: { section, q: query } });
  return (
    <>
      <SectionTitle
        title={SECTION_TITLE[section]}
        {...(items.length > PREVIEW && { action: 'See all', onAction: seeAll })}
      />
      {items.slice(0, PREVIEW).map((item, i) => row(item, tap(section, i + 1)))}
    </>
  );
}

function SearchResults({ query }: { query: string }) {
  const playerInset = useMiniPlayerInset();
  const args = query ? { query } : 'skip';
  // Holds the last results while the next keystroke's load, so nothing blanks.
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
        support: freshCatalogue.support.length,
        music: freshCatalogue.music.length,
        places: freshCatalogue.places.length,
      },
  );
  const loading = lantern === undefined || catalogue === undefined;
  const empty =
    !loading && [lantern, catalogue.support, catalogue.music, catalogue.places].every((s) => s.length === 0);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 40 + playerInset }}
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
            section="lantern"
            query={query}
            items={lantern}
            row={(e, onOpen) => <EntryRow key={e._id} entry={e} from="search" onOpen={onOpen} />}
          />
          <Section
            section="support"
            query={query}
            items={catalogue.support}
            row={(t, onOpen) => <TrackRow key={t._id} track={t} from="search" onOpen={onOpen} />}
          />
          <Section
            section="music"
            query={query}
            items={catalogue.music}
            row={(t, onOpen) => <TrackRow key={t._id} track={t} from="search" onOpen={onOpen} />}
          />
          <Section
            section="places"
            query={query}
            items={catalogue.places}
            row={(p, onOpen) => <PlaceRow key={`${p.kind}:${p.slug}`} place={p} onOpen={onOpen} />}
          />
        </>
      )}
    </ScrollView>
  );
}

export function BrowseHome() {
  const [text, setText] = useState('');
  const searching = text.trim() !== '';
  // A clear lands at once, so a quick retype can't flash the old query's results.
  const query = useDebounce(text.trim(), searching ? DEBOUNCE_MS : 0);

  return (
    <>
      <Stack.SearchBar
        placeholder="Search audio, music and Lantern"
        onChangeText={(e) => setText(e.nativeEvent.text)}
        onCancelButtonPress={() => setText('')}
        onClose={() => setText('')}
      />
      <View className={cn('flex-1', searching && 'hidden')}>
        <BrowseHubScreen />
      </View>
      {searching && <SearchResults query={query} />}
    </>
  );
}
