import { createContext, use, useCallback, useMemo, useState } from 'react';
import { View, Pressable, type LayoutChangeEvent, type GestureResponderEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type {
  SegmentedControlContextValue,
  SegmentedControlProps,
  SegmentedControlItemProps,
  SegmentedControlIndicatorProps,
  ItemMeasurements,
} from './types';
import { cn } from '@/src/lib/utils';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SegmentedControlContext = createContext<SegmentedControlContextValue>({
  value: '',
  onValueChange: () => {},
  measurements: {},
  setMeasurements: () => {},
});

/**
 * Compound segmented control: Root owns item measurements and selected value;
 * the Indicator animates to the measured geometry of the active item, so the
 * sliding pill tracks real layout instead of guessed widths.
 */
const SegmentedControlRoot = ({
  value,
  onValueChange,
  className,
  children,
  ...props
}: SegmentedControlProps) => {
  const [measurements, setMeasurementsState] = useState<Record<string, ItemMeasurements>>({});

  const setMeasurements = useCallback((key: string, next: ItemMeasurements) => {
    setMeasurementsState((prev) => ({ ...prev, [key]: next }));
  }, []);

  // Context values stay memoized even with the React Compiler on — it doesn't
  // stabilize across context boundaries, so every consumer would re-render.
  const contextValue = useMemo<SegmentedControlContextValue>(
    () => ({ value, onValueChange, measurements, setMeasurements }),
    [value, onValueChange, measurements, setMeasurements],
  );

  return (
    <SegmentedControlContext value={contextValue}>
      <View className={cn('flex-row', className)} {...props}>
        {children}
      </View>
    </SegmentedControlContext>
  );
};

const SegmentedControlItem = ({
  value,
  className,
  onPress,
  ...props
}: SegmentedControlItemProps) => {
  const { onValueChange, setMeasurements, value: activeValue } = use(SegmentedControlContext);
  const isActive = activeValue === value;

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height, x } = event.nativeEvent.layout;
      setMeasurements(value, { width, height, x });
    },
    [value, setMeasurements],
  );

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      onValueChange(value);
      // @ts-expect-error AnimatedProps widens the handler type
      onPress?.(event);
    },
    [value, onValueChange, onPress],
  );

  return (
    <AnimatedPressable
      className={className}
      onLayout={handleLayout}
      onPress={handlePress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      {...props}
    />
  );
};

const DEFAULT_INDICATOR_ANIMATION = { type: 'spring' } as const;

const SegmentedControlIndicator = ({
  className,
  style,
  animationConfig = DEFAULT_INDICATOR_ANIMATION,
  ...props
}: SegmentedControlIndicatorProps) => {
  const { value, measurements } = use(SegmentedControlContext);
  const activeMeasurements = measurements[value];
  // Skip the very first animation so the indicator doesn't fly in from 0.
  const hasMeasured = useSharedValue(false);
  const reanimatedConfig = animationConfig?.config;

  const animatedStyle = useAnimatedStyle(() => {
    if (!activeMeasurements) {
      return { width: 0, height: 0, left: 0, opacity: 0 };
    }
    if (!hasMeasured.get()) {
      hasMeasured.set(true);
      return {
        width: activeMeasurements.width,
        height: activeMeasurements.height,
        left: activeMeasurements.x,
        opacity: 1,
      };
    }
    const animate = (target: number) =>
      animationConfig?.type === 'timing'
        ? withTiming(target, reanimatedConfig)
        : withSpring(target, reanimatedConfig);
    return {
      width: animate(activeMeasurements.width),
      height: animate(activeMeasurements.height),
      left: animate(activeMeasurements.x),
      opacity: 1,
    };
  });

  return <Animated.View className={cn('absolute', className)} style={[animatedStyle, style]} {...props} />;
};

SegmentedControlRoot.displayName = 'SegmentedControl';
SegmentedControlItem.displayName = 'SegmentedControl.Item';
SegmentedControlIndicator.displayName = 'SegmentedControl.Indicator';

export const SegmentedControl = Object.assign(SegmentedControlRoot, {
  Item: SegmentedControlItem,
  Indicator: SegmentedControlIndicator,
});
