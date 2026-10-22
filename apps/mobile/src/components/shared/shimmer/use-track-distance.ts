import { useDerivedValue, type DerivedValue, type SharedValue } from 'react-native-reanimated';

type UseTrackDistanceParams = {
  containerWidth: SharedValue<number>;
  containerHeight: SharedValue<number>;
  trackAngle: number;
};

export const useTrackDistance = ({
  containerWidth,
  containerHeight,
  trackAngle,
}: UseTrackDistanceParams): DerivedValue<number> => {
  const angleRad = (trackAngle * Math.PI) / 180;

  return useDerivedValue(() => {
    const w = containerWidth.get();
    const h = containerHeight.get();
    if (w <= 0 || h <= 0) return 0;
    return w * Math.abs(Math.cos(angleRad)) + h * Math.abs(Math.sin(angleRad));
  });
};
