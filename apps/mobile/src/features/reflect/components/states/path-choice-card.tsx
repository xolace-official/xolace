import { View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { EaseView } from 'react-native-ease/uniwind';
import { PressableFeedback } from 'heroui-native';
import { AppText } from '@/src/components/shared/app-text';
import { Icon } from '@/src/features/follow-up/stack-cards';
import { useEffectiveReducedMotion } from '@/src/lib/motion/use-effective-reduced-motion';
import { cn } from '@/src/lib/utils';

// Overrides heroui's `.pressable-feedback__root { overflow: hidden }`; a
// className doesn't reliably beat the component class, a style does.
const OPEN = { overflow: 'visible' as const };
// Well under the map Flux above the stack, so that one stays the hero.
const PEEK = 84;
const PEEK_STYLE = { position: 'absolute' as const, right: 24, width: PEEK, height: PEEK };
const SETTLED = { opacity: 1, translateY: 0 };
/** Strong ease-out: an entrance nobody's finger started, so no overshoot. */
export const RISE_EASING: [number, number, number, number] = [0.23, 1, 0.32, 1];
export const riseFrom = (reduced: boolean) => ({ opacity: 0, translateY: reduced ? 0 : 48 });
export const riseTransition = (index: number, reduced: boolean) => ({
  type: 'timing' as const,
  duration: reduced ? 200 : 380,
  easing: RISE_EASING,
  delay: reduced ? 0 : 120 + index * 70,
});

type Props = {
  index: number;
  last: boolean;
  title: string;
  sub: string;
  image: ImageSource;
  tint: string;
  onPress: () => void;
};

/**
 * One layer of the path stack. Same tinted, top-rounded shape as the follow-up
 * check-in's OptionCard (slides under the next one: -mb-8 over pb-14), but its
 * Flux climbs out over the top edge and sits on the card above. The last one
 * sits lower — at full height it touches the pair on the card above.
 */
export function PathChoiceCard({ index, last, title, sub, image, tint, onPress }: Props) {
  const reduced = useEffectiveReducedMotion();
  return (
    <EaseView
      initialAnimate={riseFrom(reduced)}
      animate={SETTLED}
      transition={riseTransition(index, reduced)}
      className="-mb-8"
    >
      {/* Flux rides inside the pressable so the press scale takes him with the
          card. The rounded clip lives on the inner View, so he can climb out. */}
      <PressableFeedback
        style={OPEN}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${sub}`}
      >
        <View className="overflow-hidden rounded-t-[40px] bg-surface">
          <View className={cn('px-6 pb-14 pt-6', tint)}>
            <AppText className="w-3/5 font-medium text-2xl leading-8 text-foreground">{title}</AppText>
            <View className="mt-1 flex-row items-center gap-2">
              <AppText className="text-sm text-foreground/55">{sub}</AppText>
              <Icon name="arrow" size={12} />
            </View>
          </View>
        </View>
        <Image
          source={image}
          contentFit="contain"
          pointerEvents="none"
          style={[PEEK_STYLE, { top: last ? -20 : -32 }]}
        />
      </PressableFeedback>
    </EaseView>
  );
}
