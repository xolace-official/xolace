import { View } from 'react-native';
import { Skeleton } from 'heroui-native';

/**
 * Stands in for the message list while the Stream connection opens and the
 * channel is watched. Bottom-anchored and bubble-shaped so it occupies the same
 * region the first real messages will, rather than reflowing the screen when
 * they land.
 */
export function ThreadSkeleton() {
  return (
    <View className="flex-1 justify-end gap-3 bg-background px-4 pb-10">
      <Skeleton className="h-12 w-2/3 rounded-2xl" />
      <Skeleton className="h-12 w-1/2 self-end rounded-2xl" />
      <Skeleton className="h-12 w-3/5 rounded-2xl" />
    </View>
  );
}
