import { View } from 'react-native';
import { Image } from 'expo-image';
import { EaseView } from 'react-native-ease/uniwind';
import { PressableFeedback, useThemeColor } from 'heroui-native';
import { AppText } from '@/src/components/shared/app-text';
import { PlusValue } from '@/src/features/purchases/components/plus-offer-card';
import { PLUS_OFFER_DECLINE_LABEL } from '@/src/features/purchases/plus-offer-copy';
import type { PlusOfferMoment, PlusOfferVariant } from '@/src/features/purchases/plus-offer-policy';
import { usePlusOfferPresence } from '@/src/features/purchases/use-plus-offer-presence';
import { riseFrom, riseTransition } from '@/src/features/reflect/components/states/path-choice-card';
import { useEffectiveReducedMotion } from '@/src/lib/motion/use-effective-reduced-motion';

const MASCOT = require('@/assets/images/flux/plus-mascot.png');
const MASCOT_STYLE = {
  position: 'absolute' as const,
  right: 16,
  top: -44,
  width: 96,
  height: 96,
};
const SETTLED = { opacity: 1, translateY: 0 };

type Props = {
  moment: PlusOfferMoment;
  variant?: PlusOfferVariant;
  sessionId?: string | null;
  onOpen: () => void;
  onDismiss: () => void;
};

/**
 * Moment 2 as the top layer of the path stack: the same top-rounded shape as a
 * PathChoiceCard, at night, with the telescope Flux climbing out over its edge.
 * It is an option among the paths, not a sheet over them — the three paths stay
 * one tap away the whole time. Not pressable as a whole: only the CTA opens the
 * paywall, so a tap meant for the card below can't land on a sell.
 */
export function PathOfferLayer({ moment, variant, sessionId, onOpen, onDismiss }: Props) {
  const accentColor = useThemeColor('accent') as string;
  const reduced = useEffectiveReducedMotion();
  const { copy, declined, open, dismiss } = usePlusOfferPresence({
    moment,
    variant,
    sessionId,
    onOpen,
    onDismiss,
  });

  if (declined) return null;

  return (
    <EaseView
      initialAnimate={riseFrom(reduced)}
      animate={SETTLED}
      transition={riseTransition(0, reduced)}
      className="-mb-8"
    >
      <View className="overflow-hidden rounded-t-[40px] bg-plus-night px-6 pb-14 pt-6">
        {copy.lead ? (
          <AppText className="w-3/4 font-serif text-2xl leading-8 text-white">{copy.lead}</AppText>
        ) : null}
        <View className="mt-1 w-4/5">
          <PlusValue text={copy.value} accent={accentColor} />
        </View>
        <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-2">
          <PressableFeedback
            onPress={open}
            accessibilityRole="button"
            accessibilityLabel={copy.cta}
            className="rounded-full px-4 py-2.5"
            style={{ backgroundColor: accentColor }}
          >
            <AppText className="text-[13px] font-semibold text-background">{copy.cta}</AppText>
          </PressableFeedback>
          <PressableFeedback
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel={PLUS_OFFER_DECLINE_LABEL}
            hitSlop={8}
          >
            <AppText className="text-[13px] text-white/55">{PLUS_OFFER_DECLINE_LABEL}</AppText>
          </PressableFeedback>
        </View>
      </View>
      <Image source={MASCOT} contentFit="contain" pointerEvents="none" style={MASCOT_STYLE} />
    </EaseView>
  );
}
