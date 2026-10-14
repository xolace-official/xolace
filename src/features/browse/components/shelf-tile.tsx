import { SymbolView } from 'expo-symbols';
import { Pressable, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import type { FunctionReturnType } from 'convex/server';
import type { api } from '@/convex/_generated/api';
import { AppText } from '@/src/components/shared/app-text';
import { CoverImage } from '@/src/features/library/cover-image';
import { useOpenTrack, type BrowseFrom } from '@/src/features/browse/use-open-track';

export type ShelfItem = FunctionReturnType<typeof api.browse.getNewShelf>[number];

export const TILE = 170;

/**
 * One square tile of the newest-4 shelf — the hub's New shelf and the
 * Discovery "From the library" strip (§9.3, §9.5) render the same query
 * through this. Tap → player, or the paywall for a free user (§9.4).
 */
export function ShelfTile({ item, from, size = TILE }: { item: ShelfItem; from: BrowseFrom; size?: number }) {
  const { open, locked } = useOpenTrack(from);
  const lockTint = useCSSVariable('--color-foreground');

  return (
    <Pressable
      style={{ width: size }}
      className="active:opacity-60"
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${item.attribution ? `, ${item.attribution}` : ''}`}
      onPress={() => open(item)}
    >
      <View className="bg-surface-tertiary overflow-hidden rounded-[10px]" style={{ width: size, height: size }}>
        <CoverImage uri={item.thumbUrl} thumbhash={item.thumbhash} style={{ width: size, height: size }} />
        {locked && (
          <View className="bg-background/85 absolute bottom-1.5 right-1.5 h-5 w-5 items-center justify-center rounded-full">
            <SymbolView name={{ ios: "lock.fill", android: "lock", web: "lock" }} size={10} tintColor={String(lockTint)} accessibilityLabel="Xolace+" />
          </View>
        )}
      </View>
      <AppText className="mt-1.5 text-[13px] font-medium" numberOfLines={1}>
        {item.title}
      </AppText>
      {item.attribution && (
        <AppText className="text-muted text-xs" numberOfLines={1}>
          {item.attribution}
        </AppText>
      )}
    </Pressable>
  );
}
