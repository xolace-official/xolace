import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { withUniwind } from 'uniwind';
import type { IconProps } from '@/src/types';

/**
 * Check icon — React Native SVG implementation.
 * Wrapped with withUniwind to enable className-based styling.
 */
const CheckIconComponent: React.FC<IconProps> = ({
  size = 20,
  color = 'currentColor',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M13.5 4.5L6.5 11.5L2.5 7.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const CheckIcon = withUniwind(CheckIconComponent, {
  color: {
    fromClassName: 'colorClassName',
    styleProperty: 'accentColor',
  },
});
