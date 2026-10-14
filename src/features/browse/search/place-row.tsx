/**
 * A Hubs & topics result in Browse search (#550): a Lantern hub or a Browse
 * topic, laid out like a TrackRow so the sections read as one list. A tap opens
 * that screen — neither is Plus-gated, so there's no lock.
 */
import type { FunctionReturnType } from 'convex/server';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { api } from '@/convex/_generated/api';
import { AppText } from '@/src/components/shared/app-text';
import { playSoftPress } from '@/src/lib/haptics';
import { imageSource } from '@/src/lib/image-source';

type Place = FunctionReturnType<typeof api.library.search.searchPlaces>[number];

const THUMB = 56;
const KIND_LABEL = { hub: 'Lantern hub', topic: 'Topic' } as const;

export function PlaceRow({ place, onOpen }: { place: Place; onOpen?: () => void }) {
  const open = () => {
    playSoftPress();
    onOpen?.();
    if (place.kind === 'hub') {
      router.push({ pathname: '/browse/library/hub/[slug]', params: { slug: place.slug } });
    } else {
      router.push({ pathname: '/browse/topic/[slug]', params: { slug: place.slug } });
    }
  };

  return (
    <Pressable
      className="flex-row items-center gap-3 pl-4 active:opacity-60"
      accessibilityRole="button"
      accessibilityLabel={`${place.title}, ${KIND_LABEL[place.kind]}`}
      onPress={open}
    >
      <View className="bg-surface-tertiary overflow-hidden rounded-lg" style={{ width: THUMB, height: THUMB }}>
        {place.imageUrl && <Image source={imageSource(place.imageUrl)} style={{ width: THUMB, height: THUMB }} />}
      </View>
      <View className="border-border/65 flex-1 justify-center border-b py-3 pr-4" style={{ minHeight: THUMB + 12 }}>
        <AppText className="text-[16px] font-medium" numberOfLines={1}>
          {place.title}
        </AppText>
        <AppText className="text-muted mt-0.5 text-[13px]" numberOfLines={1}>
          {KIND_LABEL[place.kind]}
        </AppText>
      </View>
    </Pressable>
  );
}
