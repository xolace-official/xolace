/**
 * The Browse home with Browse search (#549, CONTEXT.md "Browse search"): the
 * native header bar swaps the hub for results while there's a query. The hub
 * stays mounted underneath, so clearing or cancelling brings it back as it was.
 * Lantern is the only section so far; audio, music and topics join later.
 */
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { api } from '@/convex/_generated/api';
import { AppText } from '@/src/components/shared/app-text';
import { useStableQuery } from '@/src/lib/convex/use-stable-query';
import { useDebounce } from '@/src/lib/use-debounce';
import { cn } from '@/src/lib/utils';
import { BrowseHubScreen } from '@/src/features/browse/components/browse-hub-screen';
import { useMiniPlayerInset } from '@/src/features/browse/now-playing/now-playing-store';
import { EntryRow, SectionTitle } from '@/src/features/library/home/entry-cards';
import { RowsSkeleton } from '@/src/features/library/skeletons';

const DEBOUNCE_MS = 250;

function SearchResults({ query }: { query: string }) {
  const playerInset = useMiniPlayerInset();
  // Holds the last results while the next keystroke's load, so nothing blanks.
  const lantern = useStableQuery(api.library.search.searchEntries, query ? { query } : 'skip');

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 40 + playerInset }}
    >
      <SectionTitle title="Lantern" />
      {lantern === undefined ? (
        <RowsSkeleton count={3} />
      ) : lantern.length === 0 ? (
        <AppText className="px-4 text-[15px] text-muted">Nothing in Lantern matches that.</AppText>
      ) : (
        lantern.map((e) => <EntryRow key={e._id} entry={e} from="search" />)
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
