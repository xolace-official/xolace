import { useEffect, useRef } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Button, useThemeColor } from 'heroui-native';
import { useFullContext } from '@/src/lib/convex/use-full-context';
import { usePostHog } from 'posthog-react-native';

import { AppText } from '@/src/components/shared/app-text';
import { trackIntakeStarted } from '@/src/features/intake/analytics';
import { GateFade } from '@/src/features/profile/components/gate-fade';
import { IntakeBlank } from '@/src/features/intake/questionnaire/intake-screen';
import { FounderMarquee } from '@/src/features/intake/founder-message/founder-marquee';
import { LetterBody } from '@/src/features/intake/founder-message/letter-body';
import {
  FOUNDER_MESSAGE,
} from '@/src/features/intake/founder-message/letter-copy';

/**
 * The founder message — first screen of intake, and where a cold kill mid-intake
 * relaunches (no step cursor is kept). "Campfire Stack" (#236): a horizontal
 * marquee band of feeling-cards, the letter scrolling beneath it behind gradient
 * fades, a pinned solid CTA into the questionnaire. Commit-only — no skip.
 *
 * One message for everyone. Returning users get the same letter plus a callout,
 * keyed off sessionCount.
 *
 * Decision (#264 open question): the message is NOT re-readable later. It is a
 * once-per-account hand-off into the questions, not a document; a settings entry
 * would make it a keepsake it isn't written to be. Revisit if people ask for it.
 */
const BAND_HEIGHT = 220;
const FADE_HEIGHT = 44;

export default function IntakeIndex() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const background = useThemeColor('background') as string;

  // The root gate query (#263), not a narrow one: the root is already
  // subscribed to it and Convex dedupes, so reading `sessionCount` off it costs
  // nothing — whereas a second query is a second thing to be undefined.
  const context = useFullContext();

  // Funnel entry (T7, #267). Held until the count resolves — `session_count`
  // and `is_returning_user` are the funnel's two breakdowns, so firing early
  // with a guessed zero would mislabel every returning user. The latch is what
  // keeps a re-render from re-entering the funnel and restarting the clock.
  const posthog = usePostHog();
  const started = useRef(false);
  useEffect(() => {
    if (started.current || context === undefined) return;
    started.current = true;
    trackIntakeStarted(posthog, context.profile.sessionCount);
  }, [context, posthog]);

  // Never guess the audience: an unresolved count would silently render a
  // returning user the new-user letter. The root gate already blocks on this
  // query, so this is a belt-and-braces frame, not a visible flash.
  if (context === undefined) return <IntakeBlank />;

  const audience = context.profile.sessionCount > 0 ? 'existing' : 'new';

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View style={{ height: BAND_HEIGHT }}>
        <FounderMarquee viewport={width} />
      </View>

      <View className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-6 pt-7 pb-12 gap-5"
        >
          <AppText className="text-lg text-foreground font-[Poppins-Regular]">
            {FOUNDER_MESSAGE.greeting}
          </AppText>
          <LetterBody audience={audience} />
          <View className="mt-6 flex-row items-center gap-3">
            <Image
              source={require('@/assets/images/founder-images/Nathan-mini.jpeg')}
              style={{ width: 40, height: 40, borderRadius: 20 }}
              contentFit="cover"
              contentPosition="top"
            />
            <AppText className="text-[15px] text-foreground/70 font-[Poppins-Regular]">
              Nathaniel, your new friend
            </AppText>
          </View>
        </ScrollView>

        <View pointerEvents="none" className="absolute left-0 right-0 top-0">
          <GateFade width={width} height={FADE_HEIGHT} color={background} endAlpha="F2" flip />
        </View>
        <View pointerEvents="none" className="absolute bottom-0 left-0 right-0">
          <GateFade width={width} height={FADE_HEIGHT} color={background} endAlpha="F2" />
        </View>
      </View>

      <View className="px-6 pt-2">
        <Button variant="primary" onPress={() => router.push('/(intake)/questionnaire')}>
          {FOUNDER_MESSAGE.cta}
        </Button>
      </View>
    </View>
  );
}
