import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { playSoftPress } from "@/src/lib/haptics";

type Props = {
  size: "sm" | "md";
  isRecording: boolean;
  onPress: () => void;
};

const MIC_NAME = { ios: "mic", android: "mic", web: "mic" } as const;
const PRESS_ANIMATION = { scale: { ignoreScaleCoefficient: true, value: 0.9 } };

export const MicButton = ({ size, isRecording, onPress }: Props) => {
  const accentColor = useThemeColor("accent");
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(0);

  useEffect(() => {
    if (isRecording && !reduceMotion) {
      scale.set(withRepeat(
        withTiming(1.25, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ));
      bgOpacity.set(withRepeat(
        withTiming(0.15, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ));
    } else {
      cancelAnimation(scale);
      cancelAnimation(bgOpacity);
      scale.set(withTiming(1, { duration: 150 }));
      bgOpacity.set(withTiming(isRecording ? 0.12 : 0, { duration: 150 }));
    }
    return () => {
      cancelAnimation(scale);
      cancelAnimation(bgOpacity);
    };
  }, [isRecording, reduceMotion, scale, bgOpacity]);

  const iconSize = size === "md" ? 20 : 14;
  const containerSize = size === "md" ? 40 : 26;

  const containerStyle = useAnimatedStyle(() => ({
    width: containerSize,
    height: containerSize,
    borderRadius: containerSize / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    transform: [{ scale: scale.get() }],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    position: "absolute",
    width: containerSize,
    height: containerSize,
    borderRadius: containerSize / 2,
    backgroundColor: accentColor,
    opacity: bgOpacity.get(),
  }));

  const handlePress = () => {
    playSoftPress();
    onPress();
  };

  return (
    <PressableFeedback
      onPress={handlePress}
      hitSlop={10}
      animation={PRESS_ANIMATION}
      accessibilityRole="button"
      accessibilityLabel={
        isRecording ? "Stop voice input" : "Start voice input"
      }
    >
      {/* A bordered surface, not a bare glyph: the way out that isn't the card
          has to read as something you can press. */}
      <Animated.View
        style={containerStyle}
        className="border border-border bg-surface-secondary"
      >
        <Animated.View style={bgStyle} />
        <SymbolView name={MIC_NAME} size={iconSize} tintColor={accentColor} />
      </Animated.View>
    </PressableFeedback>
  );
};
