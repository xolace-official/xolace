import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { EaseView } from "react-native-ease/uniwind";
import { Presets } from "react-native-pulsar";
import { useThemeColor } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { PillButton } from "@/src/components/shared/pill-button";

type ParticleConfig = {
  x: number;
  size: number;
  duration: number;
  delay: number;
  rise: number;
  driftX: number;
};

type EmberParticleProps = {
  config: ParticleConfig;
  color: string;
};

type Props = {
  onDone: () => void;
};

const PARTICLES: ParticleConfig[] = [
  { x: -24, size: 5, duration: 2200, delay: 0,    rise: 130, driftX: -10 },
  { x:   8, size: 8, duration: 2800, delay: 300,  rise: 160, driftX:   6 },
  { x:  -6, size: 5, duration: 2000, delay: 600,  rise: 120, driftX: -14 },
  { x:  28, size: 7, duration: 2600, delay: 900,  rise: 150, driftX:   9 },
  { x: -32, size: 6, duration: 3000, delay: 1200, rise: 140, driftX:  -6 },
  { x:  16, size: 9, duration: 2400, delay: 1500, rise: 170, driftX:  12 },
  { x: -14, size: 5, duration: 2700, delay: 1800, rise: 125, driftX: -16 },
];

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const FADE_IN = { opacity: 1 };
const INITIAL_FADE = { opacity: 0 };
const MESSAGE_TRANSITION = {
  type: "timing",
  duration: 600,
  delay: 400,
  easing: EASE,
} as const;
const BUTTON_TRANSITION = {
  type: "timing",
  duration: 400,
  delay: 1000,
  easing: EASE,
} as const;

const styles = StyleSheet.create({
  emberContainer: { width: 160, height: 160, marginBottom: 40 },
  glowSource: { width: 80, height: 80, left: 40, bottom: -20 },
});

const EmberParticle = ({ config, color }: EmberParticleProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withDelay(
      config.delay,
      withRepeat(
        withTiming(1, { duration: config.duration, easing: Easing.linear }),
        -1,
        false,
      ),
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.get(), [0, 1], [0, -config.rise]) },
      { translateX: interpolate(progress.get(), [0, 1], [0, config.driftX]) },
    ],
    opacity: interpolate(progress.get(), [0, 0.12, 0.55, 1], [0, 0.6, 0.35, 0]),
  }));

  const baseStyle = {
    position: "absolute" as const,
    width: config.size,
    height: config.size,
    borderRadius: config.size / 2,
    backgroundColor: color,
    left: 80 + config.x - config.size / 2,
    bottom: 10,
  };

  return <Animated.View style={[baseStyle, animatedStyle]} />;
};

export const ContributedConfirmation = ({ onDone }: Props) => {
  const accentColor = useThemeColor("accent") as string;

  useEffect(() => {
    Presets.dewdrop();
  }, []);

  return (
    <View className="flex-1 items-center justify-center px-8 pb-20">
      {/* Ember particle field */}
      <View style={styles.emberContainer}>
        {/* Soft glow source at base */}
        <View
          className="absolute rounded-full bg-accent/8"
          style={styles.glowSource}
        />
        {PARTICLES.map((config) => (
          <EmberParticle key={config.x} config={config} color={accentColor} />
        ))}
      </View>

      <EaseView
        initialAnimate={INITIAL_FADE}
        animate={FADE_IN}
        transition={MESSAGE_TRANSITION}
      >
        <AppText className="text-center font-serif text-lg leading-8 text-foreground">
          Someone out there{"\n"}will feel less alone{"\n"}because of what
          {"\n"}you shared.
        </AppText>
      </EaseView>

      <EaseView
        initialAnimate={INITIAL_FADE}
        animate={FADE_IN}
        transition={BUTTON_TRANSITION}
        className="mt-10"
      >
        <PillButton label="Done" onPress={onDone} />
      </EaseView>
    </View>
  );
};
