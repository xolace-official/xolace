import { StyleSheet, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useThemeColor } from 'heroui-native';
import { AppText } from '@/src/components/shared/app-text';
import { HoldToContinueButton } from '@/src/components/shared/hold-to-continue-button';

type Props = {
  heroImage: ImageSource;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onContinue: () => void;
};

const enter = (i: number) => FadeInDown.delay(250 + i * 90).duration(500);

/**
 * One-time welcome shared by every Browse surface (Music, Support audio,
 * Lantern): hero art dipping into the themed surface, title, subtitle, and a
 * hold-to-continue CTA. No surface-specific logic — copy, art, and the
 * completion callback are props.
 */
export function BrowseIntroScreen({ heroImage, title, subtitle, ctaLabel, onContinue }: Props) {
  const insets = useSafeAreaInsets();
  const background = useThemeColor('background') as string;
  return (
    <View className="flex-1 bg-background">
      <View className="absolute inset-x-0 top-0 h-[64%]">
        <Image source={heroImage} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
        {/* The surface rises at the edges, so the art dips into it at the centre. */}
        <View className="absolute inset-x-0 bottom-0 h-[12%]">
          <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <Path d="M0 0 Q50 200 100 0 L100 101 L0 101 Z" fill={background} />
          </Svg>
        </View>
      </View>

      <View className="flex-1 justify-end items-center gap-3 px-8" style={{ paddingBottom: insets.bottom + 16 }}>
        <Animated.View entering={enter(0)}>
          <AppText className="text-center text-3xl font-bold leading-9 text-foreground">{title}</AppText>
        </Animated.View>
        <Animated.View entering={enter(1)}>
          <AppText className="text-center text-[15px] leading-6 text-muted">{subtitle}</AppText>
        </Animated.View>
        <Animated.View entering={enter(2)} className="self-stretch pt-8">
          <HoldToContinueButton label={ctaLabel} onComplete={onContinue} className="self-stretch" />
        </Animated.View>
      </View>
    </View>
  );
}
