/**
 * A Browse search section's See all (#551, `search?section=…&q=…`): every
 * match for that query, in the rows Browse already uses. Lantern, Support
 * audio and Music page in on scroll; Hubs & topics is a small bounded list,
 * so it shows whole. Taps report only section and position (#552).
 */
import type { PaginationStatus } from 'convex/browser';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { LegendList } from '@legendapp/list/react-native';
import type { ReactElement } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';

import { api } from '@/convex/_generated/api';
import { AppText } from '@/src/components/shared/app-text';
import { TrackRow } from '@/src/features/browse/components/track-row';
import { useMiniPlayerInset } from '@/src/features/browse/now-playing/now-playing-store';
import { PlaceRow } from '@/src/features/browse/search/place-row';
import { useSearchTap } from '@/src/features/browse/search/search-analytics';
import { SECTION_TITLE, type SearchSection } from '@/src/features/browse/search/search-sections';
import { EntryRow } from '@/src/features/library/home/entry-cards';
import { RowsSkeleton } from '@/src/features/library/skeletons';

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
  if (status === 'LoadingFirstPage') return <RowsSkeleton count={4} />;
  return (
    <LegendList
      data={results}
      renderItem={({ item, index }) => row(item, index + 1)}
      keyExtractor={(item) => item._id}
      estimatedItemSize={80}
      onEndReached={status === 'CanLoadMore' ? () => loadMore(PAGE_SIZE) : undefined}
      onEndReachedThreshold={0.4}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 40 + playerInset }}
      ListEmptyComponent={<AppText className="px-4 pt-8 text-[15px] text-muted">Nothing matches that.</AppText>}
      ListFooterComponent={isLoading && results.length > 0 ? <ActivityIndicator className="py-4" /> : null}
    />
  );
}

function Entries({ query }: { query: string }) {
  const tap = useSearchTap('see_all');
  const page = usePaginatedQuery(api.library.search.searchEntriesPage, { query }, { initialNumItems: PAGE_SIZE });
  return <Paged page={page} row={(e, i) => <EntryRow entry={e} from="search" onOpen={tap('lantern', i)} />} />;
}

function Tracks({ query, family }: { query: string; family: 'support' | 'music' }) {
  const tap = useSearchTap('see_all');
  const page = usePaginatedQuery(
    api.library.search.searchTracksPage,
    { query, family },
    { initialNumItems: PAGE_SIZE },
  );
  return <Paged page={page} row={(t, i) => <TrackRow track={t} from="search" onOpen={tap(family, i)} />} />;
}

function Places({ query }: { query: string }) {
  const playerInset = useMiniPlayerInset();
  const tap = useSearchTap('see_all');
  const places = useQuery(api.library.search.searchPlaces, { query });
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 40 + playerInset }}
    >
      {places === undefined ? (
        <RowsSkeleton count={4} />
      ) : (
        places.map((p, i) => <PlaceRow key={`${p.kind}:${p.slug}`} place={p} onOpen={tap('places', i + 1)} />)
      )}
    </ScrollView>
  );
}

export function SearchSectionScreen() {
  const { section, q = '' } = useLocalSearchParams<{
    section?: string;
    q?: string;
  }>();
  const known: SearchSection =
    section && Object.hasOwn(SECTION_TITLE, section) ? (section as SearchSection) : 'lantern';
  return (
    <>
      <Stack.Screen options={{ title: SECTION_TITLE[known] }} />
      {known === 'lantern' ? (
        <Entries query={q} />
      ) : known === 'places' ? (
        <Places query={q} />
      ) : (
        <Tracks query={q} family={known} />
      )}
    </>
  );
}
