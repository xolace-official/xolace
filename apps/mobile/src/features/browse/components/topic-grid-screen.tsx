import { useEffect } from 'react';
import { router } from 'expo-router';
import { LegendList } from '@legendapp/list/react-native';
import { useQuery } from 'convex/react';
import { Skeleton } from 'heroui-native';
import { usePostHog } from 'posthog-react-native';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';

import type { FunctionReturnType } from 'convex/server';
import { api } from '@/convex/_generated/api';
import { AppText } from '@/src/components/shared/app-text';
import { CoverImage } from '@/src/features/library/cover-image';
import { playSoftPress } from '@/src/lib/haptics';
import { useMiniPlayerInset } from '@/src/features/browse/now-playing/now-playing-store';

type Topic = FunctionReturnType<typeof api.browse.getTopics>[number];

const GUTTER = 16;
const GAP = 12;

const keyExtractor = (t: Topic) => t.slug;

function countLine(t: Topic) {
  const parts = [];
  if (t.supportCount > 0) parts.push(`${t.supportCount} spoken`);
  if (t.musicCount > 0) parts.push(`${t.musicCount} music`);
  return parts.join(' · ');
}

/**
 * Topic grid (`topics`, §9.3) — a grid of *topics*, one tile per shared topic
 * with ≥ 1 active track in either family. Two-up, square artwork.
 */
export function TopicGridScreen() {
  // Clears the floating mini-player off the last row (none on iOS 26).
  const playerInset = useMiniPlayerInset();
  const posthog = usePostHog();
  const topics = useQuery(api.browse.getTopics, {});
  const { width } = useWindowDimensions();
  const tile = (width - GUTTER * 2 - GAP) / 2;

  useEffect(() => {
    posthog.capture('browse_topics_opened');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (topics === undefined) {
    return (
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: GUTTER - GAP / 2, paddingTop: 8 }}
      >
        <View className="flex-row flex-wrap">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ width: tile, marginHorizontal: GAP / 2, marginBottom: GAP + 4 }}>
              <Skeleton className="rounded-xl" style={{ width: tile, height: tile }} />
              <View className="mt-2 gap-1.5">
                <Skeleton className="h-3.75 w-3/4 rounded" />
                <Skeleton className="h-3.25 w-1/2 rounded" />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <LegendList
      data={topics}
      numColumns={2}
      recycleItems
      keyExtractor={keyExtractor}
      estimatedItemSize={tile + 48}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: GUTTER - GAP / 2, paddingTop: 8, paddingBottom: 40 + playerInset }}
      renderItem={({ item }) => (
        <Pressable
          className="active:opacity-60"
          style={{ width: tile, marginHorizontal: GAP / 2, marginBottom: GAP + 4 }}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}, ${countLine(item)}`}
          onPress={() => {
            playSoftPress();
            router.push(`/browse/topic/${item.slug}` as never);
          }}
        >
          <View className="bg-surface-tertiary overflow-hidden rounded-xl" style={{ width: tile, height: tile }}>
            <CoverImage
              uri={item.thumbUrl}
              thumbhash={item.thumbhash}
              recyclingKey={item.slug}
              style={{ width: tile, height: tile }}
            />
          </View>
          <View className="mt-2">
            <AppText className="text-[15px] font-semibold" numberOfLines={1}>
              {item.title}
            </AppText>
            <AppText className="text-muted text-[13px]" numberOfLines={1}>
              {countLine(item)}
            </AppText>
          </View>
        </Pressable>
      )}
    />
  );
}
