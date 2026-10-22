import type { PressableProps, ViewProps } from 'react-native';
import type { AnimatedProps, WithTimingConfig, WithSpringConfig } from 'react-native-reanimated';

export interface ItemMeasurements {
  width: number;
  height: number;
  x: number;
}

export interface SegmentedControlContextValue {
  value: string;
  onValueChange: (value: string) => void;
  measurements: Record<string, ItemMeasurements>;
  setMeasurements: (key: string, measurements: ItemMeasurements) => void;
}

export interface SegmentedControlProps extends ViewProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export interface SegmentedControlItemProps extends AnimatedProps<PressableProps> {
  value: string;
  className?: string;
}

export interface SegmentedControlIndicatorProps extends AnimatedProps<ViewProps> {
  className?: string;
  animationConfig?:
    | { type: 'timing'; config?: WithTimingConfig }
    | { type: 'spring'; config?: WithSpringConfig };
}
