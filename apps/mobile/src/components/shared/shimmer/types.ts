import type React from 'react';
import type { ViewProps } from 'react-native';
import type {
  SharedValue,
  DerivedValue,
  WithTimingConfig,
  WithSpringConfig,
} from 'react-native-reanimated';

export interface ShimmerContextValue {
  containerWidth: SharedValue<number>;
  containerHeight: SharedValue<number>;
  containerDiagonal: DerivedValue<number>;
  debug: boolean;
}

export interface ShimmerProps extends ViewProps {
  debug?: boolean;
  children: React.ReactNode;
}

interface ShimmerAnimationConfigBase {
  numberOfReps?: number;
  reverse?: boolean;
}

export type ShimmerAnimationConfig =
  | (ShimmerAnimationConfigBase & { type: 'timing'; config?: WithTimingConfig })
  | (ShimmerAnimationConfigBase & { type: 'spring'; config?: WithSpringConfig });

export type ShimmerOverlayWidth = number | `${number}%`;

export interface ShimmerOverlayProps {
  children: React.ReactNode;
  width: ShimmerOverlayWidth;
  trackAngle?: number;
  overlayAngle?: number;
  duration?: number;
  initialDelay?: number;
  repeatDelay?: number;
  animation?: ShimmerAnimationConfig;
  progress?: SharedValue<number>;
  onProgress?: SharedValue<number>;
}

export interface ShimmerMaskProps {
  children: React.ReactElement;
  overlay: React.ReactElement;
  background?: React.ReactNode;
}

export interface UseShimmerAnimationConfig
  extends
    Pick<ShimmerContextValue, 'containerWidth' | 'containerHeight'>,
    Required<Pick<ShimmerOverlayProps, 'trackAngle' | 'overlayAngle'>>,
    Pick<ShimmerOverlayProps, 'duration' | 'initialDelay' | 'repeatDelay' | 'animation'> {
  overlayWidth: DerivedValue<number>;
  trackDistance: DerivedValue<number>;
  progress: SharedValue<number>;
  autoPlay?: boolean;
}
