import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { PressableFeedback, useThemeColor } from 'heroui-native';
import { AppText } from '@/src/components/shared/app-text';
import { playSoftPress } from '@/src/lib/haptics';

const ARCHIVE_ICON_NAME = { ios: 'archivebox', android: 'archive', web: 'archive' } as const;

/**
 * The way into the Archived screen: shaped like a conversation row so it reads
 * as part of the list rather than a control above it — icon in the avatar slot,
 * count in muted text where a timestamp would sit, no chevron.
 */
export function ArchivedEntryRow({
  count,
  showSeparator,
}: {
  count: number;
  /** Omitted when no conversations follow, so the hairline never divides
      the row from nothing. */
  showSeparator: boolean;
}) {
  const router = useRouter();
  const tintColor = useThemeColor('muted') as string;

  return (
    <PressableFeedback
      onPress={() => {
        playSoftPress();
        router.push('/connect/archived');
      }}
      accessibilityRole="button"
      accessibilityLabel={`Archived, ${count} ${count === 1 ? 'conversation' : 'conversations'}`}
    >
      <View className="px-4">
        <View className="flex-row items-center gap-3 py-3">
          <View className="size-11 rounded-full bg-surface-secondary items-center justify-center">
            <SymbolView name={ARCHIVE_ICON_NAME} size={20} tintColor={tintColor} />
          </View>
          <View className="flex-1 flex-row items-center">
            <AppText className="flex-1 text-sm font-semibold text-foreground">Archived</AppText>
            <AppText className="text-[13px] text-muted">{count}</AppText>
          </View>
        </View>
        {/* Inset to the text column: avatar (44) + gap (12) — the same hairline
            the conversation rows below draw. */}
        {showSeparator && <View className="h-px bg-border/40 ml-14" />}
      </View>
    </PressableFeedback>
  );
}
