import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from 'expo-router/react-navigation';

import { AppText } from '@/src/components/shared/app-text';
import { useAppTheme } from '@/src/context/app-theme-context';
import { DISPLAY_LEAD, DISPLAY_TAIL, getDateStamp, getGreeting } from '@/src/features/discovery/greeting';
import { useProfileSummary } from '@/src/features/profile/hooks/use-profile-summary';

const ART = require('@/assets/images/illustrations/discovery-image-bg.png');

// Anchor the crop low so the figures sit under the type block rather than
// behind it — the display lines keep a near-flat field to read against.
const ART_CROP = { bottom: 0 } as const;

const styles = StyleSheet.create({
  display: { letterSpacing: -1.1 },
  eyebrow: { letterSpacing: 1.4 },
  field: { borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
});

/**
 * Variant B — the illustration is the field. Same content as `PosterHeader`,
 * but the art runs full-bleed behind everything with a solid accent scrim over
 * it, so the poster keeps its brand colour while the illustration supplies the
 * warmth. Still no animation; the scrim is what holds text contrast.
 *
 * Swap variants in `discovery-header.tsx` — in code, not in the UI.
 */
export function ImageHeader() {
  const insets = useSafeAreaInsets();
  // displayName from preferences, matching the profile screen.
  const summary = useProfileSummary();
  const { isDark } = useAppTheme();
  // NativeTabs keeps every tab mounted, so an unconditional override here
  // would keep winning even after the user switches away from Discovery.
  const isFocused = useIsFocused();

  return (
    <View className="overflow-hidden bg-accent" style={styles.field}>
      {isFocused && <StatusBar style={isDark ? 'dark' : 'light'} />}

      <Image
        source={ART}
        contentFit="cover"
        contentPosition={ART_CROP}
        style={StyleSheet.absoluteFill}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      {/* Scrim. The accent fill is what makes the type legible over a busy,
          multi-hue illustration — thinning it below ~85% drops the eyebrow and
          the greeting under 4.5:1. */}
      <View className="absolute inset-0 bg-accent/90" />

      <View className="px-6 pb-7" style={{ paddingTop: insets.top + 12 }}>
        <AppText
          className="text-[10px] font-medium uppercase text-accent-foreground/70"
          style={styles.eyebrow}
        >
          {getDateStamp()}
        </AppText>

        <View className="mt-4">
          <AppText
            className="text-[36px] leading-9.5 font-bold text-accent-foreground"
            style={styles.display}
          >
            {DISPLAY_LEAD}
          </AppText>
          <AppText
            className="mt-1 text-[36px] leading-9.5 font-normal text-accent-foreground/75"
            style={styles.display}
          >
            {DISPLAY_TAIL}
          </AppText>
        </View>

        <View className="mt-10">
          <AppText className="text-[13px] font-semibold text-accent-foreground">
            {getGreeting(summary?.displayName)}
          </AppText>
          <AppText className="mt-0.5 text-[12px] leading-4 text-accent-foreground/75">
            You made it here again.
          </AppText>
        </View>
      </View>
    </View>
  );
}
