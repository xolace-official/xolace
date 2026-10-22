import { createContext, useCallback, useMemo, useState, use } from "react";
import { Pressable, View, type LayoutChangeEvent, type PressableProps, type ViewProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type AnimatedProps,
  type WithTimingConfig,
} from "react-native-reanimated";
import type { WithSpringConfig } from "react-native-reanimated/lib/typescript/animation/spring";
import { cn } from "@/src/lib/utils";

type ItemMeasurements = { width: number; height: number; x: number };

type ContextValue = {
  value: string;
  onValueChange: (value: string) => void;
  measurements: Record<string, ItemMeasurements>;
  setMeasurements: (key: string, measurements: ItemMeasurements) => void;
};

const SegmentedControlContext = createContext<ContextValue>({
  value: "",
  onValueChange: () => {},
  measurements: {},
  setMeasurements: () => {},
});

type RootProps = ViewProps & {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
};

function SegmentedControlRoot({ value, onValueChange, className, children, ...props }: RootProps) {
  const [measurements, setMeasurementsState] = useState<Record<string, ItemMeasurements>>({});

  const setMeasurements = useCallback((key: string, next: ItemMeasurements) => {
    setMeasurementsState((prev) => ({ ...prev, [key]: next }));
  }, []);

  const contextValue = useMemo(
    () => ({ value, onValueChange, measurements, setMeasurements }),
    [value, onValueChange, measurements, setMeasurements],
  );

  return (
    <SegmentedControlContext value={contextValue}>
      <View className={cn("flex-row", className)} {...props}>
        {children}
      </View>
    </SegmentedControlContext>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ItemProps = AnimatedProps<PressableProps> & { value: string; className?: string };

function SegmentedControlItem({ value, className, onPress, ...props }: ItemProps) {
  const { onValueChange, setMeasurements, value: activeValue } = use(SegmentedControlContext);
  const isActive = activeValue === value;

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height, x } = event.nativeEvent.layout;
      setMeasurements(value, { width, height, x });
    },
    [value, setMeasurements],
  );

  const handlePress: PressableProps["onPress"] = useCallback(
    (event) => {
      onValueChange(value);
      // AnimatedProps<PressableProps>["onPress"] also allows a SharedValue,
      // but callers only ever pass a plain function here.
      (onPress as PressableProps["onPress"])?.(event);
    },
    [value, onValueChange, onPress],
  );

  return (
    <AnimatedPressable
      className={className}
      onLayout={handleLayout}
      onPress={handlePress}
      accessibilityRole="radio"
      accessibilityState={{ selected: isActive }}
      {...props}
    />
  );
}

type IndicatorProps = AnimatedProps<ViewProps> & {
  className?: string;
  animationConfig?:
    | { type: "timing"; config?: WithTimingConfig }
    | { type: "spring"; config?: WithSpringConfig };
};

const DEFAULT_ANIMATION_CONFIG: IndicatorProps["animationConfig"] = { type: "spring" };

function SegmentedControlIndicator({
  className,
  style,
  animationConfig = DEFAULT_ANIMATION_CONFIG,
  ...props
}: IndicatorProps) {
  const { value, measurements } = use(SegmentedControlContext);
  const activeMeasurements = measurements[value];
  const hasMeasured = useSharedValue(false);
  const reanimatedConfig = animationConfig?.config;

  const animatedStyle = useAnimatedStyle(() => {
    if (!activeMeasurements) {
      return { width: 0, height: 0, left: 0, opacity: 0 };
    }

    if (!hasMeasured.value) {
      hasMeasured.set(true);
      return {
        width: activeMeasurements.width,
        height: activeMeasurements.height,
        left: activeMeasurements.x,
        opacity: 1,
      };
    }

    return {
      width:
        animationConfig?.type === "timing"
          ? withTiming(activeMeasurements.width, reanimatedConfig as WithTimingConfig)
          : withSpring(activeMeasurements.width, reanimatedConfig as WithSpringConfig),
      height:
        animationConfig?.type === "timing"
          ? withTiming(activeMeasurements.height, reanimatedConfig as WithTimingConfig)
          : withSpring(activeMeasurements.height, reanimatedConfig as WithSpringConfig),
      left:
        animationConfig?.type === "timing"
          ? withTiming(activeMeasurements.x, reanimatedConfig as WithTimingConfig)
          : withSpring(activeMeasurements.x, reanimatedConfig as WithSpringConfig),
      opacity: 1,
    };
  });

  return <Animated.View className={cn("absolute", className)} style={[animatedStyle, style]} {...props} />;
}

SegmentedControlRoot.displayName = "SegmentedControl";
SegmentedControlItem.displayName = "SegmentedControl.Item";
SegmentedControlIndicator.displayName = "SegmentedControl.Indicator";

export const SegmentedControl = Object.assign(SegmentedControlRoot, {
  Item: SegmentedControlItem,
  Indicator: SegmentedControlIndicator,
});
