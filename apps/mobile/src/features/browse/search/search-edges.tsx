/**
 * Browse search's edges (#552, CONTEXT.md "Browse search"): the Need someone
 * now? row a crisis-term query gets above its results, and the no-results
 * way-outs. Neither asks what the person was looking for.
 */
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { AppText } from '@/src/components/shared/app-text';
import { playSoftPress } from '@/src/lib/haptics';

export function NeedSomeoneRow() {
  const tint = useCSSVariable('--color-accent');
  return (
    <Pressable
      className="mx-4 mt-3 flex-row items-center gap-3 rounded-2xl bg-surface-secondary px-4 py-3 active:opacity-70"
      accessibilityRole="link"
      accessibilityLabel="Need someone now? See people you can reach"
      onPress={() => {
        playSoftPress();
        router.push('/(protected)/crisis-resources');
      }}
    >
      <SymbolView name={{ ios: 'heart.text.square', android: 'favorite', web: 'favorite' }} size={22} tintColor={String(tint)} />
      <View className="flex-1">
        <AppText className="text-[15px] font-semibold">Need someone now?</AppText>
        <AppText className="text-[13px] text-muted">People you can reach, any time.</AppText>
      </View>
      <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={13} tintColor={String(tint)} />
    </Pressable>
  );
}

const WAY_OUTS = [
  { label: 'Browse topics', href: '/browse/topics' },
  { label: 'Lantern subjects', href: '/browse/library/subjects' },
] as const;

export function NoResults({ query }: { query: string }) {
  return (
    <View className="items-center gap-4 px-8 pt-16">
      <AppText className="text-center text-[17px] font-semibold" numberOfLines={3}>
        Nothing matches “{query}”
      </AppText>
      <View className="flex-row gap-3">
        {WAY_OUTS.map((w) => (
          <Pressable
            key={w.href}
            className="rounded-full bg-surface-secondary px-4 py-2 active:opacity-70"
            accessibilityRole="link"
            onPress={() => {
              playSoftPress();
              router.push(w.href);
            }}
          >
            <AppText className="text-[15px] font-medium text-accent">{w.label}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
