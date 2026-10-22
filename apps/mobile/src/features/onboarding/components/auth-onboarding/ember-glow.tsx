/**
 * A soft radial ember, drawn with `react-native-svg`.
 *
 */
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

export const EmberGlow = ({
  id,
  size,
  color,
  opacity = 0.5,
}: {
  id: string;
  size: number;
  color: string;
  /** Alpha at the very centre. Falls to zero at the edge. */
  opacity?: number;
}) => (
  <Svg width={size} height={size} pointerEvents="none">
    <Defs>
      {/* Three stops, not two: a straight centre-to-edge ramp reads as a hard
          disc with a fringe. The mid stop pulls the falloff in so the light has
          a small hot core and a long tail, which is how a real one behaves. */}
      <RadialGradient id={id} cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor={color} stopOpacity={opacity} />
        <Stop offset="0.42" stopColor={color} stopOpacity={opacity * 0.4} />
        <Stop offset="1" stopColor={color} stopOpacity={0} />
      </RadialGradient>
    </Defs>
    <Rect width={size} height={size} fill={`url(#${id})`} />
  </Svg>
);
