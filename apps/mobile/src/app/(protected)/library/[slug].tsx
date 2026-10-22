/**
 * The Lantern reader (#407, route per #393): one route for every way into an
 * entry — Browse, a twig, Tonight's reading, `xolace://library/<slug>`.
 * Full-screen at the protected root, no tab bar.
 */
import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/src/components/shared/app-text';
import { BackButton } from '@/src/features/library/reader/reader-parts';
import { ReaderScreen } from '@/src/features/library/reader/reader-screen';
import { ReaderSkeleton } from '@/src/features/library/skeletons';

export default function LibraryReaderRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const entry = useQuery(api.library.entries.getEntry, { slug });
  const insets = useSafeAreaInsets();

  if (entry) return <ReaderScreen entry={entry} />;
  if (entry === undefined) return <ReaderSkeleton />;
  return (
    <View className="flex-1 bg-background px-4" style={{ paddingTop: insets.top + 6 }}>
      <BackButton />
      <View className="flex-1 items-center justify-center px-4">
        <AppText className="text-center text-muted">This entry isn&apos;t in Lantern anymore.</AppText>
      </View>
    </View>
  );
}
