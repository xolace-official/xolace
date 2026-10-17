import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useQuery } from 'convex/react';
import { usePostHog } from 'posthog-react-native';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { api } from '@/convex/_generated/api';
import { AppText } from '@/src/components/shared/app-text';
import { imageSource } from '@/src/lib/image-source';
import { playSoftPress } from '@/src/lib/haptics';
import { ShelfTile } from '@/src/features/browse/components/shelf-tile';
import { pickListeningTip } from '@/src/features/browse/components/listening-tip';
import { useMiniPlayerInset } from '@/src/features/browse/now-playing/now-playing-store';
import { useUtcDay } from '@/src/features/browse/use-utc-day';

type Entry = {
  id: 'support' | 'music' | 'topics' | 'lantern';
  label: string;
  icon: SymbolViewProps['name'];
  bg: string;
  fg: '--color-browse-audio-foreground' | '--color-browse-music-foreground' | '--color-browse-topics-foreground';
  href: string;
};

const ENTRIES: Entry[] = [
  { id: 'support', label: 'Support audio', icon: { ios: 'waveform', android: 'graphic_eq', web: 'graphic_eq' }, bg: 'bg-browse-audio', fg: '--color-browse-audio-foreground', href: '/browse/list?family=support' },
  { id: 'music', label: 'Music', icon: { ios: 'music.note', android: 'music_note', web: 'music_note' }, bg: 'bg-browse-music', fg: '--color-browse-music-foreground', href: '/browse/list?family=music' },
  { id: 'topics', label: 'Topics', icon: { ios: 'square.grid.2x2', android: 'grid_view', web: 'grid_view' }, bg: 'bg-browse-topics', fg: '--color-browse-topics-foreground', href: '/browse/topics' },
  // The Library's home, inside Browse (#393, #409); branded Lantern (#394).
  { id: 'lantern', label: 'Lantern', icon: { ios: 'book', android: 'menu_book', web: 'menu_book' }, bg: 'bg-browse-topics', fg: '--color-browse-topics-foreground', href: '/browse/library' },
];

function EntryButton({ entry }: { entry: Entry }) {
  const tint = useCSSVariable(entry.fg);

  return (
    <Pressable
      className="items-center gap-2"
      accessibilityRole="button"
      accessibilityLabel={entry.label}
      onPress={() => {
        playSoftPress();
        // #339 hasn't landed these routes yet — this slice (#338) only needs
        // the hub to point at the right destination.
        router.push(entry.href as never);
      }}
    >
      <View className={`h-16 w-16 items-center justify-center rounded-full ${entry.bg}`}>
        <SymbolView name={entry.icon} size={26} tintColor={String(tint)} />
      </View>
      <AppText className="text-xs font-medium">{entry.label}</AppText>
    </Pressable>
  );
}

/**
 * Browse hub (#338, docs/paths-v1.md §9.3) — entry row + New shelf. Open to
 * every signed-in user; the free-user gate is on playback, not browsing.
 */
export function BrowseHubScreen() {
  // Clears the floating mini-player off the last row (none on iOS 26).
  const playerInset = useMiniPlayerInset();
  const { width } = useWindowDimensions();
  const posthog = usePostHog();
  const day = useUtcDay();
  const shelf = useQuery(api.browse.getNewShelf, { day });
  const featured = useQuery(api.browse.getFeatured, {});
  const [tip] = useState(pickListeningTip);
  const mutedTint = useCSSVariable('--muted');

  useEffect(() => {
    posthog.capture('browse_opened');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 40 + playerInset }}
    >
      <View className="flex-row items-center gap-1.5 px-4 pt-4">
        <SymbolView
          name={{ ios: 'headphones', android: 'headphones', web: 'headphones' }}
          size={13}
          tintColor={String(mutedTint)}
        />
        <AppText className="text-muted flex-1 text-[13px]">{tip}</AppText>
      </View>

      <View className="flex-row justify-around px-4 pt-6">
        {ENTRIES.map((entry) => (
          <EntryButton key={entry.id} entry={entry} />
        ))}
      </View>

      {featured && (
        <View className="px-4 pt-8">
          <AppText className="text-muted text-[13px] font-semibold uppercase tracking-wide">
            Featured this week
          </AppText>
          <AppText className="mt-0.5 text-2xl font-bold">{featured.title}</AppText>
          {featured.attribution && (
            <AppText className="text-muted mb-3 text-[15px]">{featured.attribution}</AppText>
          )}
          <View
            className="bg-surface-tertiary overflow-hidden rounded-[14px]"
            style={{ width: width - 32, height: (width - 32) * 0.55, marginTop: featured.attribution ? 0 : 8 }}
          >
            <Image
              source={imageSource(featured.thumbUrl)}
              placeholder={featured.thumbhash ? { thumbhash: featured.thumbhash } : undefined}
              placeholderContentFit="cover"
              style={{ width: '100%', height: '100%' }}
              transition={200}
            />
          </View>
        </View>
      )}

      {shelf && shelf.length > 0 && (
        <>
          <AppText className="px-4 pb-2 pt-8 text-[22px] font-bold">New</AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 14, paddingHorizontal: 16 }}
          >
            {shelf.map((item) => (
              <ShelfTile key={item._id} item={item} from="hub-new" />
            ))}
          </ScrollView>
        </>
      )}
    </ScrollView>
  );
}
