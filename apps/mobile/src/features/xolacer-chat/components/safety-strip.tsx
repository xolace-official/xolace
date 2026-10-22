import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { PressableFeedback, useThemeColor } from 'heroui-native';
import { SymbolView } from 'expo-symbols';
import { AppText } from '@/src/components/shared/app-text';
import { playSoftPress } from '@/src/lib/haptics';

const LIFERING_ICON = {
  ios: 'lifepreserver',
  android: 'support',
  web: 'support',
} as const;

/**
 * Persistent, non-dismissible link to crisis resources inside every thread.
 * The post-delivery moderation lane (#344) sends a resources card when a
 * message reads as a crisis; this is the always-there path for everything it
 * misses.
 */
export function SafetyStrip() {
  const router = useRouter();
  const accent = useThemeColor('accent') as string;
  const muted = useThemeColor('muted') as string;

  return (
    <View className="flex-row items-center gap-2 border-b border-border/40 bg-surface-secondary px-4 py-2">
      <SymbolView name={LIFERING_ICON} size={13} tintColor={muted} />
      <AppText className="text-[11px] text-muted flex-1">Something urgent?</AppText>
      <PressableFeedback
        onPress={() => {
          playSoftPress();
          router.push('/crisis-resources?from=xolacer_chat');
        }}
        accessibilityRole="button"
        accessibilityLabel="Open crisis resources"
      >
        <AppText className="text-[11px] font-semibold" style={{ color: accent }}>
          Crisis resources
        </AppText>
      </PressableFeedback>
    </View>
  );
}
