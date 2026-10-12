/**
 * The one Lantern list (#393 routes): a hub in the editor's order (cover and
 * intro on top, entries numbered, audio rows inline), or every active entry
 * of a kind or subject. Filter/sort menu from #396 is not built yet.
 */
import { useQuery } from 'convex/react';
import { Stack, useIsPreview } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useEffect } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';

import { api } from '@/convex/_generated/api';
import { AppText } from '@/src/components/shared/app-text';
import { CoverImage } from '@/src/features/library/cover-image';
import { trackLibrary } from '@/src/features/library/analytics';
import { TrackRow } from '@/src/features/browse/components/track-row';
import { EntryRow } from '@/src/features/library/home/entry-cards';
import { KINDS, type Kind, facetLabel } from '@/src/features/library/home/library-copy';
import { HubSkeleton, RowsSkeleton } from '@/src/features/library/skeletons';

export type ListBy = { hub: string } | { kind: Kind } | { subject: string };

function HubList({ slug }: { slug: string }) {
  const { width } = useWindowDimensions();
  const hub = useQuery(api.library.hubs.getHub, { slug });
  if (hub === undefined) return <HubSkeleton />;
  if (hub === null) return <Empty line="This hub has been put away." />;

  let n = 0;
  return (
    <>
      <View className="bg-surface-secondary" style={{ width, height: width * 0.62 }}>
        <CoverImage uri={hub.coverUrl} thumbhash={hub.coverThumbhash} style={{ width: '100%', height: '100%' }} transition={200} />
      </View>
      <View className="gap-2 px-4 pb-2 pt-5">
        <AppText accessibilityRole="header" className="text-[30px] font-bold leading-[35px]">
          {hub.title}
        </AppText>
        <AppText className="text-[16px] leading-[22px] text-muted">{hub.intro}</AppText>
      </View>
      {hub.items.map((item) =>
        item.kind === 'entry' ? (
          <EntryRow key={item.entry._id} entry={item.entry} index={n++} from="hub" hub={slug} />
        ) : (
          <TrackRow key={item.track._id} track={item.track} from="library-hub" />
        ),
      )}
    </>
  );
}

function EntryList({ kind, subject }: { kind?: Kind; subject?: string }) {
  const entries = useQuery(api.library.entries.listEntries, { kind, subject });
  if (entries === undefined) return <RowsSkeleton />;
  if (entries.length === 0) return <Empty line="Nothing here yet." />;
  return entries.map((e) => <EntryRow key={e._id} entry={e} from={kind ? 'kind' : 'subject'} />);
}

const Empty = ({ line }: { line: string }) => (
  <AppText className="px-4 pt-12 text-center text-[15px] text-muted">{line}</AppText>
);

/** One branch on what the list is of: its header title and its rows. */
function listOf(by: ListBy) {
  if ('hub' in by) return { title: '', rows: <HubList slug={by.hub} /> };
  if ('kind' in by)
    return { title: KINDS.find((k) => k.kind === by.kind)?.label ?? '', rows: <EntryList kind={by.kind} /> };
  return { title: facetLabel(by.subject), rows: <EntryList subject={by.subject} /> };
}

export function LibraryListScreen({ by }: { by: ListBy }) {
  const { title, rows } = listOf(by);
  const posthog = usePostHog();
  const key = 'hub' in by ? by.hub : 'kind' in by ? by.kind : by.subject;
  const isPreview = useIsPreview(); // a long-press preview isn't an open

  useEffect(() => {
    if (isPreview) return;
    if ('hub' in by) trackLibrary(posthog, 'library_hub_opened', { hub: by.hub });
    else if ('kind' in by) trackLibrary(posthog, 'library_kind_opened', { kind: by.kind });
    else trackLibrary(posthog, 'library_subject_opened', { subject: by.subject });
    // Once per list, not per render of the `by` object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {rows}
      </ScrollView>
    </>
  );
}
