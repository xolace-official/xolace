import type React from "react";
import Svg, { Path } from "react-native-svg";
import { withUniwind } from "uniwind";
import type { IconProps } from "@/types";

/**
 * Check icon — React Native SVG implementation.
 * Wrapped with withUniwind to enable className-based styling.
 */
const CheckIconComponent: React.FC<IconProps> = ({
	size = 20,
	color = "currentColor",
}) => (
	<Svg fill="none" height={size} viewBox="0 0 16 16" width={size}>
		<Path
			d="M13.5 4.5L6.5 11.5L2.5 7.5"
			stroke={color}
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={2}
		/>
	</Svg>
);

export const CheckIcon = withUniwind(CheckIconComponent, {
	color: {
		fromClassName: "colorClassName",
		styleProperty: "accentColor",
	},
});
