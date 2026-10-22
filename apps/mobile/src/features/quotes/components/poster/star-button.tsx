import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { PressableFeedback } from "heroui-native";
import { SymbolView } from "expo-symbols";
import { useCSSVariable } from "uniwind";
import { Presets } from "react-native-pulsar";

const STAR_ICON = { ios: "star", android: "star_border" } as const;
const STAR_ON_ICON = { ios: "star.fill", android: "star" } as const;
const SPRING = { damping: 18, stiffness: 160, mass: 0.9 };

/**
 * Keep this quote. It owns the hero's top-right corner alone — save is not
 * resonate: it means "I want this back", and it is what fills the archive.
 *
 * Same plate circle as the back button opposite it, so the two corners read as
 * one row of chrome printed on the poster.
 */
export function StarButton({
  saved,
  onToggle,
  locked = false,
}: {
  saved: boolean;
  onToggle: (next: boolean) => void;
  /** Xolace+ gate (#317) — the tap opens the paywall instead of saving. */
  locked?: boolean;
}) {
  const ink = useCSSVariable("--color-poster-ink") as string;

  // the corner answers the tap itself, like the Resonate pill does
  const pop = useSharedValue(1);
  const isFirst = useSharedValue(true);
  useEffect(() => {
    if (isFirst.get()) {
      isFirst.set(false);
      return;
    }
    pop.set(
      withSequence(withTiming(1.14, { duration: 130 }), withSpring(1, SPRING)),
    );
  }, [saved, pop, isFirst]);
  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.get() }],
  }));

  return (
    <Animated.View style={popStyle}>
      <PressableFeedback
        onPress={() => {
          Presets.chirp();
          onToggle(!saved);
        }}
        accessibilityRole="button"
        accessibilityLabel={
          locked ? "Save quote; Xolace+" : saved ? "Remove from saved" : "Save quote"
        }
        accessibilityState={{ selected: saved }}
        hitSlop={12}
      >
        <View className="h-11 w-11 items-center justify-center rounded-full bg-poster-plate">
          <SymbolView
            name={saved ? STAR_ON_ICON : STAR_ICON}
            size={18}
            tintColor={ink}
          />
        </View>
      </PressableFeedback>
    </Animated.View>
  );
}
