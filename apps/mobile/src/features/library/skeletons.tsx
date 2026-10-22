/**
 * Lantern's loading shapes: each mirrors the screen it stands in for, so a
 * slow `getHome` / `getEntry` / list query reads as "arriving", not blank.
 */
import { Skeleton } from 'heroui-native';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CARD_RADIUS } from '@/src/features/library/home/entry-cards';
import { BackButton } from '@/src/features/library/reader/reader-parts';

const Title = () => <Skeleton className="mx-4 mb-3 mt-8 h-6 w-40 rounded-md" />;

/** Photo card: Continue reading, then For you's centred row with its neighbours peeking. */
export function HomeSkeleton() {
  const { width } = useWindowDimensions();
  const itemW = Math.round(width * 0.7);
  const card = { borderRadius: CARD_RADIUS, height: 340 };
  return (
    <View accessibilityLabel="Loading Lantern">
      <Title />
      <Skeleton className="mx-4" style={card} />
      <Title />
      <View className="flex-row items-center justify-center gap-2.5">
        <Skeleton style={{ ...card, width: itemW, height: 300 }} />
        <Skeleton style={{ ...card, width: itemW }} />
        <Skeleton style={{ ...card, width: itemW, height: 300 }} />
      </View>
    </View>
  );
}

/** EntryRow's shape: thumbnail, kicker, two-line title, meta. */
export function RowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View accessibilityLabel="Loading">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} className="flex-row items-center gap-4 px-4 py-3">
          <Skeleton className="rounded-[14px]" style={{ width: 104, height: 78 }} />
          <View className="flex-1 gap-2">
            <Skeleton className="h-3 w-1/3 rounded" />
            <Skeleton className="h-4 w-11/12 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Hub header (cover, title, intro) over its rows. */
export function HubSkeleton() {
  const { width } = useWindowDimensions();
  return (
    <>
      <Skeleton className="rounded-none" style={{ width, height: width * 0.62 }} />
      <View className="gap-2.5 px-4 pb-4 pt-5">
        <Skeleton className="h-8 w-3/5 rounded-md" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-4/5 rounded" />
      </View>
      <RowsSkeleton count={4} />
    </>
  );
}

/** A–Z: plain one-line rows, inside a scroll view so the large title still collapses. */
export function SubjectsSkeleton() {
  return (
    <ScrollView className="flex-1 bg-background" contentInsetAdjustmentBehavior="automatic">
      <View className="gap-5 px-4 pt-4" accessibilityLabel="Loading">
        <Skeleton className="h-3 w-4 rounded" />
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-4 rounded" style={{ width: `${45 + ((i * 17) % 40)}%` }} />
        ))}
      </View>
    </ScrollView>
  );
}

/** The reader's cover fold: cover block, sheet with title and a few paragraph lines. */
export function ReaderSkeleton() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const coverH = Math.round(height * 0.52);
  return (
    <View className="flex-1 bg-background" accessibilityLabel="Loading">
      <Skeleton className="rounded-none" style={{ height: coverH }} />
      <View className="absolute left-4" style={{ top: insets.top + 6 }}>
        <BackButton onCover />
      </View>
      <View className="-mt-7 flex-1 gap-3 rounded-t-[28px] bg-background px-5 pt-7" style={{ borderCurve: 'continuous' }}>
        <Skeleton className="h-3 w-1/4 rounded" />
        <Skeleton className="h-7 w-11/12 rounded-md" />
        <Skeleton className="mb-4 h-7 w-3/5 rounded-md" />
        {['w-full', 'w-full', 'w-11/12', 'w-full', 'w-2/3'].map((w, i) => (
          <Skeleton key={i} className={`h-4 rounded ${w}`} />
        ))}
      </View>
    </View>
  );
}
