/** Common props for icon components. */
export interface IconProps {
	/** Fill color. Defaults to "currentColor". */
	color?: string;
	/** Color class name, mapped to `color` via withUniwind. */
	colorClassName?: string;
	/** Size in pixels. Defaults to 20. */
	size?: number;
}
