import type { api } from '@/convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useThemeColor } from 'heroui-native';
import { usePostHog } from 'posthog-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from '@/src/components/shared/app-text';
import { trackLibrary } from '@/src/features/library/analytics';
import { playResonanceToggle, playSoftPress } from '@/src/lib/haptics';
import { cn } from '@/src/lib/utils';
import type { ReaderEntry } from './reader-screen';
import { UpNext } from './up-next';
import { useRecord } from './use-read-signals';

const HEART = { ios: 'heart', android: 'favorite_border', web: 'favorite_border' } as const;
const HEART_FILL = { ios: 'heart.fill', android: 'favorite', web: 'favorite' } as const;
const FLUX_CAMPFIRE = require('@/assets/images/flux/flux-campfire.png');
const FLUX_PAIR = require('@/assets/images/flux/flux-pair-listening.png');

type ReaderState = FunctionReturnType<typeof api.library.reads.getReaderState>;

/**
 * The end of an entry (#410), from #395's "magazine close": a small
 * finished row with "This helped" (positive-only, undoable), then the
 * "you're not the only one" strip — shown only once the server lets the
 * total out (≥15, ADR 0016; below that `helpedCount` is null) — then
 * the next entry (#417).
 */
export function EndOfRead({
  entry: { _id: entryId, slug },
  signals: { finished, helped, helpedCount },
}: {
  entry: Pick<ReaderEntry, '_id' | 'slug'>;
  signals: Pick<ReaderState, 'finished' | 'helped' | 'helpedCount'>;
}) {
  const record = useRecord();
  const posthog = usePostHog();
  const onAccent = useThemeColor('accent-foreground');
  const foreground = useThemeColor('foreground');
  return (
    <View className="mt-12 gap-5">
      <View className="flex-row items-center gap-3 border-t border-separator pt-5">
        <Image source={FLUX_CAMPFIRE} style={{ width: 30, height: 46 }} contentFit="contain" />
        {/* Finished is the reader's own; it appears once the dwell has run. */}
        <View className="flex-1">
          {finished && (
            <>
              <AppText className="font-semibold">Finished</AppText>
              <AppText className="text-xs text-muted">Marked as read</AppText>
            </>
          )}
        </View>
        <Pressable
          onPress={() => {
            (helped ? playSoftPress : playResonanceToggle)();
            record({ entryId, helped: !helped });
            trackLibrary(posthog, 'library_entry_helped', { slug, helped: !helped });
          }}
          accessibilityRole="button"
          accessibilityLabel="This helped"
          accessibilityState={{ selected: helped }}
          accessibilityHint={helped ? 'Tap again to undo' : undefined}
          className={cn(
            'flex-row items-center gap-1.5 rounded-full px-4 py-2 active:opacity-70',
            helped ? 'bg-accent' : 'bg-surface-secondary',
          )}
        >
          <SymbolView name={helped ? HEART_FILL : HEART} size={14} tintColor={helped ? onAccent : foreground} />
          <AppText className={cn('text-sm font-semibold', helped && 'text-accent-foreground')}>This helped</AppText>
        </Pressable>
      </View>

      {helpedCount !== null && (
        <View className="flex-row items-center gap-4 rounded-3xl bg-surface p-4">
          <Image source={FLUX_PAIR} style={{ width: 64, height: 64 }} contentFit="contain" />
          <View className="flex-1 gap-0.5">
            <AppText className="font-semibold">{helpedCount} people found this helpful</AppText>
            <AppText className="text-sm text-muted">You&apos;re not the only one.</AppText>
          </View>
        </View>
      )}

      <UpNext entryId={entryId} />
    </View>
  );
}
