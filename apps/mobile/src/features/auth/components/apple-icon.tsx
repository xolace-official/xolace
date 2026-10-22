import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

export const AppleIcon = ({ size = 20, color = '#000' }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.64-2.2.46-3.06-.4C3.79 16.16 4.36 9.52 8.77 9.28c1.25.07 2.12.72 2.88.77.92-.19 1.8-.86 2.79-.78 1.18.1 2.07.58 2.65 1.49-2.42 1.45-1.85 4.62.43 5.51-.51 1.34-1.17 2.66-2.47 4.01zM12.03 9.21C11.88 7.09 13.6 5.34 15.6 5.17c.29 2.41-2.19 4.21-3.57 4.04z"
      fill={color}
    />
  </Svg>
);
