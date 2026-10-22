import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  LinearTransition,
} from "react-native-reanimated";
import { AppText } from "@/src/components/shared/app-text";
import type { ComponentProps } from "react";

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 200,
  mass: 0.5,
};

type AppTextProps = ComponentProps<typeof AppText>;

type CharProps = {
  char: string;
  index: number;
} & AppTextProps;

function AnimatedChar({ char, index, ...textProps }: CharProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(6);

  useEffect(() => {
    const delay = index * 18;
    const timeout = setTimeout(() => {
      opacity.set(withSpring(1, SPRING_CONFIG));
      translateY.set(withSpring(0, SPRING_CONFIG));
    }, delay);
    return () => clearTimeout(timeout);
  }, [char, index, opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: translateY.get() }],
  }));

  return (
    <Animated.View style={style}>
      <AppText {...textProps}>{char}</AppText>
    </Animated.View>
  );
}

type AnimatedTextProps = {
  children: string;
} & AppTextProps;

export function AnimatedText({ children, ...textProps }: AnimatedTextProps) {
  const chars = children.split("");

  return (
    <Animated.View
      layout={LinearTransition.springify()
        .damping(15)
        .stiffness(200)
        .mass(0.5)}
      className="flex-row flex-wrap"
    >
      {chars.map((char, i) => {
        // eslint-disable-next-line react/no-array-index-key
        return <AnimatedChar {...textProps} key={`${char}-${i}`} char={char} index={i} />;
      })}
    </Animated.View>
  );
}
