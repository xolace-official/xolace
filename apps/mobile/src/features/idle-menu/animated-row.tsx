import React, { FC, PropsWithChildren } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const BASE_DELAY = 50;

type Props = {
  isOpen: SharedValue<boolean>;
  index: number;
  numberOfRows: number;
  containerHeight: SharedValue<number>;
};

export const AnimatedRow: FC<PropsWithChildren<Props>> = ({
  isOpen,
  children,
  index,
  numberOfRows,
  containerHeight,
}) => {
  const rStyle = useAnimatedStyle(() => {
    const open = isOpen.get();
    const enterDelay = index * BASE_DELAY;
    const exitDelay = numberOfRows * BASE_DELAY - index * BASE_DELAY * 1.5;
    const delay = open ? enterDelay : exitDelay;
    const h = containerHeight.get();
    const exitY = (h - (index * h) / numberOfRows) / 1.5;

    return {
      opacity: withDelay(delay, withTiming(open ? 1 : 0)),
      transform: [
        {
          translateY: withDelay(
            delay,
            withSpring(open ? 0 : exitY, {
              duration: 1500,
              dampingRatio: 0.75,
            }),
          ),
        },
        { scale: withDelay(delay, withTiming(open ? 1 : 0.75)) },
      ],
    };
  });

  const containerStyle = [rStyle, styles.container];

  return <Animated.View style={containerStyle}>{children}</Animated.View>;
};

const styles = StyleSheet.create({
  container: {
    transformOrigin: "right",
  },
});
