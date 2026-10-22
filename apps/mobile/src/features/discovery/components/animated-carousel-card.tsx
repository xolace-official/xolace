import { StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

type Props = {
  index: number;
  scrollX: SharedValue<number>;
  cardWidth: number;
  cardHeight: number;
  totalCards: number;
  cardBackground: string;
  shadowColor: string;
  children: React.ReactNode;
};

export function AnimatedCarouselCard({
  index,
  scrollX,
  cardWidth,
  cardHeight,
  totalCards,
  cardBackground,
  shadowColor,
  children,
}: Props) {
  const extendedInputRange = [
    (index - 2) * cardWidth,
    (index - 1) * cardWidth,
    index * cardWidth,
    (index + 1) * cardWidth,
    (index + 2) * cardWidth,
  ];

  const animatedStyle = useAnimatedStyle(() => {
    // Softened from the original demo's [0.7,0.8,1,1.5,1.5] / translateY -100 —
    // this lives in a compact home-screen widget, not a full-bleed showcase, so
    // the "exiting" card shouldn't grow past the card above it or fly up into
    // the section title.
    const scale = interpolate(
      scrollX.get(),
      extendedInputRange,
      [0.85, 0.92, 1, 1.15, 1.15],
      Extrapolation.CLAMP,
    );

    const translateY = interpolate(
      scrollX.get(),
      extendedInputRange,
      [40, 20, 0, -50, -50],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      scrollX.get(),
      extendedInputRange,
      [0.2, 0.8, 1, 0, 0],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  });

  const rRotateStyle = useAnimatedStyle(() => {
    const rotateX = interpolate(
      scrollX.get(),
      extendedInputRange,
      [25, 12, 0, 0, 0],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ perspective: 600 }, { rotateX: `${Math.floor(rotateX)}deg` }],
    };
  });

  return (
    <Animated.View
      collapsable={false}
      style={[
        styles.cardContainer,
        {
          width: cardWidth,
          height: cardHeight,
          zIndex: totalCards * 1000 - index,
        },
        animatedStyle,
      ]}
    >
      <Animated.View style={[styles.flexFull, rRotateStyle]}>
        <View
          style={[
            styles.cardShadow,
            { backgroundColor: cardBackground, boxShadow: `0 0 5px 0 ${shadowColor}` },
          ]}
          collapsable={false}
        >
          {children}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    position: "absolute",
    pointerEvents: "none",
  },
  flexFull: {
    flex: 1,
  },
  cardShadow: {
    borderCurve: "continuous",
    borderRadius: 25,
    flex: 1,
    overflow: "hidden",
  },
});
