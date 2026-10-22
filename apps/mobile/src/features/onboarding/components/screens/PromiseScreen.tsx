import { useEffect, useRef } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import { EaseView } from 'react-native-ease/uniwind';
import { StatusBar } from 'expo-status-bar';
import { usePostHog } from 'posthog-react-native';

import { AppText } from '@/src/components/shared/app-text';
import { playGentlePresence, playOnboardingEntrance } from '@/src/lib/haptics';
import { MoodMarquee } from '@/src/features/onboarding/components/mood-marquee';
import { DuskDriftBackdrop } from '@/src/features/onboarding/components/dusk-drift-backdrop';
import { MOODS } from '@/src/features/onboarding/moods';
import { useAppStore } from '@/src/store/store';

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_INITIAL_SLIDE = { opacity: 0, translateY: 20 };
const EASE_ANIMATE_SLIDE = { opacity: 1, translateY: 0 };
const EASE_CONTENT_TRANSITION = {
  opacity: { type: 'timing' as const, duration: 400, delay: 300, easing: EASING },
  transform: { type: 'spring' as const, damping: 20, stiffness: 120, mass: 1, delay: 300 },
};
const EASE_CTA_TRANSITION = {
  opacity: { type: 'timing' as const, duration: 400, delay: 600, easing: EASING },
  transform: { type: 'spring' as const, damping: 20, stiffness: 120, mass: 1, delay: 600 },
};

const getCtaStyle = ({ pressed }: { pressed: boolean }) => ({
  alignSelf: 'flex-start' as const,
  paddingVertical: 14,
  paddingHorizontal: 32,
  opacity: pressed ? 0.7 : 1,
});

export const PromiseScreen = () => {
  const hasPlayedEntrance = useRef(false);
  const setIntroSeen = useAppStore((s) => s.setIntroSeen);
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const scrollOffsetX = useSharedValue(0);

  useEffect(() => {
    if (!hasPlayedEntrance.current) {
      hasPlayedEntrance.current = true;
      playOnboardingEntrance();
    }
  }, []);

  const handlePress = () => {
    playGentlePresence();
    // Flips the root `(onboarding)` / `(auth)` guard — Stack.Protected swaps
    // the active group on its own, so no explicit navigation call is needed
    // (and none would be reliable: `(auth)` isn't mounted until this flips).
    posthog?.capture('onboarding_completed');
    setIntroSeen(true);
  };

  const rootStyle = { paddingBottom: insets.bottom };
  const marqueeStyle = { flex: 5, paddingTop: insets.top + 40 };

  return (
    <>
    <StatusBar hidden />
    <View
      className="flex-1 bg-background"
      style={rootStyle}
    >
      <DuskDriftBackdrop />

      {/* Marquee — top portion */}
      <View style={marqueeStyle}>
        <MoodMarquee moods={MOODS} scrollOffsetX={scrollOffsetX} />
      </View>

      {/* Promise content — bottom portion */}
      <View style={styles.contentArea}>
        <EaseView
          initialAnimate={EASE_INITIAL_SLIDE}
          animate={EASE_ANIMATE_SLIDE}
          transition={EASE_CONTENT_TRANSITION}
          style={styles.contentBlock}
        >
          <AppText
            className="text-foreground/90 text-[22px] leading-9"
            style={styles.fontMedium}
          >
            This is a space{'\n'}to be honest.
          </AppText>
          <AppText
            className="text-foreground/55 text-[15px] leading-7 mb-2"
            style={styles.fontLight}
          >
            What you share here is private.{'\n'}
            No one sees it. No one judges it.{'\n'}
            It&apos;s yours.
          </AppText>
        </EaseView>

        <EaseView
          initialAnimate={EASE_INITIAL_SLIDE}
          animate={EASE_ANIMATE_SLIDE}
          transition={EASE_CTA_TRANSITION}
          style={styles.ctaBlock}
        >
          <Pressable
            onPress={handlePress}
            className="border border-accent/30 rounded-full"
            style={getCtaStyle}
          >
            <AppText
              className="text-accent/80 text-[15px]"
              style={styles.letterSpacing}
            >
              I&apos;d like that
            </AppText>
          </Pressable>
        </EaseView>
      </View>
    </View>
    </>
  );
};

const styles = StyleSheet.create({
  contentArea: { flex: 4, justifyContent: 'space-between', paddingHorizontal: 32 },
  contentBlock: { gap: 20, paddingTop: 32 },
  ctaBlock: { paddingBottom: 24 },
  fontMedium: { fontFamily: 'Poppins-Medium' },
  fontLight: { fontWeight: '300' as const },
  letterSpacing: { letterSpacing: 0.5 },
});
