import { View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { AppText } from "@/src/components/shared/app-text";
import {
  COUNTDOWN_FROM_MS,
  type PlusDictationView,
} from "@/src/features/reflect/hooks/use-plus-dictation";

const BAR_COUNT = 24;
const BAR_MAX = 28;
const BAR_MIN = 3;
// Each bar's share of the level: a bell across the strip with a little
// unevenness, so it reads as a voice rather than a level meter.
const BAR_WEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const bell = Math.sin((Math.PI * (i + 0.5)) / BAR_COUNT);
  return bell * (0.65 + 0.35 * Math.abs(Math.sin(i * 1.7)));
});

const WaveBar = ({ metering, weight }: { metering: SharedValue<number>; weight: number }) => {
  const style = useAnimatedStyle(() => {
    // The recorder normalises -160..0 dB to 0..1, so room tone already sits
    // around 0.7 — speech lives in the top of the range.
    // ponytail: fixed floor; calibrate per device if quiet voices look flat.
    const level = Math.min(1, Math.max(0, (metering.get() - 0.7) / 0.25));
    return {
      height: withTiming(BAR_MIN + (BAR_MAX - BAR_MIN) * level * weight, { duration: 90 }),
    };
  });
  return <Animated.View style={style} className="w-[3px] rounded-full bg-accent" />;
};

const formatRemaining = (ms: number) => `0:${String(Math.ceil(ms / 1000)).padStart(2, "0")}`;

/** A Plus dictation take in the composer: listening, then writing it down. */
export const DictationStrip = ({ phase, metering, remainingMs }: PlusDictationView) => {
  if (phase === "idle") return null;

  if (phase === "writing") {
    return (
      <Animated.View entering={FadeIn} exiting={FadeOut} className="h-10 items-center justify-center">
        <AppText className="text-sm text-muted" accessibilityLiveRegion="polite">
          Writing it down…
        </AppText>
      </Animated.View>
    );
  }

  const counting = remainingMs <= COUNTDOWN_FROM_MS;
  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      className="h-10 flex-row items-center justify-center gap-3"
      accessibilityLabel="Listening"
    >
      <View className="flex-row items-center gap-[3px]">
        {BAR_WEIGHTS.map((weight, i) => (
          <WaveBar key={i} metering={metering} weight={weight} />
        ))}
      </View>
      {counting && (
        <AppText className="text-xs tabular-nums text-muted">{formatRemaining(remainingMs)}</AppText>
      )}
    </Animated.View>
  );
};
