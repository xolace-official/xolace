/**
 * The Browse home with Browse search (#549, CONTEXT.md "Browse search"): the
 * native header bar swaps the hub for results while there's a query. The hub
 * stays mounted underneath, so clearing or cancelling brings it back as it was.
 * Sections run Lantern, Support audio, Music, Hubs & topics, each ranked on its
 * own (#550); a section with no matches is hidden. Each shows its first few,
 * with a See all for the rest when there are more (#551).
 */
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
  row: (item: T) => ReactNode;
}) {
  if (items.length === 0) return null;
  const seeAll = () => router.push({ pathname: '/browse/search', params: { section, q: query } });
  return (
    <>
      <SectionTitle
        title={SECTION_TITLE[section]}
        {...(items.length > PREVIEW && { action: 'See all', onAction: seeAll })}
      />
      {items.slice(0, PREVIEW).map(row)}
    </>
  );
}

function SearchResults({ query }: { query: string }) {
  const playerInset = useMiniPlayerInset();
  // Holds the last results while the next keystroke's load, so nothing blanks.
  const lantern = useStableQuery(api.library.search.searchEntries, query ? { query } : 'skip');
  const catalogue = useStableQuery(api.library.search.searchCatalogue, query ? { query } : 'skip');
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
      {loading ? (
        <RowsSkeleton count={3} />
      ) : empty ? (
        <AppText className="px-4 pt-8 text-[15px] text-muted">Nothing matches that.</AppText>
      ) : (
        <>
          <Section
            section="lantern"
            query={query}
            items={lantern}
            row={(e) => <EntryRow key={e._id} entry={e} from="search" />}
          />
          <Section
            section="support"
            query={query}
            items={catalogue.support}
            row={(t) => <TrackRow key={t._id} track={t} from="search" />}
          />
          <Section
            section="music"
            query={query}
            items={catalogue.music}
            row={(t) => <TrackRow key={t._id} track={t} from="search" />}
          />
          <Section
            section="places"
            query={query}
            items={catalogue.places}
            row={(p) => <PlaceRow key={`${p.kind}:${p.slug}`} place={p} />}
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
