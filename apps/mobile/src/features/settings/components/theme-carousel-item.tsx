import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

// Distance (px) from a card's centered position before its scale/opacity
// falloff is fully maxed out — roughly one neighboring card away.
const FALLOFF_RANGE = 178;

type Props = {
  scrollX: SharedValue<number>;
  center: number;
  viewportWidth: number;
  reducedMotion: boolean;
  children: React.ReactNode;
};

/** Scroll-driven scale/opacity falloff for a single carousel card — the
 *  centered card grows and its neighbors recede, distance-based off the
 *  card's fixed center offset so it holds up regardless of the divider's
 *  irregular width breaking a uniform per-index interpolation range. */
export const ThemeCarouselItem = ({
  scrollX,
  center,
  viewportWidth,
  reducedMotion,
  children,
}: Props) => {
  const animatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { transform: [{ scale: 1 }], opacity: 1 };
    }
    const distance = scrollX.get() + viewportWidth / 2 - center;
    const scale = interpolate(
      distance,
      [-FALLOFF_RANGE, 0, FALLOFF_RANGE],
      [0.86, 1.1, 0.86],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      distance,
      [-FALLOFF_RANGE, 0, FALLOFF_RANGE],
      [0.55, 1, 0.55],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale }], opacity };
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};
