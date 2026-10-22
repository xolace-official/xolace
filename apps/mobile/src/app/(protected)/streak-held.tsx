import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableFeedback } from 'heroui-native';
import { useMutation } from 'convex/react';

import { api } from '@/convex/_generated/api';
import { AppText } from '@/src/components/shared/app-text';

// Placeholder until the freeze illustration lands.
const ART = require('@/assets/images/flux/flux-campfire.png');

/**
 * Shown once after a streak freeze covered missed days (#436). Opened by the
 * home screen with the count settle() returned.
 */
export default function StreakHeld() {
  const insets = useSafeAreaInsets();
  const days = Number(useLocalSearchParams<{ days: string }>().days) || 1;
  const acknowledgeFreezes = useMutation(api.streaks.state.acknowledgeFreezes);

  // Acknowledge on the way out (the CTA or Android back), not on open: an app
  // killed while this is up shows it again next launch.
  useEffect(() => () => void acknowledgeFreezes().catch(() => {}), [acknowledgeFreezes]);

  return (
    <View
      className="flex-1 bg-background px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }}
    >
      <View className="flex-1 items-center justify-center">
        <Image
          source={ART}
          contentFit="contain"
          style={styles.art}
          accessibilityIgnoresInvertColors
          accessible={false}
        />
        <AppText className="mt-8 text-[11px] uppercase tracking-widest text-foreground/45">
          Streak held
        </AppText>
        <AppText
          accessibilityRole="header"
          className="mt-3 text-center font-serif text-3xl text-foreground"
        >
          Your fire kept burning
        </AppText>
        <AppText className="mt-4 text-center text-[15px] leading-6 text-foreground/65">
          {days > 1
            ? `You were away for ${days} days. ${days} freezes covered them, so your streak is still lit.`
            : 'You were away for a day. A freeze covered it, so your streak is still lit.'}
        </AppText>
      </View>

      <PressableFeedback
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Thank you"
        className="h-13 w-full items-center justify-center rounded-2xl bg-accent"
      >
        <AppText className="text-base font-[Poppins-Medium] text-accent-foreground">
          Thank you
        </AppText>
      </PressableFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  art: { width: 260, height: 260 },
});
