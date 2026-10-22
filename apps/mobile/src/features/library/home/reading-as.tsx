/**
 * "Reading as…" (#393, #409): the one-time inline card, then a native header
 * menu to change the same answer. Dismissing is a valid answer — For you
 * then reads the Understanding alone.
 */
import AccountCircle from '@expo/material-symbols/account_circle.xml';
import { Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/src/components/shared/app-text';
import { cn } from '@/src/lib/utils';
import { facetLabel } from '@/src/features/library/home/library-copy';

const toggle = (list: string[], slug: string) =>
  list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];

export function ReadingAsCard({ options, onAnswer }: { options: string[]; onAnswer: (audiences: string[]) => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const muted = useThemeColor('muted');

  return (
    <View className="mx-4 mt-4 gap-3 rounded-[24px] bg-surface p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-0.5">
          <AppText className="text-[17px] font-semibold">Reading as…</AppText>
          <AppText className="text-[14px] text-muted">Pick any that fit. It only shapes what’s picked for you.</AppText>
        </View>
        <Pressable onPress={() => onAnswer([])} hitSlop={10} accessibilityRole="button" accessibilityLabel="Skip">
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={14} tintColor={muted} />
        </Pressable>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {options.map((slug) => {
          const on = picked.includes(slug);
          return (
            <Pressable
              key={slug}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => setPicked((cur) => toggle(cur, slug))}
              className={cn('rounded-full px-3.5 py-2', on ? 'bg-accent' : 'bg-surface-secondary')}
            >
              <AppText className={cn('text-[14px] font-medium', on && 'text-accent-foreground')}>{facetLabel(slug)}</AppText>
            </Pressable>
          );
        })}
      </View>
      {picked.length > 0 && (
        <Pressable onPress={() => onAnswer(picked)} accessibilityRole="button" className="items-center rounded-full bg-foreground py-2.5">
          <AppText className="text-[15px] font-semibold text-background">Done</AppText>
        </Pressable>
      )}
    </View>
  );
}

/** Header control once the card is answered: same choice, multi-select. */
export function ReadingAsMenu({ options, value, onChange }: { options: string[]; value: string[]; onChange: (a: string[]) => void }) {
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Menu
        icon={process.env.EXPO_OS === 'ios' ? 'person.crop.circle' : AccountCircle}
        title="Reading as…"
        accessibilityLabel="Reading as"
      >
        {options.map((slug) => (
          <Stack.Toolbar.MenuAction key={slug} isOn={value.includes(slug)} onPress={() => onChange(toggle(value, slug))}>
            {facetLabel(slug)}
          </Stack.Toolbar.MenuAction>
        ))}
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}
