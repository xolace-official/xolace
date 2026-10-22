import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Button } from 'heroui-native';
import { AppText } from '@/src/components/shared/app-text';
import { playSoftPress } from '@/src/lib/haptics';
import { ParticleField } from './particles/particle-field';

const LINES = [
  'This is a space to say the unsaid.',
  'Your voice is never stored.',
  'It goes when you close.',
];

type Props = {
  onUnderstand: () => void;
};

/**
 * First-time intro: sparse, barely-visible particle drift behind three quiet
 * lines and a text-only "I understand" button. Shown once per device.
 */
export function VentIntro({ onUnderstand }: Props) {
  const handlePress = () => {
    playSoftPress();
    onUnderstand();
  };

  return (
    <View className="flex-1">
      <ParticleField stage="sparse" />
      <View className="flex-1 items-center justify-center px-10">
        <Animated.View entering={FadeIn.duration(900).delay(300)} className="gap-3">
          {LINES.map((line) => (
            <AppText
              key={line}
              className="text-center text-base leading-7 text-[#F5F0E8]/70"
            >
              {line}
            </AppText>
          ))}
        </Animated.View>
      </View>
      <Animated.View
        entering={FadeIn.duration(700).delay(1400)}
        className="items-center pb-24"
      >
        <Button
          variant="ghost"
          size="md"
          onPress={handlePress}
          accessibilityLabel="I understand"
        >
          <Button.Label className="text-base text-[#F5F0E8]/60">
            I understand
          </Button.Label>
        </Button>
      </Animated.View>
    </View>
  );
}
