import type React from "react";
import Svg, { Path } from "react-native-svg";
import { withUniwind } from "uniwind";
import type { IconProps } from "@/src/types";

/**
 * Chevron icons — React Native SVG implementations.
 * Wrapped with withUniwind to enable className-based styling.
 */
const chevron = (d: string) => {
	const Component: React.FC<IconProps> = ({
		size = 20,
		color = "currentColor",
	}) => (
		<Svg fill="none" height={size} viewBox="0 0 16 16" width={size}>
			<Path
				d={d}
				stroke={color}
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
			/>
		</Svg>
	);
	return withUniwind(Component, {
		color: {
			fromClassName: "colorClassName",
			styleProperty: "accentColor",
		},
	});
};

export const ChevronLeftIcon = chevron("M10 3L5 8L10 13");
export const ChevronRightIcon = chevron("M6 3L11 8L6 13");
