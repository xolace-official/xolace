import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import type { FunctionReturnType } from 'convex/server';
import type { api } from '@/convex/_generated/api';
import { AppText } from '@/src/components/shared/app-text';
import { imageSource } from '@/src/lib/image-source';
import { useOpenTrack, type BrowseFrom } from '@/src/features/browse/use-open-track';

export type { BrowseFrom };
export type TrackItem = FunctionReturnType<typeof api.browse.getTopic>[number];

export const FAMILY_LABEL = { support: 'Support audio', music: 'Music' } as const;

const THUMB = 56;

/**
 * One catalogue row (§9.3): square artwork, title, one subtitle line. No
 * inline play — a tap opens the player (#340). `glyph` marks the family and
 * is only shown on the topic screen, the one list both families share.
 *
 * Free users (§9.4): the thumbnail wears a lock and the tap opens the paywall
 * instead of the player (`useOpenTrack`).
 */
export function TrackRow({
  track,
  from,
  glyph = false,
  onOpen,
}: {
  track: TrackItem;
  from: BrowseFrom;
  glyph?: boolean;
  /** Runs before the open, e.g. Browse search's tap analytics. */
  onOpen?: () => void;
}) {
  const { open, locked } = useOpenTrack(from);
  const tint = useCSSVariable(
    track.family === 'music' ? '--color-browse-music-foreground' : '--color-browse-audio-foreground',
  );

  const lockTint = useCSSVariable('--color-foreground');

  const subtitle =
    track.episodeNumber !== undefined
      ? `Episode ${track.episodeNumber}${track.attribution ? ` · ${track.attribution}` : ''}`
      : track.attribution;

  return (
    <Pressable
      className="flex-row items-center gap-3 pl-4 active:opacity-60"
      accessibilityRole="button"
      accessibilityLabel={`${track.title}${subtitle ? `, ${subtitle}` : ''}`}
      onPress={() => {
        onOpen?.();
        open(track);
      }}
    >
      <View className="bg-surface-tertiary overflow-hidden rounded-lg" style={{ width: THUMB, height: THUMB }}>
        <Image source={imageSource(track.thumbUrl)} style={{ width: THUMB, height: THUMB }} />
        {locked && (
          <View className="bg-background/85 absolute bottom-1 right-1 h-5 w-5 items-center justify-center rounded-full">
            <SymbolView name={{ ios: "lock.fill", android: "lock", web: "lock" }} size={10} tintColor={String(lockTint)} accessibilityLabel="Xolace+" />
          </View>
        )}
      </View>
      <View className="border-border/65 flex-1 flex-row items-center gap-2 border-b py-3 pr-4" style={{ minHeight: THUMB + 12 }}>
        <View className="flex-1">
          <AppText className="text-[16px] font-medium" numberOfLines={1}>
            {track.title}
          </AppText>
          {subtitle && (
            <AppText className="text-muted mt-0.5 text-[13px]" numberOfLines={1}>
              {subtitle}
            </AppText>
          )}
        </View>
        {glyph && (
          <SymbolView
            name={
              track.family === 'music'
                ? { ios: 'music.note', android: 'music_note', web: 'music_note' }
                : { ios: 'waveform', android: 'graphic_eq', web: 'graphic_eq' }
            }
            size={16}
            tintColor={String(tint)}
            accessibilityLabel={track.family === 'music' ? 'Music' : 'Spoken'}
          />
        )}
      </View>
    </Pressable>
  );
}
